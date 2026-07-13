// Civic-themed donor recognition tiers, based on a donor's LIFETIME cumulative
// giving. Boundaries align with the donate page's preset amounts
// ($10 / $25 / $50 / $100 / $250).

export type DonorTier = {
  name: string;
  min: number; // inclusive lower bound of lifetime total (USD)
  badgeClass: string; // Tailwind classes for the pill
};

// Ordered high → low so getDonorTier can return the first threshold met.
export const DONOR_TIERS: DonorTier[] = [
  { name: "Founding Circle", min: 250, badgeClass: "border-violet-200 bg-violet-50 text-violet-700" },
  { name: "Patriot", min: 100, badgeClass: "border-blue-200 bg-blue-50 text-blue-700" },
  { name: "Champion", min: 50, badgeClass: "border-amber-200 bg-amber-50 text-amber-700" },
  { name: "Advocate", min: 25, badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  { name: "Citizen", min: 0, badgeClass: "border-slate-200 bg-slate-100 text-slate-700" },
];

export function getDonorTier(lifetimeTotal: number): DonorTier {
  return (
    DONOR_TIERS.find((tier) => lifetimeTotal >= tier.min) ??
    DONOR_TIERS[DONOR_TIERS.length - 1]
  );
}

// A single stable key to group multiple donations by the same donor.
export function donorKey(
  donorEmail: string | null | undefined,
  donorName: string | null | undefined
): string {
  return (donorEmail || donorName || "anonymous").trim().toLowerCase();
}

// "Sustaining Member" overlay for recurring/monthly donors. Until a dedicated
// recurring flag exists on platform_donations, we approximate it: a donor who
// has given in 2+ distinct calendar months is treated as a sustaining member.
export function isSustainingDonor(donationDates: (string | null)[]): boolean {
  const months = new Set(
    donationDates
      .filter((d): d is string => Boolean(d))
      .map((d) => d.slice(0, 7)) // YYYY-MM
  );
  return months.size >= 2;
}
