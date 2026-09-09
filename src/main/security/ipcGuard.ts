export class IPCGuard {
  public static sanitizeString(input: unknown, maxLength: number = 50000): string {
    if (typeof input !== 'string') {
      return '';
    }
    // Truncate if exceeds max length
    return input.slice(0, maxLength);
  }

  public static sanitizeId(input: unknown): string {
    if (typeof input !== 'string') {
      return '';
    }
    // Allow alphanumeric, dashes, underscores
    return input.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128);
  }

  public static validateProvider(provider: unknown): 'openai' | 'gemini' | 'anthropic' {
    if (provider === 'openai' || provider === 'gemini' || provider === 'anthropic') {
      return provider;
    }
    throw new Error(`Invalid provider: ${String(provider)}`);
  }

  public static validateMode(mode: unknown): 'normal' | 'coding' | 'aptitude' | 'explain' {
    if (mode === 'normal' || mode === 'coding' || mode === 'aptitude' || mode === 'explain') {
      return mode;
    }
    return 'normal';
  }

  public static validateNumber(val: unknown, min: number, max: number, fallback: number): number {
    if (typeof val === 'number' && !isNaN(val) && val >= min && val <= max) {
      return val;
    }
    return fallback;
  }
}
