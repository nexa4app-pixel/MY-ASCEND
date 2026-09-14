import { create } from 'zustand';
import { SearchEntityType, SearchResult } from '../services/searchService';

interface SearchStore {
  showSearchModal: boolean;
  query: string;
  selectedEntityType: SearchEntityType | 'all';
  results: SearchResult[];
  selectedIndex: number;
  isLoading: boolean;

  openModal: () => void;
  closeModal: () => void;
  toggleModal: (open?: boolean) => void;
  setQuery: (query: string) => void;
  setSelectedEntityType: (type: SearchEntityType | 'all') => void;
  setResults: (results: SearchResult[]) => void;
  setSelectedIndex: (index: number | ((prev: number) => number)) => void;
  setIsLoading: (isLoading: boolean) => void;
  reset: () => void;
}

export const useSearchStore = create<SearchStore>((set) => ({
  showSearchModal: false,
  query: '',
  selectedEntityType: 'all',
  results: [],
  selectedIndex: 0,
  isLoading: false,

  openModal: () => set({ showSearchModal: true, query: '', results: [], selectedIndex: 0 }),
  closeModal: () => set({ showSearchModal: false, query: '', results: [], selectedIndex: 0 }),
  toggleModal: (open) =>
    set((state) => ({
      showSearchModal: typeof open === 'boolean' ? open : !state.showSearchModal,
      query: '',
      results: [],
      selectedIndex: 0,
    })),
  setQuery: (query) => set({ query, selectedIndex: 0 }),
  setSelectedEntityType: (type) => set({ selectedEntityType: type, selectedIndex: 0 }),
  setResults: (results) => set({ results, selectedIndex: 0 }),
  setSelectedIndex: (index) =>
    set((state) => ({
      selectedIndex: typeof index === 'function' ? index(state.selectedIndex) : index,
    })),
  setIsLoading: (isLoading) => set({ isLoading }),
  reset: () =>
    set({
      query: '',
      selectedEntityType: 'all',
      results: [],
      selectedIndex: 0,
      isLoading: false,
    }),
}));
