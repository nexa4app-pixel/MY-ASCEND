import { useEffect } from 'react';
import { taskSchedulerService } from '../services/taskSchedulerService';
import { notificationService } from '../services/notificationService';

export function useNotificationScheduler(intervalMs: number = 30000) {
  useEffect(() => {
    // Request permission once on startup
    notificationService.requestPermission().catch(() => {});

    // Start background scanner
    taskSchedulerService.start(intervalMs);

    return () => {
      taskSchedulerService.stop();
    };
  }, [intervalMs]);
}
