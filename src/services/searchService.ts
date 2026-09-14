import { db } from '../db/client';
import { logger } from './logger';

export type SearchEntityType = 'task' | 'inbox' | 'subject' | 'topic' | 'journal' | 'vault';

export interface SearchResult {
  entity_type: SearchEntityType;
  entity_id: string;
  title: string;
  content: string;
  tags?: string;
  score?: number;
  route: string;
}

export interface SearchFilters {
  entity_types?: SearchEntityType[];
  limit?: number;
}

export interface GroupedSearchResults {
  all: SearchResult[];
  grouped: Record<SearchEntityType, SearchResult[]>;
  total: number;
}

const ROUTE_MAP: Record<SearchEntityType, string> = {
  task: 'tasks',
  inbox: 'inbox',
  subject: 'academic',
  topic: 'academic',
  journal: 'journal',
  vault: 'journal',
};

class SearchService {
  /**
   * High-performance FTS5 query supporting Persian and English terms,
   * returning ranked search results grouped by entity_type.
   * Strictly excludes soft-deleted (is_deleted = 1) records.
   */
  public async globalSearch(
    query: string,
    filters?: SearchFilters
  ): Promise<GroupedSearchResults> {
    const emptyResult: GroupedSearchResults = {
      all: [],
      grouped: {
        task: [],
        inbox: [],
        subject: [],
        topic: [],
        journal: [],
        vault: [],
      },
      total: 0,
    };

    if (!query || !query.trim()) {
      return emptyResult;
    }

    const trimmedQuery = query.trim();
    const limit = filters?.limit ?? 50;

    let rawResults: { entity_type: string; entity_id: string; title: string; content: string; tags: string; rank?: number }[] = [];

    try {
      // Clean query for FTS5 MATCH parameter
      // Format as wildcard prefix search for each token if clean
      const cleanTerms = trimmedQuery
        .replace(/['"*]/g, ' ')
        .split(/\s+/)
        .filter((t) => t.length > 0);

      const ftsQuery = cleanTerms.map((t) => `${t}*`).join(' ');

      if (ftsQuery) {
        rawResults = await db.query<any>(
          `SELECT entity_type, entity_id, title, content, tags, rank
           FROM global_search_fts
           WHERE global_search_fts MATCH ?
           ORDER BY rank ASC
           LIMIT ?`,
          [ftsQuery, limit * 2]
        );
      }
    } catch (err) {
      logger.warn(`FTS5 MATCH query failed, falling back to LIKE search: ${err}`, 'SearchService');
    }

    // Fallback if FTS search returned no results or failed
    if (!rawResults || rawResults.length === 0) {
      try {
        const likeParam = `%${trimmedQuery}%`;
        rawResults = await db.query<any>(
          `SELECT entity_type, entity_id, title, content, tags
           FROM global_search_fts
           WHERE title LIKE ? OR content LIKE ? OR tags LIKE ?
           LIMIT ?`,
          [likeParam, likeParam, likeParam, limit * 2]
        );
      } catch (err) {
        logger.error(`Search failed: ${err}`, 'SearchService');
        return emptyResult;
      }
    }

    if (!rawResults || rawResults.length === 0) {
      return emptyResult;
    }

    // Fetch set of soft-deleted record IDs across domain tables to strictly enforce non-deleted constraint
    const deletedMap = await this.fetchDeletedIdsMap();

    const allowedTypes = filters?.entity_types && filters.entity_types.length > 0
      ? new Set(filters.entity_types)
      : null;

    const filteredResults: SearchResult[] = [];

    for (const row of rawResults) {
      const type = row.entity_type as SearchEntityType;
      if (allowedTypes && !allowedTypes.has(type)) {
        continue;
      }

      // Check soft-delete exclusion
      const deletedSetForType = deletedMap.get(type);
      if (deletedSetForType && deletedSetForType.has(row.entity_id)) {
        continue;
      }

      filteredResults.push({
        entity_type: type,
        entity_id: row.entity_id,
        title: row.title || '',
        content: row.content || '',
        tags: row.tags || '',
        score: row.rank !== undefined ? -Number(row.rank) : 1,
        route: ROUTE_MAP[type] || 'dashboard',
      });

      if (filteredResults.length >= limit) {
        break;
      }
    }

    // Grouping
    const grouped: Record<SearchEntityType, SearchResult[]> = {
      task: [],
      inbox: [],
      subject: [],
      topic: [],
      journal: [],
      vault: [],
    };

    for (const res of filteredResults) {
      if (grouped[res.entity_type]) {
        grouped[res.entity_type].push(res);
      }
    }

    return {
      all: filteredResults,
      grouped,
      total: filteredResults.length,
    };
  }

  /**
   * Returns a map of entity_type -> Set<deleted_entity_id>
   * to strictly exclude soft-deleted records from search results.
   */
  private async fetchDeletedIdsMap(): Promise<Map<SearchEntityType, Set<string>>> {
    const map = new Map<SearchEntityType, Set<string>>();
    const tableMapping: { type: SearchEntityType; table: string }[] = [
      { type: 'task', table: 'tasks' },
      { type: 'inbox', table: 'inbox_captures' },
      { type: 'subject', table: 'subjects' },
      { type: 'topic', table: 'topics' },
      { type: 'journal', table: 'journals' },
      { type: 'vault', table: 'memories' },
    ];

    for (const item of tableMapping) {
      try {
        const rows = await db.query<{ id: string }>(
          `SELECT id FROM ${item.table} WHERE is_deleted = 1`
        );
        const set = new Set(rows.map((r) => r.id));
        map.set(item.type, set);
      } catch {
        map.set(item.type, new Set());
      }
    }

    return map;
  }

  /**
   * Utility to clear and re-populate the FTS5 index from primary domain tables.
   */
  public async rebuildSearchIndex(): Promise<void> {
    logger.info('Rebuilding FTS5 global search index...', 'SearchService');
    await db.execute('DELETE FROM global_search_fts');

    // 1. Tasks
    const tasks = await db.query<{ id: string; title: string; description: string | null; priority: string }>(
      'SELECT id, title, description, priority FROM tasks WHERE is_deleted = 0'
    );
    for (const t of tasks) {
      await db.execute(
        'INSERT INTO global_search_fts (entity_type, entity_id, title, content, tags) VALUES (?, ?, ?, ?, ?)',
        ['task', t.id, t.title || '', t.description || '', t.priority || '']
      );
    }

    // 2. Inbox Captures
    const inboxes = await db.query<{ id: string; raw_content: string; source: string }>(
      'SELECT id, raw_content, source FROM inbox_captures WHERE is_deleted = 0'
    );
    for (const i of inboxes) {
      await db.execute(
        'INSERT INTO global_search_fts (entity_type, entity_id, title, content, tags) VALUES (?, ?, ?, ?, ?)',
        ['inbox', i.id, i.raw_content || '', i.raw_content || '', i.source || '']
      );
    }

    // 3. Subjects
    const subjects = await db.query<{ id: string; name: string; code: string | null; instructor: string | null }>(
      'SELECT id, name, code, instructor FROM subjects WHERE is_deleted = 0'
    );
    for (const s of subjects) {
      await db.execute(
        'INSERT INTO global_search_fts (entity_type, entity_id, title, content, tags) VALUES (?, ?, ?, ?, ?)',
        ['subject', s.id, s.name || '', `${s.code || ''} ${s.instructor || ''}`.trim(), s.code || '']
      );
    }

    // 4. Topics
    const topics = await db.query<{ id: string; title: string; importance_level: string }>(
      'SELECT id, title, importance_level FROM topics WHERE is_deleted = 0'
    );
    for (const top of topics) {
      await db.execute(
        'INSERT INTO global_search_fts (entity_type, entity_id, title, content, tags) VALUES (?, ?, ?, ?, ?)',
        ['topic', top.id, top.title || '', top.importance_level || '', top.importance_level || '']
      );
    }

    // 5. Journals
    const journals = await db.query<{ id: string; title: string | null; entry_date: string; content: string; tags: string | null }>(
      'SELECT id, title, entry_date, content, tags FROM journals WHERE is_deleted = 0'
    );
    for (const j of journals) {
      await db.execute(
        'INSERT INTO global_search_fts (entity_type, entity_id, title, content, tags) VALUES (?, ?, ?, ?, ?)',
        ['journal', j.id, j.title || j.entry_date || '', j.content || '', j.tags || '']
      );
    }

    // 6. Memories (Vault)
    const memories = await db.query<{ id: string; title: string; content: string; category: string }>(
      'SELECT id, title, content, category FROM memories WHERE is_deleted = 0'
    );
    for (const m of memories) {
      await db.execute(
        'INSERT INTO global_search_fts (entity_type, entity_id, title, content, tags) VALUES (?, ?, ?, ?, ?)',
        ['vault', m.id, m.title || '', m.content || '', m.category || '']
      );
    }

    logger.info('FTS5 global search index rebuilt successfully.', 'SearchService');
  }
}

export const searchService = new SearchService();
