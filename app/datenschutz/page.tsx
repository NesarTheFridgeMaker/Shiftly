import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import PublicHeader from "@/components/public/PublicHeader";
import PublicFooter from "@/components/public/PublicFooter";



export const metadata: Metadata = {

  title: "Datenschutzerklärung | Dipera",

  description:

    "Informationen zum Datenschutz und zur Verarbeitung personenbezogener Daten bei Dipera.",

};

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const sectionHeading =
  "mt-3 break-words text-xl font-bold tracking-[-0.02em] text-black sm:text-2xl";



const paragraph =
  "mt-4 break-words text-[15px] leading-7 text-[#323542] sm:text-base";



const linkStyle =
  "break-words font-semibold text-[#168FD0] underline decoration-[#31AEF0]/30 underline-offset-4 transition hover:text-[#0F76AE]";



function SectionNumber({ children }: { children: React.ReactNode }) {

  return (

    <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#E7EDF1] text-sm font-bold text-[#168FD0]">

      {children}

    </div>

  );

}



export default function DatenschutzPage() {
  return (
    <main className={`${beVietnamPro.className} min-h-screen bg-white text-[#323542]`}>
      <PublicHeader />

      <section className="relative overflow-hidden bg-white">
        <div
          className="pointer-events-none absolute -right-28 -top-28 h-[420px] w-[420px] rounded-full bg-[#31AEF0]/10 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-40 -left-32 h-[460px] w-[460px] rounded-full bg-[#E7EDF1] blur-3xl"
          aria-hidden="true"
        />

        <div className="relative mx-auto max-w-5xl px-5 pb-14 pt-14 sm:px-8 sm:pb-20 sm:pt-20">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex rounded-full bg-[#F2F5F8] px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-[#168FD0]">
              Datenschutz
            </div>

            <h1 className="text-[40px] font-bold leading-[1.06] tracking-[-0.045em] text-black sm:text-5xl lg:text-6xl">
              Datenschutzerklärung
            </h1>

            <p className="mt-5 max-w-2xl text-[15px] leading-7 text-[#323542] sm:mt-6 sm:text-lg">
              Informationen zur Verarbeitung personenbezogener Daten bei der
              Nutzung von Dipera.
            </p>

            <div className="mt-7 flex items-center gap-2 text-sm text-[#667085] sm:mt-8">
              <span className="h-2 w-2 shrink-0 rounded-full bg-[#31AEF0]" />
              <span>Stand: September 2026</span>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}

      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-16">

        <article className="overflow-hidden rounded-[30px] bg-[#F2F5F8]">

          <div className="min-w-0 px-6 py-8 sm:px-10 sm:py-12 lg:px-14">

            {/* 1 */}

            <section>

              <SectionNumber>01</SectionNumber>



              <h2 className={sectionHeading}>Verantwortlicher</h2>



              <p className={paragraph}>

                Verantwortlicher für die Verarbeitung personenbezogener Daten

                im Zusammenhang mit Dipera ist:

              </p>



              <address className="mt-5 break-words rounded-[18px] bg-white px-4 py-4 not-italic leading-7 text-[#323542] sm:px-5">

                <span className="font-semibold text-black">

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

                  <a href="mailto:support@dipera.de" className={linkStyle}>

                    support@dipera.de

                  </a>

                </span>

              </address>

            </section>




            {/* 2 */}

            <section>

              <SectionNumber>02</SectionNumber>



              <h2 className={sectionHeading}>

                Allgemeines zur Datenverarbeitung

              </h2>



              <p className={paragraph}>

                Dipera ist eine Software zur Personalverwaltung,

                Arbeitszeiterfassung, Dienstplanung, Abwesenheitsverwaltung

                sowie zur Vorbereitung von Lohn- und Gehaltsabrechnungen.

              </p>



              <p className={paragraph}>

                Bei der Nutzung von Dipera werden personenbezogene Daten

                verarbeitet, soweit dies zur Bereitstellung der Software, zur

                Verwaltung von Benutzerkonten sowie zur Durchführung der vom

                jeweiligen Unternehmen genutzten Funktionen erforderlich ist.

              </p>



              <p className={paragraph}>

                Soweit ein Unternehmen Dipera zur Verarbeitung

                personenbezogener Daten seiner Beschäftigten einsetzt,

                verarbeitet Dipera diese Daten grundsätzlich im Auftrag des

                jeweiligen Unternehmens. Das Unternehmen bleibt für die

                Rechtmäßigkeit der Verarbeitung seiner Beschäftigtendaten

                verantwortlich.

              </p>

            </section>




            {/* 3 */}

            <section>

              <SectionNumber>03</SectionNumber>



              <h2 className={sectionHeading}>

                Benutzerkonten und Authentifizierung

              </h2>



              <p className={paragraph}>

                Für die Registrierung, Anmeldung und Verwaltung von

                Benutzerkonten können insbesondere folgende Daten verarbeitet

                werden:

              </p>



              <p className={paragraph}>

                Name, E-Mail-Adresse, Benutzer-ID, Betriebszuordnung,

                Mitarbeiterzuordnung, Benutzerrolle sowie technische

                Authentifizierungs- und Sicherheitsinformationen.

              </p>



              <p className={paragraph}>

                Die Verarbeitung erfolgt zur Einrichtung und Bereitstellung des

                Benutzerkontos, zur Authentifizierung und zur Steuerung der

                Zugriffsberechtigungen.

              </p>



              <p className={paragraph}>

                Für die technische Bereitstellung der Authentifizierung

                verwenden wir Supabase.

              </p>

            </section>




            {/* 4 */}

            <section>

              <SectionNumber>04</SectionNumber>



              <h2 className={sectionHeading}>

                Personal- und Mitarbeiterverwaltung

              </h2>



              <p className={paragraph}>

                Unternehmen können in Dipera Daten ihrer Mitarbeiter verwalten.

                Abhängig von der Nutzung und Konfiguration können insbesondere

                verarbeitet werden:

              </p>



              <p className={paragraph}>

                Name, Geburtsdatum, Beschäftigungsbeginn und -ende,

                Beschäftigungsart, Funktion bzw. Arbeitsbereich, vertragliche

                Arbeitszeiten, regelmäßige Arbeitstage, Urlaubsansprüche,

                interne Mitarbeiterkennungen sowie weitere für die

                Personalverwaltung erforderliche Angaben.

              </p>



              <p className={paragraph}>

                Welche Daten konkret verarbeitet werden, bestimmt insbesondere

                das Unternehmen, das Dipera einsetzt.

              </p>

            </section>




            {/* 5 */}

            <section>

              <SectionNumber>05</SectionNumber>



              <h2 className={sectionHeading}>Arbeitszeiterfassung</h2>



              <p className={paragraph}>

                Bei Nutzung der Arbeitszeiterfassung verarbeitet Dipera

                insbesondere:

              </p>



              <p className={paragraph}>

                Zeitpunkt von Arbeitsbeginn und Arbeitsende, Beginn und Ende von

                Pausen, Mitarbeiterzuordnung, verwendete Art der Zeiterfassung

                sowie daraus berechnete Arbeits-, Pausen-, Soll-, Mehr- und

                Minderzeiten.

              </p>



              <p className={paragraph}>

                Diese Daten dienen der Erfassung und Auswertung von

                Arbeitszeiten sowie der Führung von Arbeitszeit- und

                Stundenkonten.

              </p>

            </section>




            {/* 6 */}

            <section>

              <SectionNumber>06</SectionNumber>



              <h2 className={sectionHeading}>

                Standortprüfung bei der Zeiterfassung

              </h2>



              <p className={paragraph}>

                Unternehmen können die Standortprüfung für mobile Stempelungen

                aktivieren.

              </p>



              <p className={paragraph}>

                Ist diese Funktion für einen Mitarbeiter aktiviert, kann Dipera

                beim Stempelvorgang den aktuellen Standort des Geräts erfassen.

                Dabei können insbesondere geografische Koordinaten,

                Standortgenauigkeit, Entfernung zum hinterlegten

                Betriebsstandort, der zugeordnete Betriebsstandort und das

                Ergebnis der Standortprüfung verarbeitet werden.

              </p>



              <p className={paragraph}>

                Die Standortdaten dienen ausschließlich der Prüfung, ob eine

                mobile Stempelung innerhalb des vom Unternehmen festgelegten

                Bereichs erfolgt.

              </p>



              <p className={paragraph}>

                Dipera verwendet diese Funktion nicht zur dauerhaften

                Überwachung oder Erstellung von Bewegungsprofilen. Eine

                Standortabfrage erfolgt im Zusammenhang mit einem

                entsprechenden Stempelvorgang.

              </p>

            </section>




            {/* 7 */}

            <section>

              <SectionNumber>07</SectionNumber>



              <h2 className={sectionHeading}>Dienstplanung</h2>



              <p className={paragraph}>

                Im Rahmen der Dienstplanung können insbesondere

                Mitarbeiterzuordnungen, Datum, Beginn und Ende einer Schicht,

                Pausen, Arbeitsbereiche bzw. Tätigkeiten sowie der

                Veröffentlichungsstatus eines Dienstplans verarbeitet werden.

              </p>



              <p className={paragraph}>

                Diese Verarbeitung dient der Planung und Bereitstellung von

                Dienst- und Einsatzplänen.

              </p>

            </section>




            {/* 8 */}

            <section>

              <SectionNumber>08</SectionNumber>



              <h2 className={sectionHeading}>Abwesenheiten</h2>



              <p className={paragraph}>

                Für die Verwaltung von Urlaub und sonstigen Abwesenheiten

                können insbesondere folgende Daten verarbeitet werden:

              </p>



              <p className={paragraph}>

                Mitarbeiter, Art der Abwesenheit, Zeitraum, Bearbeitungs- bzw.

                Genehmigungsstatus sowie gegebenenfalls vom Benutzer

                eingegebene Notizen.

              </p>



              <p className={paragraph}>

                Freitextfelder können Angaben enthalten, die der Benutzer

                selbst eingibt. Benutzer und Unternehmen sollten darin nur

                solche personenbezogenen Informationen hinterlegen, die für die

                Bearbeitung der jeweiligen Abwesenheit erforderlich sind.

              </p>



              <p className={paragraph}>

                Soweit Angaben Rückschlüsse auf die Gesundheit einer Person

                zulassen, können besondere Kategorien personenbezogener Daten

                betroffen sein.

              </p>

            </section>




            {/* 9 */}

            <section>

              <SectionNumber>09</SectionNumber>



              <h2 className={sectionHeading}>

                Arbeitszeitkonten und Lohnvorbereitung

              </h2>



              <p className={paragraph}>

                Soweit die entsprechenden Funktionen verwendet werden,

                verarbeitet Dipera Daten zur Berechnung von Arbeitszeitkonten

                und zur Vorbereitung der Lohnabrechnung.

              </p>



              <p className={paragraph}>

                Hierzu können insbesondere gehören: Soll- und

                Ist-Arbeitszeiten, Mehr- und Minderstunden, Überstunden,

                Stundenlohn oder vereinbartes Gehalt, Zuschläge,

                Abwesenheitsgutschriften, berechnete Bruttobeträge,

                DATEV-Personalnummern, Kostenstellen sowie weitere

                abrechnungsbezogene Angaben.

              </p>



              <p className={paragraph}>

                Dipera führt dabei eine vorbereitende Verarbeitung durch. Die

                tatsächliche Lohnabrechnung kann anschließend durch das

                Unternehmen, dessen Steuerberater, Lohnbüro oder ein externes

                Abrechnungssystem erfolgen.

              </p>

            </section>




            {/* 10 */}

            <section>

              <SectionNumber>10</SectionNumber>



              <h2 className={sectionHeading}>Mitarbeiterdokumente</h2>



              <p className={paragraph}>

                Unternehmen können Dokumente mit Bezug zu Mitarbeitern in

                Dipera speichern.

              </p>



              <p className={paragraph}>

                Dabei können neben dem eigentlichen Dokument insbesondere

                Dateiname, Dokumenttitel, Kategorie, Beschreibung, Dateityp,

                Dateigröße, Mitarbeiterzuordnung sowie Angaben zum Upload

                verarbeitet werden.

              </p>



              <p className={paragraph}>

                Welche personenbezogenen Daten ein Dokument enthält, hängt vom

                jeweiligen hochgeladenen Dokument ab.

              </p>



              <p className={paragraph}>

                Unternehmen sind dafür verantwortlich, nur solche Dokumente und

                Informationen hochzuladen, deren Verarbeitung für den

                jeweiligen Zweck zulässig und erforderlich ist.

              </p>

            </section>




            {/* 11 */}

            <section>

              <SectionNumber>11</SectionNumber>



              <h2 className={sectionHeading}>Push-Benachrichtigungen</h2>



              <p className={paragraph}>

                Die Dipera-Mitarbeiter-App kann Push-Benachrichtigungen

                verwenden.

              </p>



              <p className={paragraph}>

                Hierfür wird Firebase Cloud Messaging (FCM), ein Dienst von

                Google, eingesetzt. Zur technischen Zustellung werden

                insbesondere Geräte- bzw. Push-Kennungen verarbeitet. Dipera

                speichert den jeweiligen Push-Token zusammen mit der

                erforderlichen Benutzer-, Mitarbeiter- und Betriebszuordnung.

              </p>



              <p className={paragraph}>

                Google gibt für Firebase Cloud Messaging an, insbesondere

                Firebase Installation IDs zur Zustellung von Nachrichten zu

                verwenden. Firebase-Dienste können auf globaler

                Google-Infrastruktur verarbeitet werden.

              </p>



              <p className={paragraph}>

                Weitere Informationen:{" "}

                <a

                  href="https://firebase.google.com/support/privacy"

                  target="_blank"

                  rel="noopener noreferrer"

                  className={linkStyle}

                >

                  Firebase – Datenschutz und Sicherheit

                </a>

              </p>

            </section>




            {/* 12 */}

            <section>

              <SectionNumber>12</SectionNumber>



              <h2 className={sectionHeading}>Kontakt- und Feedbackanfragen</h2>



              <p className={paragraph}>

                Wenn Nutzer über Dipera Kontakt- oder Feedbackformulare

                verwenden, können insbesondere Name, E-Mail-Adresse, Betreff

                und Inhalt der Nachricht verarbeitet werden.

              </p>



              <p className={paragraph}>

                Für den Versand dieser Nachrichten verwenden wir Resend, einen

                Dienst der Plus Five Five, Inc., USA.

              </p>



              <p className={paragraph}>

                Resend verarbeitet die für den E-Mail-Versand erforderlichen

                Daten in unserem Auftrag und stellt hierfür ein Data Processing

                Addendum zur Verfügung. Für erforderliche Übermittlungen

                außerhalb des Europäischen Wirtschaftsraums sieht dieses unter

                anderem die EU-Standardvertragsklauseln vor.

              </p>



              <p className={paragraph}>

                Weitere Informationen:{" "}

                <a

                  href="https://resend.com/legal"

                  target="_blank"

                  rel="noopener noreferrer"

                  className={linkStyle}

                >

                  Resend – Legal

                </a>

              </p>

            </section>




            {/* 13 */}

            <section>

              <SectionNumber>13</SectionNumber>



              <h2 className={sectionHeading}>

                Hosting, Datenbank und Dateispeicherung

              </h2>



              <p className={paragraph}>

                Für wesentliche technische Funktionen von Dipera verwenden wir

                Supabase.

              </p>



              <p className={paragraph}>

                Supabase stellt insbesondere Datenbank-, Authentifizierungs-

                und Dateispeicherfunktionen bereit.

              </p>



              <p className={paragraph}>

                Das für Dipera verwendete Supabase-Projekt befindet sich in der

                Projektregion West EU (Irland), eu-west-1. Dabei ist zu

                beachten, dass Supabase zur Bereitstellung seiner Dienste

                weitere Unterauftragnehmer einsetzen kann und

                Verarbeitungsvorgänge nicht zwingend ausschließlich innerhalb

                der gewählten Projektregion stattfinden. Supabase sieht hierfür

                vertragliche Datenschutzregelungen und Regelungen für

                Unterauftragnehmer vor.

              </p>



              <p className={paragraph}>

                Weitere Informationen:{" "}

                <a

                  href="https://supabase.com/docs/guides/security"

                  target="_blank"

                  rel="noopener noreferrer"

                  className={linkStyle}

                >

                  Supabase – Security

                </a>

              </p>

            </section>




            {/* 14 */}

            <section>

              <SectionNumber>14</SectionNumber>



              <h2 className={sectionHeading}>Hosting der Webanwendung</h2>



              <p className={paragraph}>

                Die Webanwendung und serverseitige Bestandteile von Dipera

                werden über Vercel bereitgestellt.

              </p>



              <p className={paragraph}>

                Beim Zugriff können insbesondere technische Verbindungs- und

                Requestdaten verarbeitet werden, die für die Bereitstellung und

                Sicherheit des Dienstes erforderlich sind.

              </p>



              <p className={paragraph}>

                Vor dem produktiven Betrieb mit Geschäftskunden ist die Nutzung

                eines Vercel-Tarifs vorgesehen, für den das Vercel Data

                Processing Addendum Anwendung findet. Das aktuelle DPA gilt für

                Kunden der Pro- und Enterprise-Tarife.

              </p>



              <p className={paragraph}>

                Weitere Informationen:{" "}

                <a

                  href="https://vercel.com/legal/dpa"

                  target="_blank"

                  rel="noopener noreferrer"

                  className={linkStyle}

                >

                  Vercel – Data Processing Addendum

                </a>

              </p>

            </section>




            {/* 15 */}

            <section>

              <SectionNumber>15</SectionNumber>



              <h2 className={sectionHeading}>Zahlungsabwicklung</h2>



              <p className={paragraph}>

                Für kostenpflichtige Dipera-Abonnements kann Stripe zur

                Zahlungs- und Abonnementabwicklung eingesetzt werden.

              </p>



              <p className={paragraph}>

                Dabei können insbesondere Kontakt-, Kunden-, Rechnungs-,

                Zahlungs- und Transaktionsinformationen verarbeitet werden.

              </p>



              <p className={paragraph}>

                Stripe kann abhängig von der konkreten Verarbeitung sowohl als

                Auftragsverarbeiter als auch als eigenständig Verantwortlicher

                tätig werden.

              </p>



              <p className={paragraph}>

                Weitere Informationen:{" "}

                <a

                  href="https://stripe.com/legal/dpa"

                  target="_blank"

                  rel="noopener noreferrer"

                  className={linkStyle}

                >

                  Stripe – Data Processing Addendum

                </a>

              </p>

            </section>




            {/* 16 */}

            <section>

              <SectionNumber>16</SectionNumber>



              <h2 className={sectionHeading}>Speicherdauer und Löschung</h2>



              <p className={paragraph}>

                Personenbezogene Daten werden grundsätzlich nur so lange

                gespeichert, wie dies für den jeweiligen Verarbeitungszweck

                erforderlich ist oder gesetzliche Aufbewahrungs- und

                Nachweispflichten bestehen. Die konkrete Speicherdauer hängt

                insbesondere von der Art der Daten, dem

                Beschäftigungsverhältnis, der Nutzung von Dipera durch das

                jeweilige Unternehmen sowie den für das Unternehmen geltenden

                gesetzlichen Pflichten ab.

              </p>



              <p className={paragraph}>

                Bei Beschäftigtendaten verarbeitet Dipera die Daten

                grundsätzlich im Auftrag des jeweiligen Unternehmens. Das

                Unternehmen entscheidet im Rahmen der gesetzlichen Vorgaben und

                der vereinbarten Auftragsverarbeitung über Aufbewahrung,

                Berichtigung, Rückgabe und Löschung dieser Daten. Dipera nimmt

                daher keine pauschale automatische Löschung sämtlicher

                Beschäftigtendaten allein aufgrund des Ausscheidens eines

                Mitarbeiters vor.

              </p>



              <p className={paragraph}>

                Wird ein bereits registrierter Mitarbeiter in Dipera

                deaktiviert, wird sein operativer Zugang gesperrt. Die

                zugehörige Beschäftigungs-, Arbeitszeit-, Abwesenheits-,

                Dokumenten- und Abrechnungshistorie kann weiterhin gespeichert

                bleiben, soweit sie für den jeweiligen Zweck, zur Erfüllung von

                Nachweis- oder Aufbewahrungspflichten oder aufgrund einer

                Weisung des verantwortlichen Unternehmens erforderlich ist.

                Benutzerzugang und Beschäftigungshistorie werden dabei getrennt

                behandelt.

              </p>



              <p className={paragraph}>

                Noch nicht vollständig registrierte Mitarbeiterdatensätze

                können durch berechtigte Administratoren gelöscht werden. Bei

                bereits registrierten Mitarbeitern ist im regulären

                Verwaltungsablauf grundsätzlich die Deaktivierung vorgesehen.

                Nicht mehr erforderliche Zugangs- und Zustelldaten, etwa

                Benutzerzugänge oder Push-Kennungen, können unabhängig von

                aufbewahrungspflichtigen Beschäftigungsdaten entfernt werden,

                soweit sie nicht mehr benötigt werden.

              </p>



              <p className={paragraph}>

                Bei Beendigung der Nutzung von Dipera durch ein Unternehmen

                werden die im Auftrag verarbeiteten personenbezogenen Daten

                nach Maßgabe der vertraglichen Vereinbarungen und der Weisung

                des Unternehmens zurückgegeben bzw. gelöscht, soweit keine

                gesetzliche Verpflichtung zur weiteren Speicherung

                entgegensteht.

              </p>



              <p className={paragraph}>

                Daten können nach einer Löschung noch für die Dauer der

                regulären Sicherungszyklen in technischen Backups enthalten

                sein. Solche Sicherungskopien dienen ausschließlich der

                Wiederherstellung und werden nicht für andere Zwecke

                weiterverarbeitet.

              </p>



              <p className={paragraph}>

                Eine weitergehende automatisierte fristgesteuerte Löschung ist

                derzeit nicht Bestandteil des regulären Systems; erforderliche

                Löschvorgänge werden im Pilotbetrieb anhand des dokumentierten

                Löschverfahrens umgesetzt.

              </p>

            </section>




            {/* 17 */}

            <section>

              <SectionNumber>17</SectionNumber>



              <h2 className={sectionHeading}>Datensicherheit</h2>



              <p className={paragraph}>

                Dipera setzt technische und organisatorische Maßnahmen ein, um

                personenbezogene Daten gegen Verlust, Manipulation sowie

                unberechtigten Zugriff zu schützen.

              </p>



              <p className={paragraph}>

                Hierzu gehören insbesondere Zugriffsbeschränkungen und

                rollenbasierte Berechtigungen, Mandantentrennung, serverseitige

                Berechtigungsprüfungen, Datenbank-Zugriffskontrollen sowie

                verschlüsselte Übertragung.

              </p>



              <p className={paragraph}>

                Die Sicherheitsmaßnahmen werden entsprechend der technischen

                Entwicklung und der mit der Verarbeitung verbundenen Risiken

                weiterentwickelt.

              </p>

            </section>




            {/* 18 */}

            <section>

              <SectionNumber>18</SectionNumber>



              <h2 className={sectionHeading}>Rechte betroffener Personen</h2>



              <p className={paragraph}>

                Betroffene Personen haben nach Maßgabe der gesetzlichen

                Voraussetzungen insbesondere das Recht auf Auskunft über ihre

                personenbezogenen Daten, Berichtigung unrichtiger Daten,

                Löschung, Einschränkung der Verarbeitung,

                Datenübertragbarkeit sowie Widerspruch gegen bestimmte

                Verarbeitungen.

              </p>



              <p className={paragraph}>

                Soweit eine Verarbeitung auf einer Einwilligung beruht, kann

                diese grundsätzlich mit Wirkung für die Zukunft widerrufen

                werden.

              </p>



              <p className={paragraph}>

                Betroffene Personen haben außerdem das Recht, sich bei einer

                zuständigen Datenschutzaufsichtsbehörde zu beschweren.

              </p>



              <p className={paragraph}>

                Bei Beschäftigtendaten, die ein Unternehmen über Dipera

                verarbeitet, sollte eine Anfrage grundsätzlich zunächst an den

                jeweiligen Arbeitgeber bzw. das Unternehmen gerichtet werden,

                da dieses regelmäßig Verantwortlicher für diese Verarbeitung

                ist.

              </p>



              <p className={paragraph}>

                Für Fragen zur Verarbeitung durch Dipera kann außerdem folgende

                Adresse verwendet werden:{" "}

                <a href="mailto:support@dipera.de" className={linkStyle}>

                  support@dipera.de

                </a>

              </p>

            </section>




            {/* 19 */}

            <section>

              <SectionNumber>19</SectionNumber>



              <h2 className={sectionHeading}>

                Änderungen dieser Datenschutzerklärung

              </h2>



              <p className={paragraph}>

                Diese Datenschutzerklärung kann angepasst werden, wenn sich

                Funktionen von Dipera, eingesetzte Dienstleister oder

                rechtliche Anforderungen ändern.

              </p>



              <p className={paragraph}>

                Es gilt die jeweils auf der Dipera-Website veröffentlichte

                Fassung.

              </p>

            </section>

          </div>

        </article>
      </div>

      <PublicFooter />
    </main>
  );
}
