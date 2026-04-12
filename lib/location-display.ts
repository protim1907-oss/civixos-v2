export function displayState(value: string | null | undefined) {
  const normalized = (value || "").trim().toUpperCase();

  switch (normalized) {
    case "NH":
    case "NEW HAMPSHIRE":
      return "New Hampshire";
    case "TX":
    case "TEXAS":
      return "Texas";
    case "CA":
    case "CALIFORNIA":
      return "California";
    case "FL":
    case "FLORIDA":
      return "Florida";
    default:
      return value || "Your State";
  }
}

export function displayDistrict(value: string | null | undefined) {
  const normalized = (value || "").trim().toUpperCase();

  switch (normalized) {
    case "NH":
      return "New Hampshire";
    case "NH-01":
      return "New Hampshire 1st Congressional District";
    case "NH-02":
      return "New Hampshire 2nd Congressional District";
    case "TX":
      return "Texas";
    case "TX-12":
      return "Texas 12th District";
    case "TX-20":
      return "Texas 20th District";
    case "CA":
      return "California";
    case "FL":
      return "Florida";
    default:
      return value || "Your District";
  }
}

export function normalizeStateFromDistrict(
  state: string | null | undefined,
  district: string | null | undefined
) {
  if (state && state.trim()) return displayState(state);

  const normalizedDistrict = (district || "").trim().toUpperCase();

  if (normalizedDistrict.startsWith("NH")) return "New Hampshire";
  if (normalizedDistrict.startsWith("TX")) return "Texas";
  if (normalizedDistrict.startsWith("CA")) return "California";
  if (normalizedDistrict.startsWith("FL")) return "Florida";

  return "Your State";
}