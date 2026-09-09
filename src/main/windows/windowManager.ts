import { BrowserWindow, screen, app } from 'electron';
import path from 'path';
import { ConversationStore } from '../storage/conversationStore';
import { AppSettings } from '../../types/settings';

export class WindowManager {
  private static instance: WindowManager | null = null;
  private mainWindow: BrowserWindow | null = null;
  private isExpandedState: boolean = false;
  private store: ConversationStore | null = null;
  private settings: AppSettings | null = null;
  private allowWindowClose = false;

  // Window dimensions
  private readonly BUBBLE_SIZE = 76;
  private readonly CHAT_WIDTH = 450;
  private readonly CHAT_HEIGHT = 640;

  private constructor() {}

  public static getInstance(): WindowManager {
    if (!WindowManager.instance) {
      WindowManager.instance = new WindowManager();
    }
    return WindowManager.instance;
  }

  public setStore(store: ConversationStore): void {
    this.store = store;
  }

  public setSettings(settings: AppSettings): void {
    this.settings = settings;
  }

  public getMainWindow(): BrowserWindow | null {
    return this.mainWindow;
  }

  public prepareToQuit(): void {
    this.allowWindowClose = true;
  }

  public isExpanded(): boolean {
    return this.isExpandedState;
  }

  public createMainWindow(): BrowserWindow {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

    // Load saved position or default to bottom-right
    let savedPos = this.store?.getSetting<{ x: number; y: number } | null>('assistantPosition', null);
    const positionIsVisible = savedPos && screen.getAllDisplays().some((display) => {
      const area = display.workArea;
      return savedPos!.x + this.BUBBLE_SIZE > area.x && savedPos!.x < area.x + area.width
        && savedPos!.y + this.BUBBLE_SIZE > area.y && savedPos!.y < area.y + area.height;
    });

    if (!positionIsVisible) {
      savedPos = {
        x: screenWidth - this.BUBBLE_SIZE - 24,
        y: screenHeight - this.BUBBLE_SIZE - 40,
      };
    }
    const windowPosition = savedPos;

    const alwaysOnTopSetting = this.settings?.alwaysOnTop ?? true;

    this.mainWindow = new BrowserWindow({
      width: this.BUBBLE_SIZE,
      height: this.BUBBLE_SIZE,
      x: windowPosition!.x,
      y: windowPosition!.y,
      frame: false,
      transparent: true,
      alwaysOnTop: alwaysOnTopSetting,
      resizable: false,
      skipTaskbar: false,
      hasShadow: false,
      backgroundColor: '#00000000',
      webPreferences: {
        preload: path.join(__dirname, '../preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
      },
    });

    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.showInactive();
    });

    // Load Vite dev server in development or built file in production
    const devServerUrl = process.env.VITE_DEV_SERVER_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:5173' : '');
    if (devServerUrl) {
      this.mainWindow.loadURL(devServerUrl);
    } else {
      this.mainWindow.loadFile(path.join(__dirname, '../../renderer/index.html'));
    }

    // Save position when user drags bubble
    this.mainWindow.on('moved', () => {
      if (!this.isExpandedState && this.mainWindow) {
        const [x, y] = this.mainWindow.getPosition();
        this.saveBubblePosition(x, y);
      }
    });

    this.mainWindow.on('close', (event) => {
      if (this.allowWindowClose) return;

      // Keep the tray process and BrowserWindow alive when Windows closes the
      // taskbar entry so the existing instance can be reopened normally.
      event.preventDefault();
      this.isExpandedState = false;
      const position = this.settings?.assistantPosition ?? {
        x: windowPosition!.x,
        y: windowPosition!.y,
      };
      this.mainWindow?.setBounds({
        x: position.x,
        y: position.y,
        width: this.BUBBLE_SIZE,
        height: this.BUBBLE_SIZE,
      });
      this.mainWindow?.hide();
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    return this.mainWindow;
  }

  public saveBubblePosition(x: number, y: number): void {
    if (this.settings) {
      this.settings.assistantPosition = { x, y };
      this.store?.saveSetting('appSettings', this.settings);
    }
    if (this.store) {
      this.store.saveSetting('assistantPosition', { x, y });
    }
  }

  public async expandToChat(): Promise<void> {
    if (!this.mainWindow) return;
    if (this.isExpandedState) {
      this.mainWindow.show();
      this.mainWindow.focus();
      return;
    }

    const [curX, curY] = this.mainWindow.getPosition();
    this.saveBubblePosition(curX, curY);

    const primaryDisplay = screen.getDisplayNearestPoint({ x: curX, y: curY });
    const { width: screenWidth, height: screenHeight, x: displayX, y: displayY } = primaryDisplay.workArea;

    // Calculate chat window position anchored around the bubble
    let targetX = curX + this.BUBBLE_SIZE - this.CHAT_WIDTH;
    let targetY = curY + this.BUBBLE_SIZE - this.CHAT_HEIGHT;

    // Keep within display boundary
    if (targetX < displayX + 16) targetX = displayX + 16;
    if (targetX + this.CHAT_WIDTH > displayX + screenWidth - 16) {
      targetX = displayX + screenWidth - this.CHAT_WIDTH - 16;
    }
    if (targetY < displayY + 16) targetY = displayY + 16;
    if (targetY + this.CHAT_HEIGHT > displayY + screenHeight - 16) {
      targetY = displayY + screenHeight - this.CHAT_HEIGHT - 16;
    }

    this.isExpandedState = true;
    this.mainWindow.setResizable(true);
    this.mainWindow.setBounds({
      x: targetX,
      y: targetY,
      width: this.CHAT_WIDTH,
      height: this.CHAT_HEIGHT,
    });
    this.mainWindow.setResizable(false);
    this.mainWindow.focus();

    // Inform renderer
    this.mainWindow.webContents.send('window-state-changed', { isExpanded: true });
  }

  public async minimizeToBubble(): Promise<void> {
    if (!this.mainWindow || !this.isExpandedState) return;

    // Retrieve saved bubble position or compute bottom-right
    let pos = this.settings?.assistantPosition ?? this.store?.getSetting<{ x: number; y: number } | null>('assistantPosition', null);
    if (!pos) {
      const primaryDisplay = screen.getPrimaryDisplay();
      const { width, height } = primaryDisplay.workAreaSize;
      pos = { x: width - this.BUBBLE_SIZE - 24, y: height - this.BUBBLE_SIZE - 40 };
    }

    this.isExpandedState = false;
    this.mainWindow.setResizable(true);
    this.mainWindow.setBounds({
      x: pos.x,
      y: pos.y,
      width: this.BUBBLE_SIZE,
      height: this.BUBBLE_SIZE,
    });
    this.mainWindow.setResizable(false);

    // In bubble mode, show without aggressively stealing focus
    this.mainWindow.showInactive();

    // Inform renderer
    this.mainWindow.webContents.send('window-state-changed', { isExpanded: false });
  }

  public async toggleWindow(): Promise<void> {
    if (this.isExpandedState) {
      await this.minimizeToBubble();
    } else {
      await this.expandToChat();
    }
  }

  public setAlwaysOnTop(alwaysOnTop: boolean): void {
    if (this.settings) {
      this.settings.alwaysOnTop = alwaysOnTop;
    }
    if (this.mainWindow) {
      this.mainWindow.setAlwaysOnTop(alwaysOnTop);
      if (this.settings) {
        this.store?.saveSetting('appSettings', this.settings);
      }
    }
  }
}
