import React from 'react';
import { AppShell } from './layout/AppShell';
import { useNavigationStore } from './store/useNavigationStore';
import { DashboardPage } from './pages/DashboardPage';
import { InboxPage } from './pages/InboxPage';
import { TasksPage } from './pages/TasksPage';
import { FocusPage } from './pages/FocusPage';
import { SchedulePage } from './pages/SchedulePage';
import { ManagementPage } from './pages/ManagementPage';
import { AcademicPage } from './pages/AcademicPage';
import { JournalPage } from './pages/JournalPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SettingsPage } from './pages/SettingsPage';
import { DiagnosticPage } from './pages/DiagnosticPage';

export const App: React.FC = () => {
  const currentRoute = useNavigationStore((state) => state.currentRoute);

  const renderCurrentPage = () => {
    switch (currentRoute) {
      case 'dashboard':
        return <DashboardPage />;
      case 'inbox':
        return <InboxPage />;
      case 'tasks':
        return <TasksPage />;
      case 'focus':
        return <FocusPage />;
      case 'schedule':
        return <SchedulePage />;
      case 'management':
        return <ManagementPage />;
      case 'academic':
        return <AcademicPage />;
      case 'journal':
        return <JournalPage />;
      case 'analytics':
        return <AnalyticsPage />;
      case 'life':
        return <JournalPage />;
      case 'settings':
        return <SettingsPage />;
      case 'settings/diagnostic':
        return <DiagnosticPage />;
      default:
        return <DashboardPage />;
    }
  };

  return <AppShell>{renderCurrentPage()}</AppShell>;
};
