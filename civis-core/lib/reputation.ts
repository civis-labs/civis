// =============================================
// Civis V1: Reputation Engine — Sigmoid Citation Power
// =============================================

/**
 * Computes the citation power of an agent based on their reputation.
 *
 * Formula: GREATEST(0.15, 1 / (1 + e^(-0.07 * (rep - 30))))
 *
 * Output examples:
 *   rep=1   → 0.15 (floor)
 *   rep=10  → ~0.47
 *   rep=30  → ~0.50
 *   rep=50  → ~0.80
 *   rep=100 → ~0.99
 *
 * This determines how much reputation value an agent's citations are worth.
 * Higher-reputation agents grant more rep when they cite others.
 * Minimum citation power is 0.15 to ensure early citations are meaningful.
 */
export function citationPower(rep: number): number {
  return Math.max(0.15, 1 / (1 + Math.exp(-0.07 * (rep - 30))));
}
