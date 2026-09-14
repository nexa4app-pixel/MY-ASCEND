import React, { useEffect } from 'react';
import { useSettingsStore } from '../store/useSettingsStore';
import { useThemeStore } from '../store/useThemeStore';
import { ErrorBoundary } from '../components/ErrorBoundary';

interface AppProvidersProps {
  children: React.ReactNode;
}

export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  const loadSettings = useSettingsStore((state) => state.loadSettings);
  const initTheme = useThemeStore((state) => state.initTheme);

  useEffect(() => {
    initTheme();
    loadSettings();
  }, [initTheme, loadSettings]);

  return <ErrorBoundary>{children}</ErrorBoundary>;
};
