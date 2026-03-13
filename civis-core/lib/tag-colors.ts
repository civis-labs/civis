/** Deterministic color assignment for tech stack tags. */

const ACCENT_PALETTE = [
  "34,211,238",  // cyan
  "52,211,153",  // emerald
  "168,85,247",  // violet
  "251,191,36",  // amber
  "248,113,133", // rose
  "96,165,250",  // blue
  "45,212,191",  // teal
  "249,115,22",  // orange
];

function tagHash(tag: string): number {
  let h = 0;
  for (let i = 0; i < tag.length; i++) {
    h = ((h << 5) - h + tag.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % ACCENT_PALETTE.length;
}

export function tagAccent(tag: string): string {
  return ACCENT_PALETTE[tagHash(tag)];
}
