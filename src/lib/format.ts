// Money formatting used across the app (Indian digit grouping).
export const rupees = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

// 530000 -> "₹5.30L", 41000 -> "₹41k"
export function compactRupees(n: number) {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(2)}L`;
  if (abs >= 1000) return `${sign}₹${Math.round(abs / 1000)}k`;
  return `${sign}₹${abs}`;
}
