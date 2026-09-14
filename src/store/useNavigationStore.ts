import { create } from 'zustand';

export type AppRoute =
  | 'dashboard'
  | 'inbox'
  | 'tasks'
  | 'focus'
  | 'schedule'
  | 'management'
  | 'academic'
  | 'journal'
  | 'analytics'
  | 'life'
  | 'settings'
  | 'settings/diagnostic';

interface NavigationState {
  currentRoute: AppRoute;
  isSidebarCollapsed: boolean;
  navigate: (route: AppRoute) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  currentRoute: 'dashboard',
  isSidebarCollapsed: false,

  navigate: (route: AppRoute) => {
    set({ currentRoute: route });
  },

  toggleSidebar: () => {
    set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed }));
  },

  setSidebarCollapsed: (collapsed: boolean) => {
    set({ isSidebarCollapsed: collapsed });
  },
}));
