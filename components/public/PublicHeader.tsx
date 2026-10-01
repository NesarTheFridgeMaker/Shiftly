"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type NavIconName = "grid" | "guide" | "wallet" | "help";

function NavIcon({ name }: { name: NavIconName }) {
  const paths = {
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="2" />
        <rect x="14" y="3" width="7" height="7" rx="2" />
        <rect x="3" y="14" width="7" height="7" rx="2" />
        <rect x="14" y="14" width="7" height="7" rx="2" />
      </>
    ),
    guide: (
      <>
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5z" />
        <path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5z" />
      </>
    ),
    wallet: (
      <>
        <rect x="3" y="6" width="18" height="14" rx="3" />
        <path d="M16 11h5v5h-5a2.5 2.5 0 0 1 0-5Z" />
      </>
    ),
    help: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9.8 9a2.4 2.4 0 1 1 3.6 2.1c-.9.5-1.4 1-1.4 2.1M12 17h.01" />
      </>
    ),
  };

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[18px] w-[18px] text-[#31AEF0]"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

export default function PublicHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const updateHeader = () => setScrolled(window.scrollY > 12);

    updateHeader();

    window.addEventListener("scroll", updateHeader, { passive: true });

    return () => window.removeEventListener("scroll", updateHeader);
  }, []);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-black/[0.05] bg-white/80 shadow-[0_10px_35px_rgba(20,32,50,0.06)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/70"
          : "border-b border-transparent bg-white"
      }`}
    >
      <div className="mx-auto flex h-[96px] max-w-[1380px] items-center justify-between px-6 lg:px-8">
        <a
          href="https://dipera.de/"
          className="flex items-center"
          onClick={closeMenu}
        >
          <Image
            src="/logo/dipera-logo-dark.png"
            alt="Dipera"
            width={1024}
            height={280}
            priority
            className="h-auto w-[150px]"
          />
        </a>

        {/* Desktop-Navigation */}
        <nav className="hidden items-center gap-8 lg:flex">
          <a
            href="https://dipera.de/#funktionen"
            className="flex items-center gap-2.5 text-[15px] font-bold text-black transition hover:text-[#31AEF0]"
          >
            <NavIcon name="grid" />
            Funktionen
          </a>

          <a
            href="https://dipera.de/so-funktionierts"
            className="flex items-center gap-2.5 text-[15px] font-bold text-black transition hover:text-[#31AEF0]"
          >
            <NavIcon name="guide" />
            So funktioniert&apos;s
          </a>

          <a
            href="https://dipera.de/#preise"
            className="flex items-center gap-2.5 text-[15px] font-bold text-black transition hover:text-[#31AEF0]"
          >
            <NavIcon name="wallet" />
            Preise
          </a>

          <a
            href="https://dipera.de/faq"
            className="flex items-center gap-2.5 text-[15px] font-bold text-black transition hover:text-[#31AEF0]"
          >
            <NavIcon name="help" />
            FAQ
          </a>
        </nav>

        {/* Desktop-Aktionen */}
        <div className="hidden items-center gap-3 lg:flex">
          <a
            href="/login"
            className="rounded-full border-2 border-[#31AEF0] px-5 py-2.5 text-[15px] font-semibold text-[#31AEF0] transition hover:bg-[#31AEF0] hover:text-white"
          >
            Einloggen
          </a>

          <a
            href="/register"
            className="rounded-[18px] bg-[#31AEF0] px-6 py-3.5 text-[14px] font-bold text-white transition hover:bg-[#219DDB]"
          >
            14 Tage testen
          </a>
        </div>

        {/* Mobile */}
        <div className="flex items-center gap-2 lg:hidden">
          <a
            href="/register"
            className="rounded-[16px] bg-[#31AEF0] px-4 py-3 text-[13px] font-bold text-white transition hover:bg-[#219DDB]"
          >
            14 Tage testen
          </a>

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="flex h-11 w-11 items-center justify-center rounded-[14px] border border-black/[0.08] bg-white text-black transition hover:bg-[#F2F5F8]"
            aria-label={menuOpen ? "Menü schließen" : "Menü öffnen"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-6 w-6"
                aria-hidden="true"
              >
                <path
                  d="M6 6l12 12M18 6 6 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-6 w-6"
                aria-hidden="true"
              >
                <path
                  d="M4 7h16M4 12h16M4 17h16"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile-Menü */}
      {menuOpen && (
        <div className="absolute left-0 right-0 top-full border-t border-black/[0.05] bg-white/95 shadow-[0_18px_45px_rgba(20,32,50,0.10)] backdrop-blur-xl lg:hidden">
          <nav className="mx-auto max-w-[1380px] px-6 py-5">
            <div className="flex flex-col">
              <a
                href="https://dipera.de/#funktionen"
                onClick={closeMenu}
                className="flex items-center gap-3 border-b border-black/[0.06] py-4 text-[16px] font-bold text-black"
              >
                <NavIcon name="grid" />
                Funktionen
              </a>

              <a
                href="https://dipera.de/so-funktionierts"
                onClick={closeMenu}
                className="flex items-center gap-3 border-b border-black/[0.06] py-4 text-[16px] font-bold text-black"
              >
                <NavIcon name="guide" />
                So funktioniert&apos;s
              </a>

              <a
                href="https://dipera.de/#preise"
                onClick={closeMenu}
                className="flex items-center gap-3 border-b border-black/[0.06] py-4 text-[16px] font-bold text-black"
              >
                <NavIcon name="wallet" />
                Preise
              </a>

              <a
                href="https://dipera.de/faq"
                onClick={closeMenu}
                className="flex items-center gap-3 py-4 text-[16px] font-bold text-black"
              >
                <NavIcon name="help" />
                FAQ
              </a>
            </div>

            <div className="mt-3 grid gap-3 border-t border-black/[0.06] pt-5">
              <a
                href="/login"
                className="flex min-h-[50px] items-center justify-center rounded-full border-2 border-[#31AEF0] px-6 text-[15px] font-bold text-[#31AEF0]"
              >
                Einloggen
              </a>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}