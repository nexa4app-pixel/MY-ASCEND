import { create } from 'zustand';
import { InboxSource } from '../types/database';

interface QuickCaptureState {
  isOpen: boolean;
  defaultSource: InboxSource;
  openModal: (source?: InboxSource) => void;
  closeModal: () => void;
}

export const useQuickCaptureStore = create<QuickCaptureState>((set) => ({
  isOpen: false,
  defaultSource: 'quick_capture',

  openModal: (source = 'quick_capture') => {
    set({ isOpen: true, defaultSource: source });
  },

  closeModal: () => {
    set({ isOpen: false });
  },
}));
