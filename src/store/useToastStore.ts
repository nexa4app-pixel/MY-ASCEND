import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastState {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id'>) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  addToast: (toast) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newToast: ToastItem = { ...toast, id, duration: toast.duration ?? 4000 };

    set((state) => ({
      toasts: [...state.toasts.slice(-4), newToast], // Keep max 5 visible
    }));

    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }, newToast.duration);
    }

    return id;
  },

  removeToast: (id: string) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  clearToasts: () => {
    set({ toasts: [] });
  },
}));

/**
 * Convenient toast helper API
 */
export const toast = {
  success: (message: string, title?: string) =>
    useToastStore.getState().addToast({ type: 'success', message, title }),

  error: (message: string, title?: string) =>
    useToastStore.getState().addToast({ type: 'error', message, title, duration: 6000 }),

  info: (message: string, title?: string) =>
    useToastStore.getState().addToast({ type: 'info', message, title }),

  warning: (message: string, title?: string) =>
    useToastStore.getState().addToast({ type: 'warning', message, title, duration: 5000 }),

  dismiss: (id: string) => useToastStore.getState().removeToast(id),
};
