import { clipboard } from 'electron';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);

export class Win32Capture {
  /**
   * Identifies the active foreground window process name on Windows
   */
  public static async getActiveWindowTitle(): Promise<string> {
    if (process.platform !== 'win32') return 'Active Application';

    try {
      const psCommand = `powershell -NoProfile -NonInteractive -Command "
        Add-Type @'
        using System;
        using System.Runtime.InteropServices;
        using System.Text;
        public class Win32 {
          [DllImport(\\"user32.dll\\")]
          public static extern IntPtr GetForegroundWindow();
          [DllImport(\\"user32.dll\\", SetLastError=true, CharSet=CharSet.Auto)]
          public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
        }
'@
        $hwnd = [Win32]::GetForegroundWindow()
        $sb = New-Object System.Text.StringBuilder 256
        $len = [Win32]::GetWindowText($hwnd, $sb, 256)
        if ($len -gt 0) { $sb.ToString() } else { '' }
      "`;

      const { stdout } = await execAsync(psCommand, { timeout: 1500 });
      return stdout.trim() || 'Active Application';
    } catch {
      return 'Active Application';
    }
  }

  /**
   * Captures selected text from the foreground application using clipboard preservation
   */
  public static async captureSelectedText(): Promise<string | null> {
    // 1. Backup current clipboard content
    const originalText = clipboard.readText();
    const originalHtml = clipboard.readHTML();

    // 2. Clear clipboard so we can detect if a fresh copy occurred
    clipboard.clear();

    try {
      if (process.platform === 'win32') {
        // Send Ctrl+C via PowerShell SendKeys to simulate copy on the active foreground window
        const psCopy = `powershell -NoProfile -NonInteractive -Command "
          Add-Type -AssemblyName System.Windows.Forms;
          Start-Sleep -Milliseconds 50;
          [System.Windows.Forms.SendKeys]::SendWait('^c');
        "`;

        await execAsync(psCopy, { timeout: 1500 }).catch(() => {});
      }

      // Allow a brief moment for active app to write to clipboard
      await new Promise((resolve) => setTimeout(resolve, 150));

      const newText = clipboard.readText();

      // 3. Restore original clipboard content so user's clipboard is unaffected
      if (originalText || originalHtml) {
        clipboard.write({
          text: originalText,
          html: originalHtml,
        });
      }

      if (newText && newText.trim().length > 0) {
        return newText.trim();
      }

      return null;
    } catch (err) {
      console.warn('Selected text capture failed:', err);
      // Restore clipboard in case of error
      if (originalText) {
        clipboard.writeText(originalText);
      }
      return null;
    }
  }
}
