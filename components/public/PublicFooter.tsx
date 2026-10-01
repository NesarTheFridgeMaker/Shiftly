import Image from "next/image";

export default function PublicFooter() {
  return (
    <footer className="mt-5 bg-[#F2F5F8] text-black">
      <div className="mx-auto max-w-[1380px] px-6 py-16 lg:px-8 lg:py-20">
        <div className="grid gap-12 border-b border-[#cfd8df] pb-14 md:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1.35fr] lg:gap-14">
          <div>
            <h3 className="text-[18px] font-bold leading-tight tracking-[-0.02em]">
              Produkt
            </h3>

            <div className="mt-7 flex flex-col gap-5 text-[15px] font-normal leading-[1.65] tracking-[-0.01em] text-black">
              <a
                href="https://dipera.de/#funktionen"
                className="transition hover:text-[#31aef0]"
              >
                Funktionen
              </a>

              <a
                href="https://dipera.de/so-funktionierts"
                className="transition hover:text-[#31aef0]"
              >
                So funktioniert&apos;s
              </a>

              <a
                href="https://dipera.de/#preise"
                className="transition hover:text-[#31aef0]"
              >
                Preise
              </a>

              <a
                href="https://dipera.de/faq"
                className="transition hover:text-[#31aef0]"
              >
                FAQ
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-[18px] font-bold leading-tight tracking-[-0.02em]">
              Dipera
            </h3>

            <div className="mt-7 flex flex-col gap-5 text-[15px] font-normal leading-[1.65] tracking-[-0.01em] text-black">
              <a
                href="https://dipera.de/#kontakt"
                className="transition hover:text-[#31aef0]"
              >
                Kontakt
              </a>

              <a
                href="/login"
                className="transition hover:text-[#31aef0]"
              >
                Einloggen
              </a>

              <a
                href="/register"
                className="transition hover:text-[#31aef0]"
              >
                14 Tage testen
              </a>

              <a
                href="mailto:support@dipera.de"
                className="transition hover:text-[#31aef0]"
              >
                Support
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-[18px] font-bold leading-tight tracking-[-0.02em]">
              Rechtliches
            </h3>

            <div className="mt-7 flex flex-col gap-5 text-[15px] font-normal leading-[1.65] tracking-[-0.01em] text-black">
              <a
                href="/datenschutz"
                className="transition hover:text-[#31aef0]"
              >
                Datenschutzerklärung
              </a>

              <a
                href="/agb"
                className="transition hover:text-[#31aef0]"
              >
                AGB
              </a>

              <a
                href="/avv"
                className="transition hover:text-[#31aef0]"
              >
                Auftragsverarbeitungsvertrag
              </a>

              <a
                href="/konto-loeschen"
                className="transition hover:text-[#31aef0]"
              >
                Konto löschen
              </a>
            </div>
          </div>

          <div className="lg:border-l lg:border-[#cfd8df] lg:pl-12">
            <a href="https://dipera.de/" className="inline-flex">
              <Image
                src="/logo/dipera-logo-dark.png"
                alt="Dipera"
                width={1024}
                height={280}
                className="h-auto w-[150px]"
              />
            </a>

            <p className="mt-7 max-w-[300px] text-[15px] font-normal leading-[1.55] tracking-[-0.01em] text-[#323542]">
              Personalverwaltung einfach gemacht. Arbeitszeiten, Dienstpläne,
              Abwesenheiten und Lohnvorbereitung an einem Ort.
            </p>

            <div className="mt-8 border-t border-[#cfd8df] pt-7">
              <p className="text-sm font-bold text-[#607087]">Kontakt</p>

              <a
                href="mailto:support@dipera.de"
                className="mt-2 inline-flex text-[15px] font-bold transition hover:text-[#31aef0]"
              >
                support@dipera.de
              </a>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-7 text-sm text-[#323542] sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Dipera. Alle Rechte vorbehalten.</p>
          <p>Personalverwaltung für moderne Teams.</p>
        </div>
      </div>
    </footer>
  );
}