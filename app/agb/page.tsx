import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Allgemeine Geschäftsbedingungen | Dipera",
  description:
    "Allgemeine Geschäftsbedingungen für die Nutzung der Software Dipera.",
};

const sectionHeading =
  "mt-3 break-words text-lg font-semibold tracking-tight text-slate-950 sm:text-2xl";

const paragraph =
  "mt-4 break-words text-[15px] leading-7 text-slate-700 sm:text-base";

const list =
  "mt-4 list-disc space-y-2 pl-5 text-[15px] leading-7 text-slate-700 sm:pl-6 sm:text-base";

const linkStyle =
  "break-words font-medium text-blue-700 underline decoration-blue-200 underline-offset-4 transition hover:text-blue-900 hover:decoration-blue-500";

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

export default function AgbPage() {
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
              Rechtliches
            </div>

            <h1 className="font-bold leading-[1.08] tracking-tight text-white">
              <span className="block text-4xl sm:hidden">
                Allgemeine
                <br />
                Geschäfts-
                <br />
                bedingungen
              </span>

              <span className="hidden sm:block sm:text-5xl lg:text-6xl">
                Allgemeine Geschäftsbedingungen
              </span>
            </h1>

            <p className="mt-5 max-w-2xl text-[15px] leading-7 text-slate-200 sm:mt-6 sm:text-lg">
              Bedingungen für die Nutzung der Software Dipera.
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
            {/* 1 */}
            <section>
              <SectionNumber>01</SectionNumber>

              <h2 className={sectionHeading}>
                Anbieter und Geltungsbereich
              </h2>

              <p className={paragraph}>
                <strong>1.1</strong> Anbieter der Software „Dipera“ ist:
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
                    className={linkStyle}
                  >
                    support@dipera.de
                  </a>
                </span>
              </address>

              <p className={paragraph}>
                nachfolgend „Dipera“ oder „Anbieter“.
              </p>

              <p className={paragraph}>
                <strong>1.2</strong> Diese Allgemeinen Geschäftsbedingungen
                gelten für Verträge über die Nutzung der Software Dipera
                zwischen dem Anbieter und seinen Kunden.
              </p>

              <p className={paragraph}>
                <strong>1.3</strong> Dipera richtet sich ausschließlich an
                Unternehmer im Sinne des § 14 BGB, juristische Personen des
                öffentlichen Rechts sowie öffentlich-rechtliche Sondervermögen.
                Ein Vertragsschluss mit Verbrauchern ist nicht vorgesehen.
              </p>

              <p className={paragraph}>
                <strong>1.4</strong> Abweichende Bedingungen des Kunden gelten
                nur, wenn der Anbieter ihrer Geltung ausdrücklich zugestimmt
                hat. Individuelle Vereinbarungen zwischen den Parteien haben
                Vorrang vor diesen AGB.
              </p>
            </section>

            <Divider />

            {/* 2 */}
            <section>
              <SectionNumber>02</SectionNumber>

              <h2 className={sectionHeading}>Vertragsgegenstand</h2>

              <p className={paragraph}>
                <strong>2.1</strong> Dipera ist eine cloudbasierte Software zur
                Personalverwaltung. Je nach bereitgestelltem und gebuchtem
                Funktionsumfang können insbesondere folgende Funktionen zur
                Verfügung stehen:
              </p>

              <ul className={list}>
                <li>Mitarbeiterverwaltung</li>
                <li>Arbeitszeiterfassung</li>
                <li>mobile und stationäre Zeiterfassung</li>
                <li>Dienstplanung</li>
                <li>Abwesenheitsverwaltung</li>
                <li>Stundenkonten</li>
                <li>Zuschläge</li>
                <li>vorbereitende Lohn- und Gehaltsberechnungen</li>
                <li>Monatsabschlüsse</li>
                <li>DATEV- und sonstige Exportfunktionen</li>
                <li>Mitarbeiterdokumente und interne Personalnotizen</li>
                <li>
                  mobile Anwendungen für Mitarbeiter und stationäre
                  Terminal-/Kiosk-Anwendungen
                </li>
              </ul>

              <p className={paragraph}>
                <strong>2.2</strong> Der konkrete Leistungsumfang ergibt sich
                aus der zum Zeitpunkt des Vertragsschlusses geltenden
                Leistungsbeschreibung, dem gewählten Tarif und den im
                jeweiligen Kundenkonto verfügbaren Funktionen.
              </p>

              <p className={paragraph}>
                <strong>2.3</strong> Dipera stellt insbesondere Funktionen zur
                Erfassung, Verwaltung, Berechnung und Aufbereitung von Daten
                bereit. Soweit Funktionen der Vorbereitung von
                Lohnabrechnungen, DATEV-Exporten, Arbeitszeitbewertungen oder
                vergleichbaren betrieblichen Vorgängen dienen, ersetzen diese
                keine individuelle steuerliche, rechtliche oder
                lohnabrechnungsspezifische Beratung.
              </p>

              <p className={paragraph}>
                <strong>2.4</strong> Der Kunde bleibt dafür verantwortlich, die
                mit Dipera erzeugten oder aufbereiteten Daten vor ihrer
                Verwendung für rechtlich oder wirtschaftlich relevante
                Folgeprozesse auf Plausibilität und Vollständigkeit zu prüfen.
              </p>
            </section>

            <Divider />

            {/* 3 */}
            <section>
              <SectionNumber>03</SectionNumber>

              <h2 className={sectionHeading}>
                Vertragsschluss und Kundenkonto
              </h2>

              <p className={paragraph}>
                <strong>3.1</strong> Die Darstellung von Dipera auf der Website
                stellt noch kein verbindliches Vertragsangebot dar.
              </p>

              <p className={paragraph}>
                <strong>3.2</strong> Der Kunde wählt den gewünschten Tarif
                beziehungsweise die angebotene Nutzungsform aus und gibt im
                elektronischen Bestellprozess die erforderlichen Kunden- und
                Unternehmensdaten an.
              </p>

              <p className={paragraph}>
                <strong>3.3</strong> Vor Abschluss des Bestellvorgangs werden
                dem Kunden die für seine Bestellung maßgeblichen
                Vertragsinformationen zur Verfügung gestellt. Der Kunde kann
                seine Angaben vor Abgabe der Bestellung überprüfen und
                korrigieren.
              </p>

              <p className={paragraph}>
                <strong>3.4</strong> Der Vertrag kommt zustande, wenn der Kunde
                den Bestellvorgang verbindlich abschließt und Dipera den
                Vertragsschluss beziehungsweise die Freischaltung des
                Kundenkontos elektronisch bestätigt.
              </p>

              <p className={paragraph}>
                <strong>3.5</strong> Im Rahmen des Vertragsschlusses bestätigt
                der Kunde die Geltung dieser AGB sowie – soweit Dipera
                personenbezogene Daten im Auftrag des Kunden verarbeitet – den
                Vertrag zur Auftragsverarbeitung („AVV“) in der beim
                Vertragsschluss bereitgestellten Fassung.
              </p>

              <p className={paragraph}>
                <strong>3.6</strong> Dipera kann die Zustimmung zu den
                Vertragsdokumenten einschließlich Zeitpunkt und jeweils
                akzeptierter Dokumentfassung elektronisch dokumentieren.
              </p>

              <p className={paragraph}>
                <strong>3.7</strong> Vertragssprache ist Deutsch.
              </p>
            </section>

            <Divider />

            {/* 4 */}
            <section>
              <SectionNumber>04</SectionNumber>

              <h2 className={sectionHeading}>Testphase</h2>

              <p className={paragraph}>
                <strong>4.1</strong> Soweit Dipera eine kostenlose Testphase
                anbietet, gelten die beim jeweiligen Angebot angegebenen
                Bedingungen und die dort genannte Dauer.
              </p>

              <p className={paragraph}>
                <strong>4.2</strong> Während der Testphase kann der
                Funktionsumfang gegenüber einem kostenpflichtigen Tarif
                eingeschränkt sein, soweit dies vor Beginn der Testphase
                kenntlich gemacht wird.
              </p>

              <p className={paragraph}>
                <strong>4.3</strong> Ob eine Testphase automatisch endet oder
                anschließend in einen kostenpflichtigen Tarif übergeht, richtet
                sich nach den Bedingungen, die dem Kunden vor Beginn der
                jeweiligen Testphase ausdrücklich angezeigt werden.
              </p>

              <p className={paragraph}>
                <strong>4.4</strong> Eine kostenlose Testphase begründet keinen
                Anspruch auf eine dauerhafte kostenlose Nutzung von Dipera.
              </p>
            </section>

            <Divider />

            {/* 5 */}
            <section>
              <SectionNumber>05</SectionNumber>

              <h2 className={sectionHeading}>
                Preise und Zahlungsbedingungen
              </h2>

              <p className={paragraph}>
                <strong>5.1</strong> Es gelten die dem Kunden unmittelbar vor
                Vertragsschluss angezeigten Preise und Abrechnungsbedingungen.
              </p>

              <p className={paragraph}>
                <strong>5.2</strong> Soweit nicht anders angegeben, verstehen
                sich gegenüber Unternehmern angegebene Preise zuzüglich der
                jeweils geltenden gesetzlichen Umsatzsteuer, sofern diese
                anfällt.
              </p>

              <p className={paragraph}>
                <strong>5.3</strong> Die Abrechnung erfolgt entsprechend dem
                gewählten Tarif und dem beim Vertragsschluss angegebenen
                Abrechnungszeitraum.
              </p>

              <p className={paragraph}>
                <strong>5.4</strong> Für die Zahlungs- und
                Abonnementabwicklung kann Dipera einen externen
                Zahlungsdienstleister, insbesondere Stripe, einsetzen.
              </p>

              <p className={paragraph}>
                <strong>5.5</strong> Der Kunde ist verpflichtet, seine für
                Abrechnung und Zahlung erforderlichen Angaben aktuell und
                vollständig zu halten.
              </p>

              <p className={paragraph}>
                <strong>5.6</strong> Gerät der Kunde mit fälligen Zahlungen in
                Verzug, gelten die gesetzlichen Vorschriften. Dipera kann den
                Zugang nach vorheriger angemessener Ankündigung vorübergehend
                einschränken, wenn ein erheblicher Zahlungsrückstand besteht
                und die Einschränkung unter Berücksichtigung der Interessen
                beider Parteien angemessen ist.
              </p>
            </section>

            <Divider />

            {/* 6 */}
            <section>
              <SectionNumber>06</SectionNumber>

              <h2 className={sectionHeading}>
                Vertragslaufzeit und Kündigung
              </h2>

              <p className={paragraph}>
                <strong>6.1</strong> Die Vertragslaufzeit und der
                Abrechnungszeitraum ergeben sich aus dem bei Vertragsschluss
                gewählten Tarif.
              </p>

              <p className={paragraph}>
                <strong>6.2</strong> Soweit beim Vertragsschluss nichts
                Abweichendes vereinbart wird, kann ein kostenpflichtiges
                Dipera-Abonnement von beiden Parteien zum Ende des laufenden
                Abrechnungszeitraums gekündigt werden.
              </p>

              <p className={paragraph}>
                <strong>6.3</strong> Erfolgt keine fristgerechte Kündigung,
                verlängert sich das Vertragsverhältnis um einen weiteren
                Abrechnungszeitraum.
              </p>

              <p className={paragraph}>
                <strong>6.4</strong> Die Kündigung kann über die hierfür
                bereitgestellten Funktionen im Kundenkonto oder in Textform
                gegenüber Dipera erfolgen.
              </p>

              <p className={paragraph}>
                <strong>6.5</strong> Das Recht beider Parteien zur
                außerordentlichen Kündigung aus wichtigem Grund bleibt
                unberührt.
              </p>
            </section>

            <Divider />

            {/* 7 */}
            <section>
              <SectionNumber>07</SectionNumber>

              <h2 className={sectionHeading}>
                Benutzerkonten und Zugangsdaten
              </h2>

              <p className={paragraph}>
                <strong>7.1</strong> Der Kunde ist dafür verantwortlich, dass
                Benutzerkonten ausschließlich von hierzu berechtigten Personen
                verwendet werden.
              </p>

              <p className={paragraph}>
                <strong>7.2</strong> Zugangsdaten dürfen nicht unbefugt an
                Dritte weitergegeben werden und sind angemessen vor
                unberechtigtem Zugriff zu schützen.
              </p>

              <p className={paragraph}>
                <strong>7.3</strong> Der Kunde hat Dipera unverzüglich zu
                informieren, wenn konkrete Anhaltspunkte für einen
                unberechtigten Zugriff auf ein administratives Kundenkonto
                bestehen.
              </p>

              <p className={paragraph}>
                <strong>7.4</strong> Der Kunde ist für die Vergabe und
                Verwaltung der innerhalb seines Betriebs eingerichteten
                Benutzerrollen und Berechtigungen verantwortlich, soweit diese
                durch ihn konfigurierbar sind.
              </p>
            </section>

            <Divider />

            {/* 8 */}
            <section>
              <SectionNumber>08</SectionNumber>

              <h2 className={sectionHeading}>Pflichten des Kunden</h2>

              <p className={paragraph}>
                <strong>8.1</strong> Der Kunde darf Dipera ausschließlich im
                Rahmen der geltenden Gesetze und des vereinbarten
                Nutzungsumfangs verwenden.
              </p>

              <p className={paragraph}>
                <strong>8.2</strong> Der Kunde ist insbesondere dafür
                verantwortlich:
              </p>

              <ul className={list}>
                <li>
                  nur Daten zu verarbeiten, zu deren Verarbeitung er berechtigt
                  ist,
                </li>
                <li>
                  erforderliche Informations- und Mitbestimmungspflichten
                  gegenüber Beschäftigten einzuhalten,
                </li>
                <li>
                  erforderliche Rechtsgrundlagen für die Verarbeitung
                  personenbezogener Daten sicherzustellen,
                </li>
                <li>
                  Standortprüfungen und andere Funktionen mit besonderem
                  Datenschutzbezug nur rechtmäßig einzusetzen,
                </li>
                <li>
                  Benutzer- und Mitarbeiterdaten sachlich richtig und
                  angemessen aktuell zu halten und
                </li>
                <li>
                  keine rechtswidrigen Inhalte über Dipera zu speichern oder zu
                  verarbeiten.
                </li>
              </ul>

              <p className={paragraph}>
                <strong>8.3</strong> Freitextfelder und Dokumentenfunktionen
                dürfen nur für Daten verwendet werden, deren Verarbeitung für
                den jeweiligen betrieblichen Zweck erforderlich und rechtlich
                zulässig ist. Dies gilt insbesondere für Gesundheitsdaten und
                andere besondere Kategorien personenbezogener Daten.
              </p>

              <p className={paragraph}>
                <strong>8.4</strong> Der Kunde ist für die Einhaltung der für
                seinen Betrieb geltenden arbeits-, steuer-,
                sozialversicherungs- und sonstigen rechtlichen Anforderungen
                verantwortlich.
              </p>
            </section>

            <Divider />

            {/* 9 */}
            <section>
              <SectionNumber>09</SectionNumber>

              <h2 className={sectionHeading}>
                Verfügbarkeit, Wartung und Weiterentwicklung
              </h2>

              <p className={paragraph}>
                <strong>9.1</strong> Dipera ist bestrebt, eine hohe
                Verfügbarkeit der Software sicherzustellen. Eine jederzeitige,
                vollständig unterbrechungsfreie Verfügbarkeit wird jedoch nicht
                geschuldet, soweit keine gesonderte Vereinbarung über bestimmte
                Verfügbarkeitswerte getroffen wurde.
              </p>

              <p className={paragraph}>
                <strong>9.2</strong> Vorübergehende Einschränkungen können
                insbesondere aufgrund von Wartungsarbeiten,
                Sicherheitsmaßnahmen, technischen Störungen oder Störungen bei
                erforderlichen Infrastruktur- und Plattformanbietern
                auftreten.
              </p>

              <p className={paragraph}>
                <strong>9.3</strong> Dipera darf die Software technisch und
                funktional weiterentwickeln. Änderungen dürfen den wesentlichen
                Vertragszweck und die berechtigten Interessen des Kunden nicht
                unangemessen beeinträchtigen.
              </p>

              <p className={paragraph}>
                <strong>9.4</strong> Funktionen können angepasst oder ersetzt
                werden, wenn hierfür ein sachlicher Grund besteht und dem
                Kunden dadurch keine unzumutbare Beeinträchtigung des
                vereinbarten Leistungsumfangs entsteht.
              </p>
            </section>

            <Divider />

            {/* 10 */}
            <section>
              <SectionNumber>10</SectionNumber>

              <h2 className={sectionHeading}>
                Datenschutz und Auftragsverarbeitung
              </h2>

              <p className={paragraph}>
                <strong>10.1</strong> Informationen zur Verarbeitung
                personenbezogener Daten durch Dipera ergeben sich aus der
                jeweils geltenden{" "}
                <a href="/datenschutz" className={linkStyle}>
                  Datenschutzerklärung
                </a>
                .
              </p>

              <p className={paragraph}>
                <strong>10.2</strong> Soweit Dipera personenbezogene Daten im
                Auftrag des Kunden verarbeitet, gelten ergänzend die
                Bestimmungen des zwischen den Parteien abgeschlossenen{" "}
                <a href="/avv" className={linkStyle}>
                  Vertrags zur Auftragsverarbeitung (AVV)
                </a>{" "}
                gemäß Art. 28 DSGVO.
              </p>

              <p className={paragraph}>
                <strong>10.3</strong> Der Kunde ist im Hinblick auf die von ihm
                über Dipera verarbeiteten Beschäftigtendaten grundsätzlich
                Verantwortlicher im Sinne der DSGVO. Dipera verarbeitet diese
                Daten im Rahmen der vereinbarten Auftragsverarbeitung
                grundsätzlich als Auftragsverarbeiter.
              </p>

              <p className={paragraph}>
                <strong>10.4</strong> Für eigene Verarbeitungen von Dipera,
                insbesondere im Zusammenhang mit Vertrag, Abrechnung,
                Sicherheit und eigenen Supportprozessen, kann Dipera selbst
                datenschutzrechtlich Verantwortlicher sein.
              </p>

              <p className={paragraph}>
                <strong>10.5</strong> Bei Widersprüchen zwischen diesen AGB und
                dem AVV gehen hinsichtlich der Verarbeitung personenbezogener
                Daten im Auftrag des Kunden die datenschutzrechtlichen
                Bestimmungen des AVV vor.
              </p>
            </section>

            <Divider />

            {/* 11 */}
            <section>
              <SectionNumber>11</SectionNumber>

              <h2 className={sectionHeading}>Datensicherung</h2>

              <p className={paragraph}>
                <strong>11.1</strong> Dipera trifft angemessene technische und
                organisatorische Maßnahmen zur Sicherung der im Rahmen des
                Dienstes verarbeiteten Daten.
              </p>

              <p className={paragraph}>
                <strong>11.2</strong> Die Einzelheiten der für die
                Auftragsverarbeitung relevanten technischen und
                organisatorischen Maßnahmen ergeben sich insbesondere aus dem
                AVV und dessen Anlagen.
              </p>

              <p className={paragraph}>
                <strong>11.3</strong> Die von Dipera durchgeführten technischen
                Sicherungen entbinden den Kunden nicht von eigenen gesetzlichen
                oder betrieblichen Dokumentations-, Export- oder
                Aufbewahrungspflichten.
              </p>
            </section>

            <Divider />

            {/* 12 */}
            <section>
              <SectionNumber>12</SectionNumber>

              <h2 className={sectionHeading}>Rechte an Dipera</h2>

              <p className={paragraph}>
                <strong>12.1</strong> Sämtliche Rechte an der Software Dipera,
                insbesondere Urheber-, Kennzeichen- und sonstige Schutzrechte,
                verbleiben beim Anbieter beziehungsweise den jeweiligen
                Rechteinhabern.
              </p>

              <p className={paragraph}>
                <strong>12.2</strong> Der Kunde erhält für die Dauer des
                Vertrags ein einfaches, nicht ausschließliches und nicht
                übertragbares Recht, Dipera im Rahmen des vereinbarten
                Leistungsumfangs für eigene betriebliche Zwecke zu nutzen.
              </p>

              <p className={paragraph}>
                <strong>12.3</strong> Eine darüber hinausgehende
                Vervielfältigung, Verbreitung, öffentliche Zugänglichmachung,
                Weiterveräußerung oder Überlassung der Software an Dritte ist
                ohne entsprechende Berechtigung nicht gestattet.
              </p>

              <p className={paragraph}>
                <strong>12.4</strong> Zwingende gesetzliche Rechte des Kunden
                bleiben unberührt.
              </p>
            </section>

            <Divider />

            {/* 13 */}
            <section>
              <SectionNumber>13</SectionNumber>

              <h2 className={sectionHeading}>Mängel und Support</h2>

              <p className={paragraph}>
                <strong>13.1</strong> Der Kunde soll erkennbare technische
                Fehler möglichst nachvollziehbar beschreiben und Dipera die zur
                Untersuchung erforderlichen Informationen zur Verfügung
                stellen.
              </p>

              <p className={paragraph}>
                <strong>13.2</strong> Dipera wird reproduzierbare und den
                vertragsgemäßen Gebrauch wesentlich beeinträchtigende Fehler
                innerhalb angemessener Zeit untersuchen und im Rahmen der
                technischen Möglichkeiten beheben.
              </p>

              <p className={paragraph}>
                <strong>13.3</strong> Gesetzliche Mängelrechte bleiben
                unberührt.
              </p>
            </section>

            <Divider />

            {/* 14 */}
            <section>
              <SectionNumber>14</SectionNumber>

              <h2 className={sectionHeading}>Haftung</h2>

              <p className={paragraph}>
                <strong>14.1</strong> Dipera haftet unbeschränkt für Schäden,
                die vorsätzlich oder grob fahrlässig verursacht wurden, sowie
                für Schäden aus der Verletzung von Leben, Körper oder
                Gesundheit.
              </p>

              <p className={paragraph}>
                <strong>14.2</strong> Bei leicht fahrlässiger Verletzung einer
                wesentlichen Vertragspflicht haftet Dipera für den
                vertragstypischen, bei Vertragsschluss vorhersehbaren Schaden.
                Wesentliche Vertragspflichten sind solche, deren Erfüllung die
                ordnungsgemäße Durchführung des Vertrags überhaupt ermöglicht
                und auf deren Einhaltung der Kunde regelmäßig vertrauen darf.
              </p>

              <p className={paragraph}>
                <strong>14.3</strong> Im Übrigen ist die Haftung für leicht
                fahrlässig verursachte Schäden ausgeschlossen, soweit
                gesetzlich zulässig.
              </p>

              <p className={paragraph}>
                <strong>14.4</strong> Die Haftung nach zwingenden gesetzlichen
                Vorschriften bleibt unberührt.
              </p>
            </section>

            <Divider />

            {/* 15 */}
            <section>
              <SectionNumber>15</SectionNumber>

              <h2 className={sectionHeading}>
                Sperrung bei missbräuchlicher Nutzung
              </h2>

              <p className={paragraph}>
                <strong>15.1</strong> Dipera kann den Zugang zu einzelnen
                Funktionen oder zum Kundenkonto vorübergehend einschränken,
                wenn konkrete Anhaltspunkte für
              </p>

              <ul className={list}>
                <li>eine rechtswidrige Nutzung,</li>
                <li>erhebliche Sicherheitsrisiken,</li>
                <li>Angriffe auf die technische Infrastruktur oder</li>
                <li>eine sonstige erhebliche vertragswidrige Nutzung</li>
              </ul>

              <p className={paragraph}>
                bestehen und die Einschränkung zur Abwehr des Risikos
                erforderlich und verhältnismäßig ist.
              </p>

              <p className={paragraph}>
                <strong>15.2</strong> Dipera wird die berechtigten Interessen
                des Kunden berücksichtigen und ihn über eine Sperrung und deren
                Grund informieren, soweit dadurch Sicherheitsmaßnahmen,
                gesetzliche Pflichten oder berechtigte Interessen Dritter nicht
                beeinträchtigt werden.
              </p>
            </section>

            <Divider />

            {/* 16 */}
            <section>
              <SectionNumber>16</SectionNumber>

              <h2 className={sectionHeading}>
                Vertragsende und Kundendaten
              </h2>

              <p className={paragraph}>
                <strong>16.1</strong> Nach Beendigung des Vertrags endet das
                Recht des Kunden zur Nutzung von Dipera.
              </p>

              <p className={paragraph}>
                <strong>16.2</strong> Die Behandlung personenbezogener Daten,
                die Dipera im Auftrag des Kunden verarbeitet, richtet sich nach
                dem AVV und den anwendbaren gesetzlichen Vorgaben.
              </p>

              <p className={paragraph}>
                <strong>16.3</strong> Soweit gesetzliche Aufbewahrungspflichten
                oder berechtigte Gründe für eine weitere Speicherung bestehen,
                können bestimmte Daten über das Vertragsende hinaus gespeichert
                werden. Daten, die ausschließlich im Auftrag des Kunden
                verarbeitet werden, werden entsprechend den Regelungen des AVV
                behandelt.
              </p>

              <p className={paragraph}>
                <strong>16.4</strong> Der Kunde ist dafür verantwortlich,
                benötigte Daten und Unterlagen rechtzeitig vor Vertragsende
                über die hierfür bereitgestellten Funktionen zu exportieren,
                soweit ein entsprechender Export technisch angeboten wird.
              </p>
            </section>

            <Divider />

            {/* 17 */}
            <section>
              <SectionNumber>17</SectionNumber>

              <h2 className={sectionHeading}>Änderungen dieser AGB</h2>

              <p className={paragraph}>
                <strong>17.1</strong> Änderungen dieser AGB für bestehende
                Vertragsverhältnisse erfolgen nur, soweit hierfür ein
                sachlicher Grund besteht, insbesondere aufgrund geänderter
                gesetzlicher Anforderungen, technischer Weiterentwicklungen
                oder Änderungen des Leistungsangebots.
              </p>

              <p className={paragraph}>
                <strong>17.2</strong> Änderungen, die das vertragliche
                Gleichgewicht nicht nur unerheblich zulasten des Kunden
                verändern, werden nicht allein aufgrund dieser
                Änderungsklausel vorgenommen.
              </p>

              <p className={paragraph}>
                <strong>17.3</strong> Über für bestehende Vertragsverhältnisse
                relevante Änderungen wird der Kunde rechtzeitig in Textform
                informiert. Soweit für eine Änderung eine Zustimmung des
                Kunden erforderlich ist, wird Dipera diese gesondert einholen.
              </p>
            </section>

            <Divider />

            {/* 18 */}
            <section>
              <SectionNumber>18</SectionNumber>

              <h2 className={sectionHeading}>Schlussbestimmungen</h2>

              <p className={paragraph}>
                <strong>18.1</strong> Es gilt das Recht der Bundesrepublik
                Deutschland unter Ausschluss des UN-Kaufrechts.
              </p>

              <p className={paragraph}>
                <strong>18.2</strong> Ist der Kunde Kaufmann, eine juristische
                Person des öffentlichen Rechts oder ein öffentlich-rechtliches
                Sondervermögen, ist – soweit gesetzlich zulässig – Gerichtsstand
                für Streitigkeiten aus oder im Zusammenhang mit dem
                Vertragsverhältnis der Sitz des Anbieters.
              </p>

              <p className={paragraph}>
                <strong>18.3</strong> Sollte eine Bestimmung dieser AGB ganz
                oder teilweise unwirksam sein oder werden, bleiben die übrigen
                Bestimmungen wirksam. An die Stelle der unwirksamen Bestimmung
                treten die gesetzlichen Vorschriften.
              </p>

              <p className={paragraph}>
                <strong>18.4</strong> Der AVV und die Datenschutzerklärung sind
                eigenständige Dokumente. Der AVV wird Bestandteil des
                Vertragsverhältnisses, soweit eine Auftragsverarbeitung im
                Sinne des Art. 28 DSGVO erfolgt.
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