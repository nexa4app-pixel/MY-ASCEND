/**
 * Windows Focus Assist (DND) & Mini-Timer Window Service
 * MY ASCEND — Native System Integration
 */
import { invoke } from '@tauri-apps/api/core';
import { isTauriEnvironment } from '../db/client';
import { logger } from './logger';

class FocusAssistService {
  private inMemoryFocusAssist: boolean = false;

  public async setFocusAssist(enabled: boolean): Promise<boolean> {
    this.inMemoryFocusAssist = enabled;
    if (isTauriEnvironment()) {
      try {
        await invoke('set_focus_assist', { enabled });
        logger.info(`Toggled native Windows Focus Assist: ${enabled}`, 'FocusAssist');
        return enabled;
      } catch (err) {
        logger.warn(`Failed to set Windows Focus Assist: ${err}`, 'FocusAssist');
        return false;
      }
    }
    return enabled;
  }

  public async getFocusAssistStatus(): Promise<boolean> {
    if (isTauriEnvironment()) {
      try {
        return await invoke<boolean>('get_focus_assist_status');
      } catch {
        return this.inMemoryFocusAssist;
      }
    }
    return this.inMemoryFocusAssist;
  }

  public async toggleMiniTimerWindow(show: boolean): Promise<boolean> {
    if (isTauriEnvironment()) {
      try {
        return await invoke<boolean>('toggle_mini_timer_window', { show });
      } catch (err) {
        logger.warn(`Failed to toggle mini-timer window: ${err}`, 'FocusAssist');
        return false;
      }
    }
    return show;
  }
}

export const focusAssistService = new FocusAssistService();
