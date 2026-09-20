/**
 * Windows Focus Assist & Do Not Disturb Native Bridge
 * MY ASCEND — System Notification Muting Engine
 */

use std::sync::atomic::{AtomicBool, Ordering};

static FOCUS_ASSIST_ACTIVE: AtomicBool = AtomicBool::new(false);

/// Set Windows Focus Assist / Do Not Disturb state
#[tauri::command]
pub fn set_focus_assist(enabled: bool) -> Result<bool, String> {
    FOCUS_ASSIST_ACTIVE.store(enabled, Ordering::SeqCst);

    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        let val = if enabled { "0" } else { "1" };
        // Update Windows Toast notification suppression setting in user profile
        let ps_script = format!(
            "Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Notifications\\Settings' -Name 'NOC_GLOBAL_SETTING_TOASTS_ENABLED' -Value {} -Type DWord -ErrorAction SilentlyContinue",
            val
        );

        let _ = Command::new("powershell")
            .creation_flags(CREATE_NO_WINDOW)
            .args(["-NoProfile", "-NonInteractive", "-Command", &ps_script])
            .output();
    }

    log::info!("Windows Focus Assist state toggled to: {}", enabled);
    Ok(enabled)
}

/// Get current Focus Assist state
#[tauri::command]
pub fn get_focus_assist_status() -> Result<bool, String> {
    Ok(FOCUS_ASSIST_ACTIVE.load(Ordering::SeqCst))
}
