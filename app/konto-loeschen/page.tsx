import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Konto löschen | Dipera",
  description:
    "Informationen zur Löschung eines Dipera-Benutzerkontos und der zugehörigen Daten.",
};

const sectionHeading =
  "mt-3 break-words text-lg font-semibold tracking-tight text-slate-950 sm:text-2xl";

const paragraph =
  "mt-4 break-words text-[15px] leading-7 text-slate-700 sm:text-base";

const linkStyle =
  "break-words font-medium text-blue-700 underline decoration-blue-200 underline-offset-4 transition hover:text-blue-900 hover:decoration-blue-500";

function SectionNumber({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-sm font-bold text-blue-700">
      {children}
    </div>
  );
}

export default function KontoLoeschenPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="relative overflow-hidden bg-[#102B4C]">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-40 left-1/4 h-80 w-80 rounded-full bg-blue-700/10 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative mx-auto max-w-5xl px-5 pb-12 pt-8 sm:px-8 sm:pb-20 sm:pt-12">
          <a
            href="/"
            className="inline-block"
            aria-label="Dipera Startseite"
          >
            <img
              src="/logo/dipera-logo-light.png"
              alt="Dipera"
              className="h-9 w-auto sm:h-11"
            />
          </a>

          <div className="mt-10 max-w-3xl sm:mt-16">
            <div className="mb-4 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-blue-200 sm:mb-5">
              Benutzerkonto
            </div>

            <h1 className="font-bold leading-[1.08] tracking-tight text-white">
              <span className="block text-4xl sm:text-5xl lg:text-6xl">
                Konto löschen
              </span>
            </h1>

            <p className="mt-5 max-w-2xl text-[15px] leading-7 text-slate-300 sm:mt-6 sm:text-lg">
              Hier erfährst du, wie du die Löschung deines
              Dipera-Benutzerkontos und der damit verbundenen Daten anfordern
              kannst.
            </p>

            <div className="mt-7 flex items-center gap-2 text-sm text-slate-400 sm:mt-8">
              <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" />
              <span>Stand: September 2026</span>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-5xl px-3 py-5 sm:px-8 sm:py-12">
        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="min-w-0 px-5 py-7 sm:px-10 sm:py-12 lg:px-14">
            {/* 1 */}
            <section>
              <SectionNumber>01</SectionNumber>

              <h2 className={sectionHeading}>
                Löschung deines Dipera-Kontos anfordern
              </h2>

              <p className={paragraph}>
                Wenn du ein Dipera-Benutzerkonto besitzt, kannst du die
                Löschung deines Benutzerkontos und der damit verbundenen
                Zugangsdaten per E-Mail anfordern.
              </p>

              <p className={paragraph}>
                Sende deine Anfrage von der mit deinem Dipera-Konto
                verbundenen E-Mail-Adresse an:
              </p>

              <div className="mt-5 break-words rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 leading-7 text-slate-700 sm:px-5">
                <a
                  href="mailto:support@dipera.de?subject=L%C3%B6schung%20meines%20Dipera-Kontos"
                  className={linkStyle}
                >
                  support@dipera.de
                </a>
              </div>

              <p className={paragraph}>
                Gib in der Nachricht an, dass du die Löschung deines
                Dipera-Benutzerkontos beantragst. Wir können zur Sicherheit
                zusätzliche Angaben anfordern, wenn dies erforderlich ist, um
                deine Identität bzw. die Berechtigung zur Löschanfrage zu
                überprüfen.
              </p>
            </section>

            <div className="my-8 border-t border-slate-100 sm:my-10" />

            {/* 2 */}
            <section>
              <SectionNumber>02</SectionNumber>

              <h2 className={sectionHeading}>Welche Daten werden gelöscht?</h2>

              <p className={paragraph}>
                Nach erfolgreicher Prüfung der Löschanfrage werden nicht mehr
                erforderliche Daten des persönlichen Benutzerzugangs gelöscht
                oder dauerhaft vom Benutzerkonto getrennt.
              </p>

              <p className={paragraph}>
                Dazu können insbesondere Authentifizierungs- und Zugangsdaten,
                Benutzerzuordnungen, nicht mehr erforderliche Push-Kennungen
                sowie weitere ausschließlich für den Benutzerzugang benötigte
                technische Daten gehören.
              </p>
            </section>

            <div className="my-8 border-t border-slate-100 sm:my-10" />

            {/* 3 */}
            <section>
              <SectionNumber>03</SectionNumber>

              <h2 className={sectionHeading}>
                Beschäftigtendaten und betriebliche Aufzeichnungen
              </h2>

              <p className={paragraph}>
                Ein Dipera-Benutzerkonto kann mit einem Mitarbeiterdatensatz
                eines Unternehmens verbunden sein. Die Löschung des
                persönlichen Benutzerzugangs bedeutet daher nicht
                automatisch, dass sämtliche im Auftrag des Arbeitgebers bzw.
                Unternehmens gespeicherten Beschäftigtendaten gelöscht werden.
              </p>

              <p className={paragraph}>
                Arbeitszeiten, Abwesenheiten, Dienstplandaten,
                Beschäftigungsinformationen, Dokumente sowie
                abrechnungsbezogene Daten können weiterhin gespeichert
                bleiben, soweit das verantwortliche Unternehmen deren weitere
                Aufbewahrung verlangt oder gesetzliche Aufbewahrungs- oder
                Nachweispflichten bestehen.
              </p>

              <p className={paragraph}>
                Für die Löschung solcher Beschäftigtendaten sollte sich der
                Nutzer grundsätzlich an seinen Arbeitgeber bzw. das
                Unternehmen wenden, das Dipera zur Personalverwaltung
                einsetzt. Dieses Unternehmen ist regelmäßig für die
                Verarbeitung dieser Beschäftigtendaten verantwortlich.
              </p>
            </section>

            <div className="my-8 border-t border-slate-100 sm:my-10" />

            {/* 4 */}
            <section>
              <SectionNumber>04</SectionNumber>

              <h2 className={sectionHeading}>
                Aufbewahrung nach einer Löschanfrage
              </h2>

              <p className={paragraph}>
                Daten werden nur weiter gespeichert, soweit dies für den
                jeweiligen Zweck erforderlich ist, gesetzliche
                Aufbewahrungs- oder Nachweispflichten bestehen oder das für
                die Beschäftigtendaten verantwortliche Unternehmen eine
                entsprechende Aufbewahrung verlangt.
              </p>

              <p className={paragraph}>
                Bereits gelöschte Daten können außerdem für die Dauer
                regulärer Sicherungszyklen noch in technischen
                Sicherungskopien enthalten sein. Diese Sicherungskopien dienen
                ausschließlich der Wiederherstellung und werden nicht für
                andere Zwecke verwendet.
              </p>
            </section>

            <div className="my-8 border-t border-slate-100 sm:my-10" />

            {/* 5 */}
            <section>
              <SectionNumber>05</SectionNumber>

              <h2 className={sectionHeading}>Fragen zur Kontolöschung</h2>

              <p className={paragraph}>
                Bei Fragen zur Löschung deines Dipera-Benutzerkontos oder zu
                den damit verbundenen Daten kannst du uns unter{" "}
                <a href="mailto:support@dipera.de" className={linkStyle}>
                  support@dipera.de
                </a>{" "}
                kontaktieren.
              </p>

              <p className={paragraph}>
                Weitere Informationen zur Verarbeitung personenbezogener Daten
                findest du in unserer{" "}
                <a href="/datenschutz" className={linkStyle}>
                  Datenschutzerklärung
                </a>
                .
              </p>
            </section>
          </div>
        </article>

        {/* Footer */}
        <footer className="px-2 py-8 text-center text-sm text-slate-500 sm:py-10">
          <a
            href="/"
            className="font-semibold text-slate-700 transition hover:text-blue-700"
          >
            Dipera
          </a>

          <span className="mx-2 text-slate-300">•</span>
          <span>© 2026</span>

          <p className="mt-2 text-xs leading-5 text-slate-400">
            Personalverwaltung · Zeiterfassung · Dienstplanung
          </p>
        </footer>
      </div>
    </main>
  );
}