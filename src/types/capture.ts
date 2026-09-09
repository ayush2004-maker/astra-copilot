export interface CapturedTextResult {
  text: string;
  sourceApp?: string;
  method: 'active_app_selection' | 'clipboard' | 'ocr' | 'fallback';
  timestamp: number;
}

export type QuickActionType =
  | 'explain'
  | 'solve'
  | 'summarize'
  | 'debug'
  | 'translate'
  | 'answer'
  | 'generate_code'
  | 'simplify';

export interface QuickActionConfig {
  type: QuickActionType;
  label: string;
  description: string;
  promptTemplate: (text: string) => string;
}

export interface OCRProgress {
  status: string;
  progress: number;
}
