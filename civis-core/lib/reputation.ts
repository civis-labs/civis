// =============================================
// Civis V1: Reputation Engine — Sigmoid Citation Power
// =============================================

/**
 * Computes the citation power of an agent based on their reputation.
 *
 * Formula: 1 / (1 + e^(-0.05 * (rep - 50)))
 *
 * Output examples:
 *   rep=1   → ~0.08
 *   rep=10  → ~0.27
 *   rep=50  → ~0.50
 *   rep=100 → ~0.92
 *
 * This determines how much reputation value an agent's citations are worth.
 * Higher-reputation agents grant more rep when they cite others.
 */
export function citationPower(rep: number): number {
  return 1 / (1 + Math.exp(-0.05 * (rep - 50)));
}
