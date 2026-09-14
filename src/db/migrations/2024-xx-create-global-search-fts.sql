-- 2024-xx-create-global-search-fts.sql
-- Migration: Create SQLite FTS5 virtual table for global search and sync triggers.

CREATE VIRTUAL TABLE IF NOT EXISTS global_search_fts USING fts5(
  entity_type,
  entity_id,
  title,
  content,
  tags,
  tokenize='unicode61 remove_diacritics 1'
);

-- Triggers for tasks
CREATE TRIGGER IF NOT EXISTS tasks_ai AFTER INSERT ON tasks
WHEN NEW.is_deleted = 0
BEGIN
  DELETE FROM global_search_fts WHERE entity_type = 'task' AND entity_id = NEW.id;
  INSERT INTO global_search_fts(entity_type, entity_id, title, content, tags)
  VALUES('task', NEW.id, NEW.title, COALESCE(NEW.description, ''), COALESCE(NEW.priority, ''));
END;

CREATE TRIGGER IF NOT EXISTS tasks_au AFTER UPDATE ON tasks
BEGIN
  DELETE FROM global_search_fts WHERE entity_type = 'task' AND entity_id = NEW.id;
  INSERT INTO global_search_fts(entity_type, entity_id, title, content, tags)
  SELECT 'task', NEW.id, NEW.title, COALESCE(NEW.description, ''), COALESCE(NEW.priority, '')
  WHERE NEW.is_deleted = 0;
END;

CREATE TRIGGER IF NOT EXISTS tasks_ad AFTER DELETE ON tasks
BEGIN
  DELETE FROM global_search_fts WHERE entity_type = 'task' AND entity_id = OLD.id;
END;

-- Triggers for inbox_captures
CREATE TRIGGER IF NOT EXISTS inbox_captures_ai AFTER INSERT ON inbox_captures
WHEN NEW.is_deleted = 0
BEGIN
  DELETE FROM global_search_fts WHERE entity_type = 'inbox' AND entity_id = NEW.id;
  INSERT INTO global_search_fts(entity_type, entity_id, title, content, tags)
  VALUES('inbox', NEW.id, NEW.raw_content, COALESCE(NEW.raw_content, ''), COALESCE(NEW.source, ''));
END;

CREATE TRIGGER IF NOT EXISTS inbox_captures_au AFTER UPDATE ON inbox_captures
BEGIN
  DELETE FROM global_search_fts WHERE entity_type = 'inbox' AND entity_id = NEW.id;
  INSERT INTO global_search_fts(entity_type, entity_id, title, content, tags)
  SELECT 'inbox', NEW.id, NEW.raw_content, COALESCE(NEW.raw_content, ''), COALESCE(NEW.source, '')
  WHERE NEW.is_deleted = 0;
END;

CREATE TRIGGER IF NOT EXISTS inbox_captures_ad AFTER DELETE ON inbox_captures
BEGIN
  DELETE FROM global_search_fts WHERE entity_type = 'inbox' AND entity_id = OLD.id;
END;

-- Triggers for subjects
CREATE TRIGGER IF NOT EXISTS subjects_ai AFTER INSERT ON subjects
WHEN NEW.is_deleted = 0
BEGIN
  DELETE FROM global_search_fts WHERE entity_type = 'subject' AND entity_id = NEW.id;
  INSERT INTO global_search_fts(entity_type, entity_id, title, content, tags)
  VALUES('subject', NEW.id, NEW.name, COALESCE(NEW.code, '') || ' ' || COALESCE(NEW.instructor, ''), COALESCE(NEW.code, ''));
END;

CREATE TRIGGER IF NOT EXISTS subjects_au AFTER UPDATE ON subjects
BEGIN
  DELETE FROM global_search_fts WHERE entity_type = 'subject' AND entity_id = NEW.id;
  INSERT INTO global_search_fts(entity_type, entity_id, title, content, tags)
  SELECT 'subject', NEW.id, NEW.name, COALESCE(NEW.code, '') || ' ' || COALESCE(NEW.instructor, ''), COALESCE(NEW.code, '')
  WHERE NEW.is_deleted = 0;
END;

CREATE TRIGGER IF NOT EXISTS subjects_ad AFTER DELETE ON subjects
BEGIN
  DELETE FROM global_search_fts WHERE entity_type = 'subject' AND entity_id = OLD.id;
END;

-- Triggers for topics
CREATE TRIGGER IF NOT EXISTS topics_ai AFTER INSERT ON topics
WHEN NEW.is_deleted = 0
BEGIN
  DELETE FROM global_search_fts WHERE entity_type = 'topic' AND entity_id = NEW.id;
  INSERT INTO global_search_fts(entity_type, entity_id, title, content, tags)
  VALUES('topic', NEW.id, NEW.title, COALESCE(NEW.importance_level, ''), COALESCE(NEW.importance_level, ''));
END;

CREATE TRIGGER IF NOT EXISTS topics_au AFTER UPDATE ON topics
BEGIN
  DELETE FROM global_search_fts WHERE entity_type = 'topic' AND entity_id = NEW.id;
  INSERT INTO global_search_fts(entity_type, entity_id, title, content, tags)
  SELECT 'topic', NEW.id, NEW.title, COALESCE(NEW.importance_level, ''), COALESCE(NEW.importance_level, '')
  WHERE NEW.is_deleted = 0;
END;

CREATE TRIGGER IF NOT EXISTS topics_ad AFTER DELETE ON topics
BEGIN
  DELETE FROM global_search_fts WHERE entity_type = 'topic' AND entity_id = OLD.id;
END;

-- Triggers for journals
CREATE TRIGGER IF NOT EXISTS journals_ai AFTER INSERT ON journals
WHEN NEW.is_deleted = 0
BEGIN
  DELETE FROM global_search_fts WHERE entity_type = 'journal' AND entity_id = NEW.id;
  INSERT INTO global_search_fts(entity_type, entity_id, title, content, tags)
  VALUES('journal', NEW.id, COALESCE(NEW.title, NEW.entry_date), COALESCE(NEW.content, ''), COALESCE(NEW.tags, ''));
END;

CREATE TRIGGER IF NOT EXISTS journals_au AFTER UPDATE ON journals
BEGIN
  DELETE FROM global_search_fts WHERE entity_type = 'journal' AND entity_id = NEW.id;
  INSERT INTO global_search_fts(entity_type, entity_id, title, content, tags)
  SELECT 'journal', NEW.id, COALESCE(NEW.title, NEW.entry_date), COALESCE(NEW.content, ''), COALESCE(NEW.tags, '')
  WHERE NEW.is_deleted = 0;
END;

CREATE TRIGGER IF NOT EXISTS journals_ad AFTER DELETE ON journals
BEGIN
  DELETE FROM global_search_fts WHERE entity_type = 'journal' AND entity_id = OLD.id;
END;

-- Triggers for memories (vault)
CREATE TRIGGER IF NOT EXISTS memories_ai AFTER INSERT ON memories
WHEN NEW.is_deleted = 0
BEGIN
  DELETE FROM global_search_fts WHERE entity_type = 'vault' AND entity_id = NEW.id;
  INSERT INTO global_search_fts(entity_type, entity_id, title, content, tags)
  VALUES('vault', NEW.id, NEW.title, COALESCE(NEW.content, ''), COALESCE(NEW.category, ''));
END;

CREATE TRIGGER IF NOT EXISTS memories_au AFTER UPDATE ON memories
BEGIN
  DELETE FROM global_search_fts WHERE entity_type = 'vault' AND entity_id = NEW.id;
  INSERT INTO global_search_fts(entity_type, entity_id, title, content, tags)
  SELECT 'vault', NEW.id, NEW.title, COALESCE(NEW.content, ''), COALESCE(NEW.category, '')
  WHERE NEW.is_deleted = 0;
END;

CREATE TRIGGER IF NOT EXISTS memories_ad AFTER DELETE ON memories
BEGIN
  DELETE FROM global_search_fts WHERE entity_type = 'vault' AND entity_id = OLD.id;
END;
