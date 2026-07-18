import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { langFrom, t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

/* MODPA privacy notice (Md. Code, Com. Law §14-4601 et seq.). Long-form legal
   copy lives here rather than in the i18n dict. DRAFT pending counsel review
   (COUNSEL-REVIEW.md category C) — the banner below says so until that gate
   clears. English controls; Spanish is a convenience translation. */

function H({ children }: { children: React.ReactNode }) {
  return <div className="grouph" style={{ marginTop: "1.1rem" }}>{children}</div>;
}
function P({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: "0.92rem", margin: "0.4rem 0" }}>{children}</p>;
}

function EnglishNotice({ lang }: { lang: string }) {
  return (
    <>
      <H>1 · Who we are</H>
      <P>
        VoteRight is a civic-information platform piloting in Montgomery County, Maryland.
        This notice explains what personal data the platform processes, why, and the rights
        Maryland residents have under the Maryland Online Data Privacy Act (MODPA, Md. Code,
        Com. Law §14-4601 et seq., effective October 1, 2025, applying to processing on and
        after April 1, 2026).
      </P>

      <H>2 · What we collect — and what we deliberately do not</H>
      <P>
        There are no accounts. Your identity on VoteRight is an anonymous browser cookie
        (<code>vr_uid</code>). We collect: an optional display name; your policy priorities in
        your own words (private by default); your civic participation (arguments, seconds,
        proposals, campaign support — public acts, attributed by design); private signals
        (agreement votes, referendum ballots) handled as described in section 4; and your
        self-attested residence <em>jurisdiction</em>.
      </P>
      <P>
        We deliberately do not collect: your name (unless you set one), email address, phone
        number, or precise location. <strong>Your street address is never stored</strong> — at
        verification it is format-checked, resolved to a jurisdiction (e.g., “Montgomery
        County” or “City of Rockville”), and discarded; only the jurisdiction identifier is
        kept. It is never matched against any voter file. There are no third-party trackers,
        no analytics scripts, and no advertising technology on any page.
      </P>

      <H>3 · Purposes and minimization</H>
      <P>
        Everything we collect exists to provide the service you ask for — showing your
        ballot, computing your candidate matches, and letting you participate in debates and
        advisory referenda. We do not use your data for anything else. We do not sell
        personal data, we do not serve targeted advertising, and we do not profile you in
        ways that produce legal or similarly significant effects. Because of this, browser
        opt-out signals such as Global Privacy Control ask us to stop things we never do.
      </P>

      <H>4 · Public acts, private signals, and retention</H>
      <P>
        Every action is labeled at the moment you take it. <strong>Public acts</strong>{" "}
        (posting an argument, seconding a proposal, supporting an accountability campaign)
        are civic speech, attributed and persistent — like signing a public petition.{" "}
        <strong>Private signals</strong> are different: referendum ballots are stored against
        a one-time token, never your name, and after a result is certified the token’s link
        to you is permanently severed; per-argument agreement votes and procedural votes are
        deleted when the debate closes, leaving only anonymous tallies. Your policy
        priorities are private to you and deleted on request.
      </P>

      <H>5 · Who processes data for us</H>
      <P>
        Two infrastructure processors, both in the United States: Vercel, Inc. (application
        hosting) and Neon, Inc. (database, US East region). No other party receives personal
        data. We disclose data only if legally compelled — and the ballot-secrecy design in
        section 4 means even a compelled disclosure of the database cannot reconstruct who
        voted which way after certification.
      </P>

      <H>6 · Sensitive data</H>
      <P>
        We do not collect the categories MODPA defines as sensitive (health data, biometric
        or genetic data, precise geolocation, racial or ethnic origin, religious beliefs,
        sex life or sexual orientation, citizenship or immigration status, national origin,
        or children’s data). Your policy priorities are political opinions — not “sensitive
        data” under MODPA — but we treat them to a stricter standard anyway: private by
        default, never sold or shared, deleted on request.
      </P>

      <H>7 · Your rights and how to use them</H>
      <P>
        Maryland residents may: <strong>access</strong> the personal data we hold about
        them; <strong>correct</strong> inaccuracies; <strong>delete</strong> their data;
        obtain a <strong>portable copy</strong>; and opt out of sale, targeted advertising,
        and significant profiling (none of which we do). Submit any request through the{" "}
        <Link href={`/privacy/request?lang=${lang}`}>in-app privacy request form</Link> — no
        email or account needed; the request is tied to the same anonymous cookie identity
        the data is. We respond within 45 days (extendable once by 45 days for complex
        requests, in which case we tell you). Exercising rights never affects the service
        you receive.
      </P>
      <P>
        <strong>Deletion, precisely:</strong> your identity is pseudonymized, your
        priorities and private signals are removed, and your ballot-token links are severed.
        Public civic acts (arguments you posted, proposals you seconded) remain — as
        attributed public speech becomes “Resident” — the same way a signed petition does
        not un-sign when you move away.
      </P>

      <H>8 · Appeals</H>
      <P>
        If we deny a request, you may appeal through the same form (choose “appeal” on the
        denied request); we decide appeals within 60 days. If you are dissatisfied with the
        outcome, you may contact the Maryland Attorney General’s Consumer Protection
        Division (marylandattorneygeneral.gov).
      </P>

      <H>9 · Children</H>
      <P>VoteRight is a civic platform for voters and is not directed at children.</P>

      <H>10 · Changes and status</H>
      <P>
        This notice changes only by being republished here with a new date. While the pilot
        carries fictional sample data (all candidates and positions are clearly labeled
        fictional), the practices described above are already in force for the data of real
        visitors. English controls; the Spanish version is provided for convenience.
      </P>
      <P>Version: draft v0.1 · July 18, 2026</P>
    </>
  );
}

function SpanishNotice({ lang }: { lang: string }) {
  return (
    <>
      <H>1 · Quiénes somos</H>
      <P>
        VoteRight es una plataforma de información cívica en fase piloto en el condado de
        Montgomery, Maryland. Este aviso explica qué datos personales procesa la plataforma,
        por qué, y los derechos de los residentes de Maryland bajo la Ley de Privacidad de
        Datos en Línea de Maryland (MODPA, Md. Code, Com. Law §14-4601 y ss., vigente desde
        el 1 de octubre de 2025, aplicable al procesamiento desde el 1 de abril de 2026).
      </P>

      <H>2 · Qué recopilamos — y qué deliberadamente no</H>
      <P>
        No hay cuentas. Tu identidad en VoteRight es una cookie anónima del navegador
        (<code>vr_uid</code>). Recopilamos: un nombre visible opcional; tus prioridades de
        política en tus propias palabras (privadas por defecto); tu participación cívica
        (argumentos, apoyos, propuestas — actos públicos, atribuidos por diseño); señales
        privadas (votos de acuerdo, papeletas de referendo) tratadas como describe la
        sección 4; y tu <em>jurisdicción</em> de residencia autodeclarada.
      </P>
      <P>
        Deliberadamente no recopilamos: tu nombre (salvo que lo configures), correo
        electrónico, teléfono ni ubicación precisa. <strong>Tu dirección nunca se
        almacena</strong> — al verificar, se comprueba su formato, se resuelve a una
        jurisdicción (p. ej., “Condado de Montgomery” o “Ciudad de Rockville”) y se
        descarta; solo se conserva el identificador de la jurisdicción. Nunca se compara con
        ningún padrón electoral. No hay rastreadores de terceros, ni analítica, ni
        tecnología publicitaria en ninguna página.
      </P>

      <H>3 · Fines y minimización</H>
      <P>
        Todo lo que recopilamos existe para prestar el servicio que pides — mostrar tu
        boleta, calcular tus coincidencias y permitirte participar en debates y referendos
        consultivos. No vendemos datos personales, no mostramos publicidad dirigida y no
        hacemos perfilados con efectos legales o similares. Por eso, señales como Global
        Privacy Control nos piden detener cosas que nunca hacemos.
      </P>

      <H>4 · Actos públicos, señales privadas y retención</H>
      <P>
        Cada acción se etiqueta en el momento de realizarla. Los <strong>actos
        públicos</strong> (publicar un argumento, apoyar una propuesta o campaña) son
        expresión cívica, atribuida y persistente — como firmar una petición pública. Las{" "}
        <strong>señales privadas</strong> son distintas: las papeletas se guardan contra una
        ficha de un solo uso, nunca tu nombre, y tras certificar el resultado el vínculo se
        elimina de forma permanente; los votos de acuerdo y procedimentales se borran al
        cerrar el debate, dejando solo conteos anónimos. Tus prioridades son privadas y se
        eliminan a petición.
      </P>

      <H>5 · Quién procesa datos por nosotros</H>
      <P>
        Dos procesadores de infraestructura, ambos en Estados Unidos: Vercel, Inc.
        (alojamiento) y Neon, Inc. (base de datos, región US East). Ninguna otra parte
        recibe datos personales. Solo divulgamos datos si la ley nos obliga — y el diseño de
        secreto de papeleta de la sección 4 hace que ni una divulgación forzada de la base
        de datos pueda reconstruir quién votó qué tras la certificación.
      </P>

      <H>6 · Datos sensibles</H>
      <P>
        No recopilamos las categorías que MODPA define como sensibles (salud, datos
        biométricos o genéticos, geolocalización precisa, origen racial o étnico, creencias
        religiosas, vida sexual u orientación, ciudadanía o estatus migratorio, origen
        nacional, datos de menores). Tus prioridades son opiniones políticas — no “datos
        sensibles” bajo MODPA — pero las tratamos con un estándar más estricto de todos
        modos: privadas por defecto, nunca vendidas ni compartidas, eliminadas a petición.
      </P>

      <H>7 · Tus derechos y cómo ejercerlos</H>
      <P>
        Los residentes de Maryland pueden: <strong>acceder</strong> a sus datos;{" "}
        <strong>corregir</strong> inexactitudes; <strong>eliminar</strong> sus datos; obtener
        una <strong>copia portable</strong>; y excluirse de venta, publicidad dirigida y
        perfilado significativo (nada de lo cual hacemos). Envía cualquier solicitud con el{" "}
        <Link href={`/privacy/request?lang=${lang}`}>formulario de solicitud de privacidad</Link>{" "}
        — sin correo ni cuenta; la solicitud queda ligada a la misma identidad anónima que
        los datos. Respondemos en 45 días (prorrogables una vez por 45 días en casos
        complejos, avisándote). Ejercer tus derechos nunca afecta el servicio.
      </P>
      <P>
        <strong>La eliminación, con precisión:</strong> tu identidad se seudonimiza, tus
        prioridades y señales privadas se eliminan y los vínculos de tus fichas de papeleta
        se cortan. Los actos cívicos públicos permanecen — atribuidos a “Resident” — igual
        que una petición firmada no se des-firma al mudarte.
      </P>

      <H>8 · Apelaciones</H>
      <P>
        Si denegamos una solicitud, puedes apelar con el mismo formulario (elige “apelación”
        sobre la solicitud denegada); decidimos apelaciones en 60 días. Si no estás
        conforme, puedes contactar a la División de Protección al Consumidor del Fiscal
        General de Maryland (marylandattorneygeneral.gov).
      </P>

      <H>9 · Menores</H>
      <P>VoteRight es una plataforma cívica para votantes y no está dirigida a menores.</P>

      <H>10 · Cambios y estado</H>
      <P>
        Este aviso solo cambia al republicarse aquí con nueva fecha. Mientras el piloto usa
        datos de muestra ficticios (todos los candidatos están claramente marcados como
        ficticios), las prácticas descritas ya rigen para los datos de visitantes reales. La
        versión en inglés prevalece; esta traducción se ofrece por conveniencia.
      </P>
      <P>Versión: borrador v0.1 · 18 de julio de 2026</P>
    </>
  );
}

export default async function PrivacyPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const lang = langFrom((await searchParams).lang);
  const d = t(lang);
  return (
    <>
      <SiteHeader lang={lang} path="/privacy" />
      <div className="pagepad">
        <div className="pagetitle">{d.priv_h}</div>
        <div className="disclosure">
          <span className="tag">{lang === "es" ? "Borrador" : "Draft"}</span>
          <span>{d.priv_draft_note}</span>
        </div>
        {lang === "es" ? <SpanishNotice lang={lang} /> : <EnglishNotice lang={lang} />}
        <Link className="btn" href={`/privacy/request?lang=${lang}`} style={{ marginTop: "1rem" }}>
          {d.priv_request_btn}
        </Link>
      </div>
    </>
  );
}
