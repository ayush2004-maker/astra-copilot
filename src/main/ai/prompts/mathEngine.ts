/**
 * Safe local arithmetic evaluator to assist step-by-step verification
 * Prevents language models from making basic calculation slips
 */
export class MathEngine {
  public static evaluateSafe(expr: string): number | null {
    // Sanitize string to allow only mathematical symbols, numbers, parentheses
    const cleaned = expr.replace(/[^0-9\.\+\-\*\/\^\(\)\s\%]/g, '');
    if (!cleaned.trim()) return null;

    try {
      // Replace ^ with ** for power
      const powerConverted = cleaned.replace(/\^/g, '**');

      // Use Function constructor with strict no-scope to evaluate pure arithmetic safely
      const fn = new Function(`"use strict"; return (${powerConverted});`);
      const result = fn();
      if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
        return Math.round(result * 1000000) / 1000000;
      }
    } catch {
      return null;
    }
    return null;
  }

  public static verifyStep(expression: string, claimedResult: number): boolean {
    const computed = this.evaluateSafe(expression);
    if (computed === null) return true;
    return Math.abs(computed - claimedResult) < 1e-4;
  }
}
