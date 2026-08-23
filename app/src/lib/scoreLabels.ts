// Shared per-axis agreement display mapping -- one source of truth for how a
// scoring-engine agreement value (-2..2, or null for "no usable evidence")
// maps to a CSS class and an i18n label key. Used by the candidate detail
// page's full topic breakdown and the Matches screen's tappable per-axis
// dots, so the two surfaces can never drift out of sync on what a color or
// label means.
export const BAND_KEY = (a: number | null) =>
  a === null ? "none" : (String(a) as "2" | "1" | "0" | "-1" | "-2");

export const BAND_CLASS = (a: number | null) =>
  a === null
    ? "bnull"
    : ({ 2: "b2", 1: "b1", 0: "b0", "-1": "bm1", "-2": "bm2" } as Record<string, string>)[String(a)];

export const DOT_CLASS = (a: number | null) =>
  a === null
    ? "dnull"
    : ({ 2: "d2", 1: "d1", 0: "d0", "-1": "dm1", "-2": "dm2" } as Record<string, string>)[String(a)];

export const SRC_LABEL: Record<string, { en: string; es: string }> = {
  voting_record_inferred: { en: "Recorded vote", es: "Voto registrado" },
  questionnaire: { en: "Questionnaire", es: "Cuestionario" },
  campaign_site: { en: "Campaign site", es: "Sitio de campaña" },
  debate_transcript: { en: "Debate transcript", es: "Transcripción de debate" },
  interview: { en: "Interview", es: "Entrevista" },
};
