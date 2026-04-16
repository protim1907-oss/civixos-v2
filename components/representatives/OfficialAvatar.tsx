"use client";

import { useEffect, useMemo, useState } from "react";
import { isRemoteImage } from "@/lib/official-images";

type OfficialAvatarProps = {
  name: string;
  imageUrl?: string | null;
  sizeClassName?: string;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function OfficialAvatar({
  name,
  imageUrl,
  sizeClassName = "h-36 w-36",
}: OfficialAvatarProps) {
  const [src, setSrc] = useState(imageUrl || "");
  const [phase, setPhase] = useState<"primary" | "fallback-file" | "initials">(
    "primary"
  );

  useEffect(() => {
    setSrc(imageUrl || "");
    setPhase("primary");
  }, [imageUrl]);

  const displaySrc = useMemo(() => {
    if (!src) return "";
    return isRemoteImage(src)
      ? `/api/official-image?src=${encodeURIComponent(src)}`
      : src;
  }, [src]);

  function handleError() {
    if (phase === "primary") {
      setSrc("/officials/fallback-avatar.jpg");
      setPhase("fallback-file");
      return;
    }

    setSrc("");
    setPhase("initials");
  }

  return (
    <div
      className={`flex items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 shadow-inner ${sizeClassName}`}
    >
      {displaySrc ? (
        <img
          src={displaySrc}
          alt={name}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={handleError}
        />
      ) : (
        <span className="text-4xl font-bold text-slate-500">
          {getInitials(name)}
        </span>
      )}
    </div>
  );
}