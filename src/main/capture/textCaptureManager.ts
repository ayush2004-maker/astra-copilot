import { CapturedTextResult, OCRProgress } from '../../types/capture';
import { Win32Capture } from './win32Capture';
import { OCRService } from './ocrService';

export class TextCaptureManager {
  private static instance: TextCaptureManager | null = null;
  private lastCapturedResult: CapturedTextResult | null = null;

  public static getInstance(): TextCaptureManager {
    if (!TextCaptureManager.instance) {
      TextCaptureManager.instance = new TextCaptureManager();
    }
    return TextCaptureManager.instance;
  }

  /**
   * Strategy 1 & 2: Active application selected text capture with clipboard preservation
   */
  public async getSelectedText(): Promise<CapturedTextResult | null> {
    const activeApp = await Win32Capture.getActiveWindowTitle();
    const text = await Win32Capture.captureSelectedText();

    if (text && text.length > 0) {
      this.lastCapturedResult = {
        text,
        sourceApp: activeApp,
        method: 'active_app_selection',
        timestamp: Date.now(),
      };
      return this.lastCapturedResult;
    }

    return null;
  }

  /**
   * Strategy 3: OCR fallback for visible screen text
   */
  public async captureVisibleText(
    onProgress?: (progress: OCRProgress) => void
  ): Promise<CapturedTextResult | null> {
    const activeApp = await Win32Capture.getActiveWindowTitle();
    const text = await OCRService.runOCR(onProgress);

    if (text && text.length > 0) {
      this.lastCapturedResult = {
        text,
        sourceApp: activeApp,
        method: 'ocr',
        timestamp: Date.now(),
      };
      return this.lastCapturedResult;
    }

    return null;
  }

  /**
   * Run OCR directly
   */
  public async runOCR(
    onProgress?: (progress: OCRProgress) => void
  ): Promise<string> {
    return OCRService.runOCR(onProgress);
  }

  /**
   * Dispose of any temporary cached captured data
   */
  public clearTemporaryData(): void {
    this.lastCapturedResult = null;
  }

  public getLastCaptured(): CapturedTextResult | null {
    return this.lastCapturedResult;
  }
}
