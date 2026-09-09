import { desktopCapturer, screen } from 'electron';
import { createWorker } from 'tesseract.js';
import { OCRProgress } from '../../types/capture';

export class OCRService {
  private static isProcessing = false;

  public static async runOCR(
    onProgress?: (progress: OCRProgress) => void
  ): Promise<string> {
    if (this.isProcessing) {
      throw new Error('An OCR operation is already in progress');
    }

    this.isProcessing = true;
    onProgress?.({ status: 'Capturing screen...', progress: 0.1 });

    let worker: any = null;
    try {
      // 1. Capture primary display using desktopCapturer
      const primaryDisplay = screen.getPrimaryDisplay();
      const { width, height } = primaryDisplay.size;

      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: {
          width: Math.min(width, 1920),
          height: Math.min(height, 1080),
        },
      });

      if (!sources || sources.length === 0) {
        throw new Error('Unable to capture display screen');
      }

      // Grab image buffer from primary screen
      const imageBuffer = sources[0].thumbnail.toPNG();
      if (!imageBuffer || imageBuffer.length === 0) {
        throw new Error('Captured screen buffer is empty');
      }

      onProgress?.({ status: 'Initializing local OCR engine...', progress: 0.3 });

      // 2. Initialize local Tesseract.js worker
      worker = await createWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            onProgress?.({
              status: `Recognizing text (${Math.round((m.progress || 0) * 100)}%)`,
              progress: 0.3 + (m.progress || 0) * 0.6,
            });
          }
        },
      });

      onProgress?.({ status: 'Extracting visible text...', progress: 0.5 });
      const { data } = await worker.recognize(imageBuffer);

      onProgress?.({ status: 'Complete', progress: 1.0 });

      // Clean up text
      const extractedText = (data.text || '').trim();
      return extractedText;
    } catch (err) {
      console.error('OCR processing error:', err);
      throw new Error(`Local OCR recognition failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      // Clean up worker immediately to free memory
      if (worker) {
        try {
          await worker.terminate();
        } catch {}
      }
      this.isProcessing = false;
    }
  }
}
