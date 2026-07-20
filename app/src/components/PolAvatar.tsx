/* Politician avatar: official portrait when we have one (re-hosted locally —
   visitors' browsers never fetch from third-party hosts, per the privacy
   notice), monogram fallback otherwise. Officeholders get official government
   portraits (see public/politicians/ATTRIBUTION.md); challengers stay on the
   monogram until they provide a photo via the D4 questionnaire. */
export function PolAvatar({
  name,
  photoUrl,
  size = 42,
}: {
  name: string;
  photoUrl?: string | null;
  size?: number;
}) {
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt=""
        aria-hidden
        width={size}
        height={size}
        style={{ borderRadius: "50%", objectFit: "cover", width: size, height: size, flex: "none" }}
      />
    );
  }
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span className="mono-av" aria-hidden style={size !== 42 ? { width: size, height: size } : undefined}>
      {initials}
    </span>
  );
}
