import type { ThemeColor } from '@/constants/theme';

/** Per-axis agreement (-2..2, or null for "no usable evidence") -> a full
    band-chip's fill/border/text. Mirrors app/src/app/globals.css's
    .band.b2/.b1/.b0/.bm1/.bm2/.bnull, used on the compare screen and (as of
    2026-08-23) the Matches screen's per-axis expand panel -- previously that
    panel's chip was always evidence-teal regardless of agree/disagree, the
    one thing web's five-color band styling didn't have a mobile match for. */
export function bandChipStyle(a: number | null, colors: Record<ThemeColor, string>) {
  if (a === null) {
    return { backgroundColor: 'transparent', borderColor: colors.textSecondary, textColor: colors.textSecondary, dashed: true };
  }
  if (a >= 2) return { backgroundColor: colors.evidence, borderColor: colors.evidence, textColor: colors.onStrong, dashed: false };
  if (a === 1) return { backgroundColor: colors.agreeSoft, borderColor: colors.evidence, textColor: colors.evidence, dashed: false };
  if (a === 0) return { backgroundColor: colors.backgroundSelected, borderColor: colors.backgroundSelected, textColor: colors.text, dashed: false };
  if (a === -1) return { backgroundColor: colors.differSoft, borderColor: colors.differ, textColor: colors.differ, dashed: false };
  return { backgroundColor: colors.differ, borderColor: colors.differ, textColor: colors.onStrong, dashed: false };
}
