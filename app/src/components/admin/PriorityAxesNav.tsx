// Plain <a> links, bold-when-active -- the same inline-style convention the
// topic-filter row on this screen already used before the 2026-10-01 split
// into 4 routes. No client JS, same as the rest of /admin.
const TABS = [
  { key: "review", href: "/admin/priority-axes", label: "Review queue" },
  { key: "published", href: "/admin/priority-axes/published", label: "Published & retired" },
  { key: "wishes", href: "/admin/priority-axes/wishes", label: "Resident wishes" },
  { key: "new", href: "/admin/priority-axes/new", label: "Draft new axis" },
] as const;

export function PriorityAxesNav({ active }: { active: (typeof TABS)[number]["key"] }) {
  return (
    <p className="sub" style={{ marginTop: 0, display: "flex", gap: "0.9rem", flexWrap: "wrap" }}>
      {TABS.map((t) => (
        <a key={t.key} href={t.href} style={{ fontWeight: active === t.key ? "bold" : "normal" }}>
          {t.label}
        </a>
      ))}
    </p>
  );
}
