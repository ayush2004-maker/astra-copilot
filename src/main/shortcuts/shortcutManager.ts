import { globalShortcut } from 'electron';
import { TextCaptureManager } from '../capture/textCaptureManager';
import { WindowManager } from '../windows/windowManager';
import { CapturedTextResult } from '../../types/capture';

export class ShortcutManager {
  private static instance: ShortcutManager | null = null;
  private currentShortcut: string = 'CommandOrControl+Shift+Space';
  private readonly toggleShortcut = 'CommandOrControl+Q';
  private onCapturedCallback: ((data: CapturedTextResult) => void) | null = null;

  private constructor() {}

  public static getInstance(): ShortcutManager {
    if (!ShortcutManager.instance) {
      ShortcutManager.instance = new ShortcutManager();
    }
    return ShortcutManager.instance;
  }

  public register(
    accelerator: string = 'CommandOrControl+Shift+Space',
    onCaptured?: (data: CapturedTextResult) => void
  ): boolean {
    if (onCaptured) {
      this.onCapturedCallback = onCaptured;
    }

    // Unregister old shortcut if any
    globalShortcut.unregisterAll();

    this.currentShortcut = accelerator;

    try {
      const registered = globalShortcut.register(accelerator, async () => {
        await this.handleShortcutTriggered();
      });

      if (!registered) {
        console.warn(`Failed to register global shortcut: ${accelerator}`);
      }

      const toggleRegistered = accelerator === this.toggleShortcut
        ? true
        : globalShortcut.register(this.toggleShortcut, async () => {
            await WindowManager.getInstance().toggleWindow();
          });

      if (!toggleRegistered) {
        console.warn(`Failed to register toggle shortcut: ${this.toggleShortcut}`);
      }

      return registered || toggleRegistered;
    } catch (err) {
      console.error('Error registering global shortcut:', err);
      return false;
    }
  }

  private async handleShortcutTriggered(): Promise<void> {
    const captureMgr = TextCaptureManager.getInstance();
    const winMgr = WindowManager.getInstance();

    // Open immediately even when the active application has no selected text.
    await winMgr.expandToChat();

    // Then try to retrieve selected text without making the shortcut depend on it.
    const captured = await captureMgr.getSelectedText();

    // If captured text is available, send it to the renderer.
    if (captured && this.onCapturedCallback) {
      this.onCapturedCallback(captured);
    }
  }

  public unregisterAll(): void {
    globalShortcut.unregisterAll();
  }

  public getCurrentShortcut(): string {
    return this.currentShortcut;
  }
}
