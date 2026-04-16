export type OfficialImageLookupInput = {
  name?: string | null;
  title?: string | null;
  state?: string | null;
  remoteImageUrl?: string | null;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const LOCAL_IMAGE_MAP: Record<string, string> = {
  "greg-casar": "/officials/greg-casar.jpg",
  "ted-cruz": "/officials/ted-cruz.jpg",
  "greg-abbott": "/officials/greg-abbott.jpg",
  "ken-paxton": "/officials/ken-paxton.jpg",
  "chris-pappas": "/officials/chris-pappas.jpg",
  "maggie-hassan": "/officials/maggie-hassan.jpg",
  "jeanne-shaheen": "/officials/jeanne-shaheen.jpg",
  "kelly-ayotte": "/officials/kelly-ayotte.jpg",
};

export function resolveOfficialImage(input: OfficialImageLookupInput): string {
  const name = (input.name || "").trim();
  const remote = (input.remoteImageUrl || "").trim();

  if (name) {
    const slug = slugify(name);
    const local = LOCAL_IMAGE_MAP[slug];
    if (local) return local;

    const guessedLocal = `/officials/${slug}.jpg`;
    return remote || guessedLocal;
  }

  return remote || "/officials/fallback-avatar.jpg";
}

export function isRemoteImage(src: string) {
  return /^https?:\/\//i.test(src);
}