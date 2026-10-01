import type { Metadata } from "next";

import { Be_Vietnam_Pro } from "next/font/google";
import PublicHeader from "@/components/public/PublicHeader";
import PublicFooter from "@/components/public/PublicFooter";







export const metadata: Metadata = {



  title: "Konto löschen | Dipera",



  description:



    "Informationen zur Löschung eines Dipera-Benutzerkontos und der zugehörigen Daten.",



};







const beVietnamPro = Be_Vietnam_Pro({

  subsets: ["latin"],

  weight: ["400", "500", "600", "700", "800"],

  display: "swap",

});



const sectionHeading =



  "mt-5 break-words text-[22px] font-bold leading-tight tracking-[-0.025em] text-black sm:text-[26px]";







const paragraph =



  "mt-4 break-words text-[15px] leading-7 text-[#323542] sm:text-base";







const linkStyle =



  "break-words font-semibold text-[#168FD0] underline decoration-[#31AEF0]/30 underline-offset-4 transition hover:text-[#0F76AE] hover:decoration-[#31AEF0]";







function SectionNumber({ children }: { children: React.ReactNode }) {



  return (



    <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#E7EDF1] text-sm font-bold text-[#168FD0]">



      {children}



    </div>



  );



}







export default function KontoLoeschenPage() {



  return (



    <main className={`${beVietnamPro.className} min-h-screen bg-white text-[#323542]`}>



      <PublicHeader />

      <section className="relative overflow-hidden bg-white">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#31AEF0]/10 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-40 left-1/4 h-80 w-80 rounded-full bg-[#E7EDF1] blur-3xl"
          aria-hidden="true"
        />

        <div className="relative mx-auto max-w-5xl px-5 pb-12 pt-12 sm:px-8 sm:pb-16 sm:pt-16">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex rounded-full bg-[#F2F5F8] px-4 py-2 text-xs font-bold uppercase tracking-[0.15em] text-[#168FD0] sm:mb-5">
              Benutzerkonto
            </div>

            <h1 className="font-bold leading-[1.08] tracking-[-0.045em] text-black">
              <span className="block text-4xl sm:text-5xl lg:text-6xl">
                Konto löschen
              </span>
            </h1>

            <p className="mt-5 max-w-2xl text-[15px] leading-7 text-[#323542] sm:mt-6 sm:text-lg">
              Hier erfährst du, wie du die Löschung deines
              Dipera-Benutzerkontos und der damit verbundenen Daten anfordern
              kannst.
            </p>

            <div className="mt-7 flex items-center gap-2 text-sm text-[#667085] sm:mt-8">
              <span className="h-2 w-2 shrink-0 rounded-full bg-[#31AEF0]" />
              <span>Stand: September 2026</span>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}



      <div className="mx-auto max-w-5xl px-3 py-5 sm:px-8 sm:py-12">



        <article className="overflow-hidden rounded-[36px] bg-[#F2F5F8]">



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







              <div className="mt-5 break-words rounded-[24px] bg-white px-5 py-5 leading-7 text-[#323542] sm:px-6">



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







            <div className="my-10 h-3 rounded-full bg-white sm:my-12" />







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







            <div className="my-10 h-3 rounded-full bg-white sm:my-12" />







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







            <div className="my-10 h-3 rounded-full bg-white sm:my-12" />







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







            <div className="my-10 h-3 rounded-full bg-white sm:my-12" />







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







      </div>

      <PublicFooter />
    </main>



  );



}