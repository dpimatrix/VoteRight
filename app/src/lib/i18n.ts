// Bilingual from day one (ARCHITECTURE.md §11). Pages read ?lang=; en is default.
export type Lang = "en" | "es";

export function langFrom(v: string | string[] | undefined): Lang {
  return v === "es" ? "es" : "en";
}

const DICT = {
  en: {
    county: "Montgomery County, MD",
    tagline: "Matched to what you actually want",
    ballot_h: "Every seat your address elects",
    ballot_note:
      "Unscored seats stay on the list — an incomplete ballot must never look complete.",
    tracked: "Match available",
    later: "Not yet tracked",
    judicial: "Different treatment",
    jud_note:
      "Judges can’t campaign on issues, so this seat gets background and bar evaluations — never a match score.",
    on_ballot: "On your ballot in 2026",
    set_prios: "Set my priorities",
    prio_h: "What matters to you?",
    prio_p:
      "Pick at least 3 issues. Choose your side of each question and set how much it matters.",
    prio_priv:
      "Private to you — used only to compute your matches. Deleted if you delete your account.",
    weight: ["", "Barely matters", "Matters a little", "Matters", "Matters a lot", "Non-negotiable"],
    see_matches: "See my matches",
    need_more: "Pick at least 3 issues to continue",
    matches_h: "Your matches",
    based_on: "Based on",
    of_your: "of your priorities",
    sample:
      "Prototype sample — fictional candidates, illustrative sources. Real data lands with the data-operations phase.",
    incumbent: "Incumbent",
    seats4: "This contest elects 4 councilmembers — you can vote for up to 4.",
    open_seat: "Open seat — the current County Executive is term-limited.",
    ov: {
      strong: "Strong match",
      good: "Good match",
      mixed: "Mixed",
      weak: "Differs from your priorities",
      insufficient: "Not enough information",
    },
    band: {
      "2": "Aligns strongly",
      "1": "Leans aligned",
      "0": "Mixed",
      "-1": "Leans opposed",
      "-2": "Opposed",
      none: "No public position",
    },
    deal: "Conflicts with one of your top priorities",
    insuff_note:
      "Too few public positions found to score fairly. Shown last, not hidden — silence is information too.",
    silence_row:
      "No public position found. Not counted for or against — shown so silence stays visible.",
    you_said: "You said:",
    archived: "archived",
    conflict:
      "Their recorded votes and statements differ on this — the vote governs the score; both are shown.",
    money_h: "Outside money in this race",
    money_none: "No independent expenditures on file for this candidacy.",
    endorse_h: "Endorsements",
    endorse_none: "No endorsements on file.",
    supporting: "supporting",
    opposing: "opposing",
    method:
      "How scoring works: published methodology, human-confirmed evidence, bands not numbers.",
    lang_other: "Español",
    nav_ballot: "Ballot",
    nav_prios: "Priorities",
    nav_matches: "Matches",
  },
  es: {
    county: "Condado de Montgomery, MD",
    tagline: "Compatibilidad con lo que tú realmente quieres",
    ballot_h: "Cada cargo que elige tu dirección",
    ballot_note:
      "Los cargos sin evaluar permanecen en la lista — una boleta incompleta nunca debe parecer completa.",
    tracked: "Coincidencia disponible",
    later: "Aún sin seguimiento",
    judicial: "Tratamiento distinto",
    jud_note:
      "Los jueces no pueden hacer campaña sobre temas; este cargo recibe trayectoria y evaluaciones — nunca una puntuación.",
    on_ballot: "En tu boleta en 2026",
    set_prios: "Definir mis prioridades",
    prio_h: "¿Qué te importa?",
    prio_p:
      "Elige al menos 3 temas. Escoge tu lado de cada pregunta y decide cuánto importa.",
    prio_priv:
      "Privado — solo se usa para calcular tus coincidencias. Se elimina si borras tu cuenta.",
    weight: ["", "Casi no importa", "Importa poco", "Importa", "Importa mucho", "Innegociable"],
    see_matches: "Ver mis coincidencias",
    need_more: "Elige al menos 3 temas para continuar",
    matches_h: "Tus coincidencias",
    based_on: "Basado en",
    of_your: "de tus prioridades",
    sample:
      "Prototipo de muestra — candidatos ficticios, fuentes ilustrativas. Los datos reales llegan con la fase de operaciones de datos.",
    incumbent: "En el cargo",
    seats4: "Esta contienda elige 4 concejales — puedes votar hasta por 4.",
    open_seat: "Escaño abierto — el Ejecutivo actual llegó a su límite de mandatos.",
    ov: {
      strong: "Coincidencia fuerte",
      good: "Buena coincidencia",
      mixed: "Mixto",
      weak: "Difiere de tus prioridades",
      insufficient: "Información insuficiente",
    },
    band: {
      "2": "Coincide plenamente",
      "1": "Tiende a coincidir",
      "0": "Posición mixta",
      "-1": "Tiende a diferir",
      "-2": "Difiere claramente",
      none: "Sin posición pública",
    },
    deal: "Choca con una de tus prioridades principales",
    insuff_note:
      "Muy pocas posiciones públicas para calificar con justicia. Se muestra al final, no se oculta — el silencio también es información.",
    silence_row:
      "No se encontró posición pública. No cuenta ni a favor ni en contra — se muestra para que el silencio sea visible.",
    you_said: "Dijiste:",
    archived: "archivado",
    conflict:
      "Sus votos registrados y sus declaraciones difieren aquí — el voto gobierna la puntuación; se muestran ambos.",
    money_h: "Dinero externo en esta contienda",
    money_none: "No hay gastos independientes registrados para esta candidatura.",
    endorse_h: "Respaldos",
    endorse_none: "No hay respaldos registrados.",
    supporting: "a favor",
    opposing: "en contra",
    method:
      "Cómo funciona la puntuación: metodología publicada, evidencia confirmada por humanos, bandas en lugar de números.",
    lang_other: "English",
    nav_ballot: "Boleta",
    nav_prios: "Prioridades",
    nav_matches: "Coincidencias",
  },
} as const;

export type Dict = (typeof DICT)["en"];
export function t(lang: Lang): Dict {
  return DICT[lang] as Dict;
}
