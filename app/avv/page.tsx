import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Auftragsverarbeitung | Dipera",
  description:
    "Vertrag zur Auftragsverarbeitung gemäß Art. 28 DSGVO für die Nutzung von Dipera.",
};

const sectionHeading =
  "mt-3 break-words text-lg font-semibold tracking-tight text-slate-950 sm:text-2xl";

const subHeading =
  "mt-6 break-words text-base font-semibold text-slate-900 sm:text-lg";

const paragraph =
  "mt-4 break-words text-[15px] leading-7 text-slate-700 sm:text-base";

const list =
  "mt-4 list-disc space-y-2 pl-5 text-[15px] leading-7 text-slate-700 sm:pl-6 sm:text-base";

function SectionNumber({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-sm font-bold text-blue-700">
      {children}
    </div>
  );
}

function Divider() {
  return <div className="my-8 border-t border-slate-100 sm:my-10" />;
}

function Status({
  children,
  type = "done",
}: {
  children: React.ReactNode;
  type?: "done" | "partial" | "review";
}) {
  const styles = {
    done: "border-emerald-200 bg-emerald-50 text-emerald-800",
    partial: "border-amber-200 bg-amber-50 text-amber-800",
    review: "border-slate-200 bg-slate-100 text-slate-700",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${styles[type]}`}
    >
      {children}
    </span>
  );
}

export default function AvvPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="relative overflow-hidden bg-[#102B4C]">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-blue-400/10 blur-3xl"
          aria-hidden="true"
        />

        <div
          className="pointer-events-none absolute -bottom-40 left-1/4 h-80 w-80 rounded-full bg-blue-700/10 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative mx-auto max-w-5xl px-5 pb-12 pt-8 sm:px-8 sm:pb-20 sm:pt-12">
          <a href="/" className="inline-block" aria-label="Dipera Startseite">
            <img
              src="/logo/dipera-logo-light.png"
              alt="Dipera"
              className="h-9 w-auto sm:h-11"
            />
          </a>

          <div className="mt-10 max-w-3xl sm:mt-16">
            <div className="mb-4 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-blue-200 sm:mb-5">
              Auftragsverarbeitung
            </div>

            <h1 className="font-bold leading-[1.08] tracking-tight text-white">
              <span className="block text-4xl sm:hidden">
                Vertrag zur
                <br />
                Auftrags-
                <br />
                verarbeitung
              </span>

              <span className="hidden sm:block sm:text-5xl lg:text-6xl">
                Vertrag zur Auftragsverarbeitung
              </span>
            </h1>

            <p className="mt-5 max-w-2xl text-[15px] leading-7 text-slate-200 sm:mt-6 sm:text-lg">
              gemäß Art. 28 Datenschutz-Grundverordnung (DSGVO) für die Nutzung
              von Dipera.
            </p>

            <div className="mt-7 flex items-center gap-2 text-sm text-slate-300 sm:mt-8">
              <span className="h-2 w-2 shrink-0 rounded-full bg-blue-400" />
              <span>Stand: 25. September 2026</span>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-5xl px-3 py-5 sm:px-8 sm:py-12">
        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="min-w-0 px-5 py-7 sm:px-10 sm:py-12 lg:px-14">
            {/* Vertragsparteien */}
            <section>
              <SectionNumber>01</SectionNumber>

              <h2 className={sectionHeading}>Vertragsparteien</h2>

              <p className={paragraph}>
                Dieser Vertrag zur Auftragsverarbeitung („AVV“) wird geschlossen
                zwischen dem Kunden, der mit Dipera einen Nutzungsvertrag
                abschließt und diesen AVV im Rahmen des Vertragsschlusses
                elektronisch akzeptiert, nachfolgend „Verantwortlicher“, und:
              </p>

              <address className="mt-5 break-words rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 not-italic leading-7 text-slate-700 sm:px-5">
                <span className="font-semibold text-slate-900">
                  Nesar Khalil
                </span>
                <br />
                Hauptstraße 5
                <br />
                73760 Ostfildern
                <br />
                Deutschland
                <br />
                <span className="mt-2 inline-block">
                  E-Mail:{" "}
                  <a
                    href="mailto:support@dipera.de"
                    className="font-medium text-blue-700 underline decoration-blue-200 underline-offset-4 transition hover:text-blue-900"
                  >
                    support@dipera.de
                  </a>
                </span>
              </address>

              <p className={paragraph}>
                nachfolgend „Auftragsverarbeiter“.
              </p>

              <p className={paragraph}>
                Die Identität des Verantwortlichen ergibt sich aus den beim
                Vertragsschluss hinterlegten Kunden- und Unternehmensdaten.
                Dieser Vertrag konkretisiert die datenschutzrechtlichen
                Pflichten der Parteien für Verarbeitungen personenbezogener
                Daten, die der Auftragsverarbeiter im Rahmen der Bereitstellung
                von Dipera im Auftrag des Verantwortlichen durchführt.
              </p>
            </section>

            <Divider />

            {/* 2 */}
            <section>
              <SectionNumber>02</SectionNumber>

              <h2 className={sectionHeading}>
                Gegenstand, Umfang und Dauer
              </h2>

              <p className={paragraph}>
                <strong>2.1</strong> Der Auftragsverarbeiter stellt dem
                Verantwortlichen die Software „Dipera“ zur Personalverwaltung,
                Arbeitszeiterfassung, Dienstplanung, Abwesenheitsverwaltung,
                Stundenkontenführung sowie zur Vorbereitung von Lohn- und
                DATEV-Prozessen zur Verfügung.
              </p>

              <p className={paragraph}>
                <strong>2.2</strong> Gegenstand, Art, Zweck, Kategorien
                personenbezogener Daten und betroffene Personen ergeben sich
                ergänzend aus Anlage 1.
              </p>

              <p className={paragraph}>
                <strong>2.3</strong> Die Verarbeitung erfolgt für die Dauer des
                zugrunde liegenden Nutzungs- bzw. Vertragsverhältnisses sowie
                darüber hinaus nur, soweit eine weitere Speicherung zur
                vertragsgemäßen Rückgabe oder Löschung, zur Sicherung von
                Ansprüchen oder aufgrund gesetzlicher Pflichten erforderlich
                ist.
              </p>

              <p className={paragraph}>
                <strong>2.4</strong> Dieser AVV gilt nur für
                Verarbeitungsvorgänge, bei denen Dipera personenbezogene Daten
                im Auftrag des Verantwortlichen verarbeitet. Für eigene
                Verarbeitungstätigkeiten des Auftragsverarbeiters, insbesondere
                eigene Vertrags-, Abrechnungs-, Sicherheits- oder
                Supportprozesse, gilt dieser AVV nur, soweit Dipera dabei
                tatsächlich als Auftragsverarbeiter handelt.
              </p>
            </section>

            <Divider />

            {/* 3 */}
            <section>
              <SectionNumber>03</SectionNumber>

              <h2 className={sectionHeading}>
                Weisungsgebundene Verarbeitung
              </h2>

              <p className={paragraph}>
                <strong>3.1</strong> Der Auftragsverarbeiter verarbeitet
                personenbezogene Daten ausschließlich auf dokumentierte Weisung
                des Verantwortlichen, soweit nicht eine gesetzliche
                Verpflichtung zu einer Verarbeitung besteht. In diesem Fall
                informiert der Auftragsverarbeiter den Verantwortlichen vor der
                Verarbeitung über die betreffende rechtliche Anforderung,
                soweit dies gesetzlich zulässig ist.
              </p>

              <p className={paragraph}>
                <strong>3.2</strong> Die Nutzung und Konfiguration der
                Funktionen von Dipera durch hierzu berechtigte Nutzer des
                Verantwortlichen gilt als dokumentierte Weisung innerhalb des
                vereinbarten Leistungsumfangs.
              </p>

              <p className={paragraph}>
                <strong>3.3</strong> Hält der Auftragsverarbeiter eine Weisung
                für datenschutzrechtlich unzulässig, informiert er den
                Verantwortlichen unverzüglich. Die Ausführung der betroffenen
                Weisung darf bis zur Klärung ausgesetzt werden.
              </p>
            </section>

            <Divider />

            {/* 4 */}
            <section>
              <SectionNumber>04</SectionNumber>

              <h2 className={sectionHeading}>
                Pflichten des Verantwortlichen
              </h2>

              <p className={paragraph}>
                <strong>4.1</strong> Der Verantwortliche ist für die
                Rechtmäßigkeit der Verarbeitung, die Auswahl der in Dipera
                verarbeiteten Daten, die Wahrung der Rechte betroffener
                Personen und die Erteilung zulässiger Weisungen verantwortlich.
              </p>

              <p className={paragraph}>
                <strong>4.2</strong> Der Verantwortliche stellt insbesondere
                sicher, dass für die von ihm aktivierten Verarbeitungen –
                einschließlich Arbeitszeiterfassung, Standortprüfung,
                Abwesenheiten, Mitarbeiterdokumente und Lohninformationen –
                eine geeignete Rechtsgrundlage besteht und erforderliche
                Informationspflichten gegenüber Beschäftigten erfüllt werden.
              </p>

              <p className={paragraph}>
                <strong>4.3</strong> Der Verantwortliche hat Freitextfelder und
                Upload-Funktionen so zu verwenden, dass nur für den jeweiligen
                Zweck erforderliche Daten verarbeitet werden. Dies gilt
                besonders für Gesundheitsdaten und andere besondere Kategorien
                personenbezogener Daten.
              </p>
            </section>

            <Divider />

            {/* 5 */}
            <section>
              <SectionNumber>05</SectionNumber>

              <h2 className={sectionHeading}>
                Vertraulichkeit und Zugriffsberechtigung
              </h2>

              <p className={paragraph}>
                <strong>5.1</strong> Der Auftragsverarbeiter stellt sicher,
                dass Personen, die zur Verarbeitung personenbezogener Daten
                befugt sind, zur Vertraulichkeit verpflichtet sind oder einer
                angemessenen gesetzlichen Verschwiegenheitspflicht unterliegen.
              </p>

              <p className={paragraph}>
                <strong>5.2</strong> Zugriff auf Kundendaten darf nur erhalten,
                wer ihn zur Erfüllung der vereinbarten Leistungen, zur
                Fehlerbehebung, zur Sicherheit oder zur Erfüllung gesetzlicher
                Pflichten benötigt. Berechtigungen sind nach dem Grundsatz der
                Erforderlichkeit zu vergeben.
              </p>
            </section>

            <Divider />

            {/* 6 */}
            <section>
              <SectionNumber>06</SectionNumber>

              <h2 className={sectionHeading}>Sicherheit der Verarbeitung</h2>

              <p className={paragraph}>
                <strong>6.1</strong> Der Auftragsverarbeiter trifft unter
                Berücksichtigung des Stands der Technik, der
                Implementierungskosten sowie Art, Umfang, Umständen und Zwecken
                der Verarbeitung angemessene technische und organisatorische
                Maßnahmen gemäß Art. 32 DSGVO.
              </p>

              <p className={paragraph}>
                <strong>6.2</strong> Die derzeit umgesetzten Maßnahmen sind in
                Anlage 2 beschrieben. Die Maßnahmen dürfen technisch
                weiterentwickelt werden, sofern das vereinbarte Schutzniveau
                nicht abgesenkt wird.
              </p>

              <p className={paragraph}>
                <strong>6.3</strong> Der Auftragsverarbeiter informiert den
                Verantwortlichen, wenn wesentliche Änderungen der
                Sicherheitsarchitektur das für die Auftragsverarbeitung
                relevante Schutzniveau betreffen.
              </p>
            </section>

            <Divider />

            {/* 7 */}
            <section>
              <SectionNumber>07</SectionNumber>

              <h2 className={sectionHeading}>
                Unterstützung des Verantwortlichen
              </h2>

              <p className={paragraph}>
                <strong>7.1</strong> Der Auftragsverarbeiter unterstützt den
                Verantwortlichen im Rahmen der verfügbaren Informationen und
                unter Berücksichtigung der Art der Verarbeitung bei der
                Erfüllung von Anfragen betroffener Personen.
              </p>

              <p className={paragraph}>
                <strong>7.2</strong> Er unterstützt den Verantwortlichen
                angemessen bei Pflichten nach Art. 32 bis 36 DSGVO,
                insbesondere bei der Sicherheit der Verarbeitung, der Bewertung
                und Meldung von Datenschutzverletzungen sowie – soweit
                erforderlich – Datenschutz-Folgenabschätzungen.
              </p>

              <p className={paragraph}>
                <strong>7.3</strong> Geht eine Anfrage einer betroffenen Person
                unmittelbar beim Auftragsverarbeiter ein und betrifft sie Daten,
                die ausschließlich im Auftrag eines Kunden verarbeitet werden,
                wird die Anfrage grundsätzlich an den Verantwortlichen
                verwiesen oder weitergeleitet, soweit dies sachgerecht und
                zulässig ist.
              </p>
            </section>

            <Divider />

            {/* 8 */}
            <section>
              <SectionNumber>08</SectionNumber>

              <h2 className={sectionHeading}>Datenschutzverletzungen</h2>

              <p className={paragraph}>
                <strong>8.1</strong> Der Auftragsverarbeiter informiert den
                Verantwortlichen unverzüglich, nachdem ihm eine Verletzung des
                Schutzes personenbezogener Daten bekannt geworden ist, soweit
                Kundendaten des Verantwortlichen betroffen sind.
              </p>

              <p className={paragraph}>
                <strong>8.2</strong> Die Mitteilung enthält, soweit zu diesem
                Zeitpunkt verfügbar, die zur Bewertung des Vorfalls
                erforderlichen Informationen, insbesondere Art des Vorfalls,
                betroffene Daten und Personengruppen, bekannte oder
                wahrscheinliche Folgen sowie ergriffene oder vorgesehene
                Abhilfemaßnahmen.
              </p>

              <p className={paragraph}>
                <strong>8.3</strong> Noch nicht verfügbare Informationen können
                ohne unangemessene Verzögerung nachgereicht werden.
              </p>
            </section>

            <Divider />

            {/* 9 */}
            <section>
              <SectionNumber>09</SectionNumber>

              <h2 className={sectionHeading}>Unterauftragnehmer</h2>

              <p className={paragraph}>
                <strong>9.1</strong> Der Verantwortliche erteilt dem
                Auftragsverarbeiter eine allgemeine Genehmigung, die in Anlage
                3 genannten Unterauftragnehmer für die dort beschriebenen
                Zwecke einzusetzen.
              </p>

              <p className={paragraph}>
                <strong>9.2</strong> Der Auftragsverarbeiter informiert den
                Verantwortlichen über beabsichtigte wesentliche Änderungen der
                Unterauftragnehmerliste, insbesondere über die Hinzunahme oder
                Ersetzung eines Unterauftragnehmers. Der Verantwortliche kann
                aus berechtigten datenschutzrechtlichen Gründen innerhalb einer
                angemessenen Frist widersprechen.
              </p>

              <p className={paragraph}>
                <strong>9.3</strong> Der Auftragsverarbeiter verpflichtet
                Unterauftragnehmer vertraglich zu Datenschutzpflichten, die dem
                für die jeweilige Verarbeitung erforderlichen Schutzniveau
                entsprechen.
              </p>

              <p className={paragraph}>
                <strong>9.4</strong> Der Auftragsverarbeiter bleibt gegenüber
                dem Verantwortlichen für die Erfüllung der Pflichten des
                eingesetzten Unterauftragnehmers im Rahmen der gesetzlichen
                Vorgaben verantwortlich.
              </p>
            </section>

            <Divider />

            {/* 10 */}
            <section>
              <SectionNumber>10</SectionNumber>

              <h2 className={sectionHeading}>Drittlandübermittlungen</h2>

              <p className={paragraph}>
                <strong>10.1</strong> Soweit personenbezogene Daten außerhalb
                des Europäischen Wirtschaftsraums verarbeitet oder zugänglich
                gemacht werden, erfolgt dies nur unter Beachtung der
                Voraussetzungen der Art. 44 ff. DSGVO.
              </p>

              <p className={paragraph}>
                <strong>10.2</strong> Als geeignete Garantien können
                insbesondere ein Angemessenheitsbeschluss oder die von der
                Europäischen Kommission erlassenen Standardvertragsklauseln
                einschließlich erforderlicher ergänzender Maßnahmen dienen.
              </p>

              <p className={paragraph}>
                <strong>10.3</strong> Die primäre Datenbankregion des
                Dipera-Supabase-Projekts ist West EU (Irland), AWS-Region
                eu-west-1. Dies schließt nicht aus, dass einzelne eingesetzte
                Anbieter oder deren Unterauftragnehmer Daten außerhalb des EWR
                verarbeiten.
              </p>
            </section>

            <Divider />

            {/* 11 */}
            <section>
              <SectionNumber>11</SectionNumber>

              <h2 className={sectionHeading}>Nachweise und Kontrollen</h2>

              <p className={paragraph}>
                <strong>11.1</strong> Der Auftragsverarbeiter stellt dem
                Verantwortlichen auf angemessene Anfrage die Informationen zur
                Verfügung, die erforderlich sind, um die Einhaltung der
                Pflichten aus Art. 28 DSGVO nachzuweisen.
              </p>

              <p className={paragraph}>
                <strong>11.2</strong> Soweit Dokumentationen,
                Zertifizierungen, Prüfberichte oder vergleichbare Nachweise eine
                angemessene Prüfung ermöglichen, sollen diese vorrangig genutzt
                werden.
              </p>

              <p className={paragraph}>
                <strong>11.3</strong> Weitergehende Prüfungen sind mit
                angemessener Vorankündigung während üblicher Geschäftszeiten
                durchzuführen und dürfen Sicherheit, Vertraulichkeit, Rechte
                anderer Kunden sowie den laufenden Betrieb nicht unangemessen
                beeinträchtigen. Gesetzliche Befugnisse der Aufsichtsbehörden
                bleiben unberührt.
              </p>
            </section>

            <Divider />

            {/* 12 */}
            <section>
              <SectionNumber>12</SectionNumber>

              <h2 className={sectionHeading}>
                Rückgabe und Löschung nach Vertragsende
              </h2>

              <p className={paragraph}>
                <strong>12.1</strong> Nach Beendigung der Auftragsverarbeitung
                löscht oder gibt der Auftragsverarbeiter die im Auftrag
                verarbeiteten personenbezogenen Daten nach Wahl des
                Verantwortlichen zurück, soweit keine gesetzliche Verpflichtung
                zur weiteren Speicherung besteht und soweit dies technisch und
                vertraglich vorgesehen ist.
              </p>

              <p className={paragraph}>
                <strong>12.2</strong> Daten in Sicherungskopien können bis zum
                turnusmäßigen Überschreiben beziehungsweise Löschen verbleiben,
                sofern sie während dieser Zeit vor produktiver Nutzung
                geschützt sind und nur für Wiederherstellungszwecke verwendet
                werden.
              </p>

              <p className={paragraph}>
                <strong>12.3</strong> Für Dipera ist ein Lösch- und
                Offboarding-Verfahren festgelegt. Registrierte Mitarbeiter
                werden bei Ausscheiden grundsätzlich deaktiviert; ein
                Hard-Delete über die Mitarbeiterverwaltung ist nach
                abgeschlossener Registrierung nicht vorgesehen.
                Personenbezogene Daten werden nicht pauschal beim Ausscheiden
                gelöscht, sondern entsprechend Verarbeitungszweck, Weisung des
                Verantwortlichen und gegebenenfalls bestehenden gesetzlichen
                Aufbewahrungspflichten behandelt. Erforderliche Löschungen
                werden nach dokumentiertem Verfahren umgesetzt; eine
                vollständig automatisierte fristgesteuerte Löschung ist nicht
                zugesagt.
              </p>
            </section>

            <Divider />

            {/* 13 */}
            <section>
              <SectionNumber>13</SectionNumber>

              <h2 className={sectionHeading}>Schlussbestimmungen</h2>

              <p className={paragraph}>
                <strong>13.1</strong> Änderungen und Ergänzungen dieses AVV
                einschließlich dokumentierter elektronischer Vereinbarungen
                bedürfen einer nachweisbaren Form. Dies gilt auch für Änderungen
                der Anlagen.
              </p>

              <p className={paragraph}>
                <strong>13.2</strong> Im Fall von Widersprüchen zwischen diesem
                AVV und dem zugrunde liegenden Hauptvertrag gehen die
                datenschutzrechtlichen Regelungen dieses AVV für die
                Auftragsverarbeitung vor, soweit gesetzlich zulässig.
              </p>

              <p className={paragraph}>
                <strong>13.3</strong> Sollte eine Bestimmung unwirksam sein
                oder werden, bleibt die Wirksamkeit der übrigen Bestimmungen
                unberührt. Zwingendes Datenschutzrecht bleibt unberührt.
              </p>

              <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/60 p-5 sm:p-6">
                <h3 className="font-semibold text-slate-900">
                  Elektronischer Abschluss
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-700 sm:text-base">
                  Dieser AVV kann elektronisch abgeschlossen werden. Bei
                  Abschluss über Dipera ergibt sich die Identität des
                  Verantwortlichen aus den beim Vertragsschluss hinterlegten
                  Kunden- und Unternehmensdaten. Die elektronische Zustimmung
                  kann einschließlich Zeitpunkt und akzeptierter
                  Dokumentfassung dokumentiert werden.
                </p>
              </div>
            </section>

            <Divider />

            {/* Anlage 1 */}
            <section>
              <div className="inline-flex rounded-full bg-[#102B4C] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-white">
                Anlage 1
              </div>

              <h2 className={sectionHeading}>
                Beschreibung der Auftragsverarbeitung
              </h2>

              <h3 className={subHeading}>1. Zweck und Art der Verarbeitung</h3>

              <p className={paragraph}>
                Bereitstellung der Dipera-Funktionen für Personalverwaltung,
                Arbeitszeiterfassung, mobile und stationäre Stempelvorgänge,
                Dienstplanung, Abwesenheitsverwaltung, Stundenkonten,
                Zuschläge, vorbereitende Lohn-/Gehaltsberechnung, DATEV-Export,
                Mitarbeiterdokumente, interne Personalnotizen, Korrektur- und
                Compliance-Prozesse sowie Push-Benachrichtigungen.
              </p>

              <h3 className={subHeading}>2. Kategorien betroffener Personen</h3>

              <ul className={list}>
                <li>
                  Beschäftigte und ehemalige Beschäftigte des Verantwortlichen
                </li>
                <li>
                  Bewerber oder sonstige Personen nur soweit der Verantwortliche
                  deren Daten zulässigerweise in Dipera hinterlegt
                </li>
                <li>
                  Administratoren, Inhaber und sonstige berechtigte Nutzer des
                  Verantwortlichen
                </li>
              </ul>

              <h3 className={subHeading}>
                3. Kategorien personenbezogener Daten
              </h3>

              <div className="mt-5 space-y-3">
                {[
                  [
                    "Identitäts- und Stammdaten",
                    "Name, Geburtsdatum, interne Mitarbeiterkennung, Benutzer-/Mitarbeiter-ID und Beschäftigungsdaten.",
                  ],
                  [
                    "Kontakt- und Kontodaten",
                    "E-Mail-Adresse, Benutzerrolle, Betriebszuordnung, Authentifizierungs- und Kontoinformationen.",
                  ],
                  [
                    "Beschäftigungs- und Vertragsdaten",
                    "Beschäftigungsbeginn/-ende, Beschäftigungsart, Arbeitszeitmodell, regelmäßige Arbeitstage, Sollstunden und Urlaubsanspruch.",
                  ],
                  [
                    "Arbeitszeitdaten",
                    "Ein-/Ausstempelungen, Pausen, Zeitstempel, Quelle des Stempelvorgangs, Soll-/Ist-Zeiten, Mehr-/Minderzeiten und Überstunden.",
                  ],
                  [
                    "Standortdaten",
                    "Bei aktivierter Standortprüfung: Standort-ID, präzise Koordinaten, Genauigkeit, Distanz zum Betriebsstandort, Prüfstatus und Erfassungszeitpunkt. Keine vorgesehene dauerhafte Hintergrundortung.",
                  ],
                  [
                    "Planungsdaten",
                    "Schichten, Beginn/Ende, Pausen, Tätigkeits-/Arbeitsbereiche, Veröffentlichung und Mitarbeiterzuordnung.",
                  ],
                  [
                    "Abwesenheitsdaten",
                    "Abwesenheitstyp, Zeitraum, Status, Zeitgutschriften und Freitextnotizen.",
                  ],
                  [
                    "Lohn- und Abrechnungsdaten",
                    "Lohnart, Stundenlohn, Gehalt, Zuschläge, Bruttoberechnungen, DATEV-Personalnummer, Kostenstelle und Payroll-Snapshots.",
                  ],
                  [
                    "Dokumente und Personalnotizen",
                    "Hochgeladene Mitarbeiterdokumente einschließlich Metadaten, Beschreibungen und interne Notizen.",
                  ],
                  [
                    "Korrektur-/Compliance-Daten",
                    "Korrekturanträge, Konflikte, Warnungen und relevante Bearbeitungsinformationen.",
                  ],
                  [
                    "Push-/Gerätedaten",
                    "FCM-/Push-Token, Plattform sowie erforderliche Benutzer-, Mitarbeiter- und Betriebszuordnung.",
                  ],
                ].map(([title, text]) => (
                  <div
                    key={title}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5"
                  >
                    <h4 className="font-semibold text-slate-900">{title}</h4>
                    <p className="mt-1.5 text-sm leading-6 text-slate-600 sm:text-[15px]">
                      {text}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
                <p className="text-sm leading-6 text-amber-950 sm:text-[15px]">
                  <strong>
                    Besondere Kategorien personenbezogener Daten:
                  </strong>{" "}
                  Dipera verlangt grundsätzlich keine Diagnoseangaben. Durch
                  Abwesenheitsarten, Freitextfelder oder hochgeladene Dokumente
                  können jedoch Gesundheitsdaten oder andere besondere
                  Kategorien personenbezogener Daten nach Art. 9 DSGVO
                  verarbeitet werden, wenn der Verantwortliche solche Daten
                  eingibt oder hochlädt.
                </p>
              </div>
            </section>

            <Divider />

            {/* Anlage 2 */}
            <section>
              <div className="inline-flex rounded-full bg-[#102B4C] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-white">
                Anlage 2
              </div>

              <h2 className={sectionHeading}>
                Technische und organisatorische Maßnahmen (TOMs)
              </h2>

              <p className={paragraph}>
                Die folgenden Maßnahmen beschreiben den derzeitigen technischen
                und organisatorischen Stand der für die Auftragsverarbeitung
                relevanten Schutzmaßnahmen.
              </p>

              <div className="mt-6 space-y-4">
                <Tom
                  title="Zugangs- und Authentifizierungsschutz"
                  status={<Status>Umgesetzt</Status>}
                >
                  Benutzerkonten über Supabase Auth; rollenbasierte
                  Benutzerzuordnung; serverseitige Authentifizierungsprüfungen
                  für sicherheitskritische Funktionen.
                </Tom>

                <Tom
                  title="Berechtigungs- und Mandantentrennung"
                  status={<Status>Umgesetzt</Status>}
                >
                  Row Level Security (RLS), Business-/Tenant-Zuordnung und
                  serverseitige Rollenprüfungen; Mitarbeiterzugriffe auf eigene
                  Daten beziehungsweise ausdrücklich veröffentlichte Teamdaten
                  beschränkt.
                </Tom>

                <Tom
                  title="Privilegierte Datenbankfunktionen"
                  status={<Status>Umgesetzt</Status>}
                >
                  SECURITY-DEFINER/RPC-Funktionen wurden hinsichtlich
                  EXECUTE-Rechten und interner Autorisierung gehärtet; interne
                  Funktionen sind grundsätzlich nicht für anonyme oder normale
                  Clientaufrufe freigegeben.
                </Tom>

                <Tom
                  title="Payroll-Integrität"
                  status={<Status>Umgesetzt</Status>}
                >
                  Geschlossene Payroll-Perioden verwenden eingefrorene
                  Snapshots; direkte Schreibrechte auf zentrale
                  Payroll-Perioden/Snapshots wurden beschränkt;
                  Lifecycle-Aktionen werden kontrolliert und auditierbar
                  ausgeführt.
                </Tom>

                <Tom
                  title="Übertragungsschutz"
                  status={<Status>Umgesetzt</Status>}
                >
                  Web- und API-Kommunikation erfolgt über TLS/HTTPS der
                  eingesetzten Plattformen.
                </Tom>

                <Tom
                  title="Standortdaten-Minimierung"
                  status={<Status>Umgesetzt</Status>}
                >
                  Standortabfrage ist für die Standortprüfung beim Stempeln
                  vorgesehen; kein vorgesehener kontinuierlicher
                  Hintergrund-Standortverlauf. Der Standortmodus kann je
                  Mitarbeiter konfiguriert werden.
                </Tom>

                <Tom
                  title="Push-Berechtigungen"
                  status={<Status>Umgesetzt</Status>}
                >
                  Push-Gerätetoken werden einem Benutzer, Mitarbeiter und
                  Betrieb zugeordnet; Deregistrierung beim Logout ist
                  vorgesehen.
                </Tom>

                <Tom
                  title="Protokollierung / Audit"
                  status={
                    <Status type="partial">Teilweise umgesetzt</Status>
                  }
                >
                  Relevante Payroll-Lifecycle-Vorgänge werden auditierbar
                  geführt; technische Fehler- und Sicherheitsprotokolle werden
                  soweit erforderlich über Plattformdienste verarbeitet.
                </Tom>

                <Tom
                  title="Backups und Wiederherstellung"
                  status={
                    <Status>
                      Umgesetzt und Wiederherstellung getestet
                    </Status>
                  }
                >
                  Für die PostgreSQL-Datenbank bestehen im Supabase-Pro-Tarif
                  tägliche Sicherungen mit derzeit sieben Tagen Aufbewahrung.
                  Zusätzlich werden Datenbankbestandteile und der
                  Supabase-Storage-Bucket „Employee-documents“ in einem
                  unabhängigen Backup-Verfahren gesichert, als verschlüsseltes
                  Archiv in Cloudflare R2 abgelegt und anhand von
                  SHA-256-Prüfsummen verifiziert. Der R2-Bucket ist nicht
                  öffentlich und auf die EU-Jurisdiktion beschränkt. Ein
                  vollständiger Wiederherstellungstest einschließlich
                  Datenbank, Auth-Daten und Storage-Objekten wurde am 24.
                  September 2026 erfolgreich durchgeführt und in der
                  Disaster-Recovery-Dokumentation festgehalten.
                </Tom>

                <Tom
                  title="Löschung und Offboarding"
                  status={
                    <Status>Umgesetzt / organisatorisch dokumentiert</Status>
                  }
                >
                  Nicht registrierte Mitarbeiter können gelöscht werden;
                  registrierte Mitarbeiter werden deaktiviert. Deaktivierte
                  Mitarbeiter verlieren den operativen Zugriff; historische
                  Daten bleiben abhängig von Zweck, Weisung und
                  Aufbewahrungspflichten erhalten. Erforderliche Löschungen
                  werden dokumentiert und nach dem festgelegten Verfahren
                  durchgeführt.
                </Tom>

                <Tom
                  title="Incident Response"
                  status={
                    <Status>Umgesetzt / organisatorisch dokumentiert</Status>
                  }
                >
                  Ein interner Ablauf für Erkennung, Bewertung, Eindämmung,
                  Dokumentation, Benachrichtigung, Behebung und Nachbereitung
                  von Datenschutz- und Sicherheitsvorfällen ist schriftlich
                  dokumentiert. Zuständigkeit und Incident-Register sind
                  festgelegt.
                </Tom>

                <Tom
                  title="Berechtigungsmanagement Betreiber"
                  status={<Status>Umgesetzt</Status>}
                >
                  Zugriffe auf produktionsrelevante Anbieter- und
                  Entwicklerkonten sind auf erforderliche Konten begrenzt. MFA
                  wurde für die derzeit verwendeten zentralen
                  Produktions-/Dienstkonten aktiviert; Berechtigungen werden
                  bei Änderungen erneut geprüft.
                </Tom>

                <Tom
                  title="Geheimnisse und Schlüssel"
                  status={
                    <Status type="review">
                      Umgesetzt; regelmäßige Prüfung
                    </Status>
                  }
                >
                  Service-Role-Keys, API-Schlüssel und sonstige Secrets dürfen
                  nicht im Client oder öffentlichen Repository offengelegt
                  werden und werden über geschützte
                  Umgebungsvariablen/Secret-Stores verwaltet.
                </Tom>

                <Tom
                  title="Release- und Testhygiene"
                  status={<Status>Umgesetzt</Status>}
                >
                  Debug-Ausgaben mit vollständigen FCM-Tokens sowie nicht
                  benötigte Test-E-Mail-Endpunkte wurden für die externe
                  Nutzung bereinigt. Release-Builds werden vor Veröffentlichung
                  erneut auf Debug- und Testartefakte geprüft.
                </Tom>

                <Tom
                  title="Dienstleisterverträge"
                  status={
                    <Status>Umgesetzt / laufend zu überprüfen</Status>
                  }
                >
                  Erforderliche DPAs beziehungsweise AVVs mit eingesetzten
                  Auftragsverarbeitern werden geprüft und abgeschlossen.
                  Vercel wird im DPA-fähigen Pro-Tarif eingesetzt; das Vercel
                  Data Processing Addendum wird für den Einsatz zugrunde gelegt.
                </Tom>

                <Tom
                  title="Datenschutzorganisation"
                  status={
                    <Status>Umgesetzt / laufend zu überprüfen</Status>
                  }
                >
                  Dateninventar, TOM-Grundlage, Lösch-/Offboarding-Konzept,
                  Verfahren für Betroffenenanfragen und Incident Response sind
                  dokumentiert. Eine Subprozessorenliste ist Bestandteil dieses
                  AVV. Dokumentation und TOMs werden bei wesentlichen
                  technischen oder organisatorischen Änderungen sowie
                  regelmäßig überprüft.
                </Tom>
              </div>
            </section>

            <Divider />

            {/* Anlage 3 */}
            <section>
              <div className="inline-flex rounded-full bg-[#102B4C] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-white">
                Anlage 3
              </div>

              <h2 className={sectionHeading}>Unterauftragnehmer</h2>

              <p className={paragraph}>
                Die folgende Liste bildet den derzeit für Dipera vorgesehenen
                technischen Stand der für die Auftragsverarbeitung relevanten
                Anbieter ab.
              </p>

              <div className="mt-6 space-y-4">
                <Provider title="Supabase, Inc." purpose="Backend, PostgreSQL-Datenbank, Authentifizierung, Storage und serverseitige Plattformfunktionen.">
                  Kern-Personal-, Zeit-, Planungs-, Abwesenheits-, Payroll-,
                  Dokument- und Kontodaten. Primäre Dipera-Projektregion: AWS
                  eu-west-1, Irland (EU). Weitere Unterauftragnehmer und
                  Transfers nach Anbieter-DPA möglich.
                </Provider>

                <Provider
                  title="Vercel Inc."
                  purpose="Hosting und Ausführung der Next.js-Webanwendung und API-Routen."
                >
                  Technische Request- und Verbindungsdaten sowie Daten, die über
                  serverseitige Dipera-Routen verarbeitet werden. Vercel wird
                  im DPA-fähigen Pro-Tarif eingesetzt; das Vercel Data
                  Processing Addendum wird zugrunde gelegt.
                </Provider>

                <Provider
                  title="Google / Firebase Cloud Messaging"
                  purpose="Zustellung von Push-Benachrichtigungen an die Mitarbeiter-App."
                >
                  Push-/Gerätekennungen und technische Nachrichtendaten;
                  abhängig vom Inhalt gegebenenfalls Benachrichtigungsinhalt.
                  Google verarbeitet Firebase-Kundendaten grundsätzlich als
                  Auftragsverarbeiter; internationale Verarbeitung nach den
                  anwendbaren Firebase-Datenschutzbedingungen ist möglich.
                </Provider>

                <Provider
                  title="Plus Five Five, Inc. (Resend)"
                  purpose="E-Mail-Versand für Dipera-eigene Kontakt-/Feedbackprozesse und soweit Kundendaten im Auftrag über Resend versandt werden."
                >
                  E-Mail-Adresse, Name, Betreff, Nachricht und technische
                  Versanddaten, soweit betroffen. Resend veröffentlicht ein DPA
                  und eine Unterauftragnehmerliste; mehrere
                  Unterauftragnehmer befinden sich in den USA. Der Einsatz im
                  AVV ist nur für tatsächlich auftragsbezogene Kundendaten
                  relevant.
                </Provider>

                <Provider
                  title="Cloudflare, Inc. (R2)"
                  purpose="Verschlüsselte externe Sicherung von Dipera-Datenbank- und Storage-Backups."
                >
                  Verschlüsselte Backup-Archive mit Datenbank- und
                  Dokumentdaten. Cloudflare erhält nicht den Dipera-seitig
                  verwalteten Entschlüsselungsschlüssel. Der R2-Bucket
                  „dipera-backups“ ist nicht öffentlich und nutzt die
                  EU-Jurisdiktion. Cloudflare stellt ein Data Processing
                  Addendum bereit; Drittlandtransfers können nach dessen
                  Regelungen und Standardvertragsklauseln erfolgen.
                </Provider>
              </div>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
                <h3 className="font-semibold text-slate-900">
                  Stripe
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-[15px]">
                  Stripe wird derzeit nicht pauschal als Unterauftragnehmer für
                  Beschäftigtendaten in diese Anlage aufgenommen. Stripe dient
                  der Zahlungs- und Abonnementabwicklung des Dipera-Kunden und
                  kann dabei je nach Verarbeitung in eigener
                  datenschutzrechtlicher Rolle handeln. Sollte Stripe künftig
                  im Auftrag personenbezogene Beschäftigtendaten verarbeiten,
                  ist die Einordnung und diese Anlage entsprechend anzupassen.
                </p>
              </div>

              <h3 className={subHeading}>
                Informations- und Änderungsverfahren
              </h3>

              <p className={paragraph}>
                Die jeweils aktuelle Unterauftragnehmerliste wird dem Kunden
                elektronisch zugänglich gemacht. Bei Hinzunahme oder Ersetzung
                eines für die Auftragsverarbeitung relevanten
                Unterauftragnehmers informiert Dipera den Kunden vor dessen
                Einsatz mit angemessener Frist und ermöglicht einen begründeten
                datenschutzrechtlichen Widerspruch.
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

function Tom({
  title,
  status,
  children,
}: {
  title: string;
  status: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <h3 className="font-semibold text-slate-900">{title}</h3>
        <div className="shrink-0">{status}</div>
      </div>

      <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-[15px]">
        {children}
      </p>
    </div>
  );
}

function Provider({
  title,
  purpose,
  children,
}: {
  title: string;
  purpose: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
      <h3 className="font-semibold text-slate-900">{title}</h3>

      <p className="mt-2 text-sm font-medium leading-6 text-slate-700 sm:text-[15px]">
        {purpose}
      </p>

      <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-[15px]">
        {children}
      </p>
    </div>
  );
}