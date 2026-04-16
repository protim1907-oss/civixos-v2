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
  "greg-abbott": "/officials/greg-abbott.jpg",
  "chris-pappas": "/officials/chris-pappas.jpg",
  "jeanne-shaheen": "/officials/jeanne-shaheen.jpg",
  "kelly-ayotte": "/officials/kelly-ayotte.jpg",
};

export function resolveOfficialImage(input: OfficialImageLookupInput): string {
  const name = (input.name || "").trim();
  const remote = (input.remoteImageUrl || "").trim();

  if (!name) {
    return remote || "";
  }

  const slug = slugify(name);

  // Only use local files that are explicitly present.
  if (LOCAL_IMAGE_MAP[slug]) {
    return LOCAL_IMAGE_MAP[slug];
  }

  // Otherwise use official remote image from API if available.
  if (remote) {
    return remote;
  }

  // Do NOT guess a local file path that may not exist.
  return "";
}

export function isRemoteImage(src: string) {
  return /^https?:\/\//i.test(src);
}