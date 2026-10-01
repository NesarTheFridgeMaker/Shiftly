"use client";

import Link from "next/link";
import Image from "next/image";
import { Be_Vietnam_Pro } from "next/font/google";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const [showPopup, setShowPopup] = useState(false);

  function showDiperaPopup(text: string) {
    setPopupMessage(text);
    setShowPopup(true);
  }

  async function handleResetPassword() {
    if (!email) {
      showDiperaPopup("Bitte gib deine E-Mail-Adresse ein.");
      return;
    }

    setIsLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setIsLoading(false);

    if (error) {
      console.error(error);
      showDiperaPopup(error.message);
      return;
    }

    showDiperaPopup(
      "Wenn ein Konto mit dieser E-Mail-Adresse existiert, wurde ein Link zum Zurücksetzen des Passworts versendet."
    );
  }

  return (
    <main
      className={`${beVietnamPro.className} relative min-h-screen overflow-hidden bg-white text-[#323542]`}
    >
      {/* Hintergrund */}
      <div
        className="pointer-events-none absolute -right-28 -top-28 h-[420px] w-[420px] rounded-full bg-[#31AEF0]/10 blur-3xl"
        aria-hidden="true"
      />

      <div
        className="pointer-events-none absolute -bottom-40 -left-32 h-[460px] w-[460px] rounded-full bg-[#E7EDF1] blur-3xl"
        aria-hidden="true"
      />

      {/* Logo */}
      <div className="absolute left-6 top-7 z-10 sm:left-10 sm:top-9">
        <Link href="/login" aria-label="Dipera Login">
          <Image
            src="/logo/dipera-logo-dark.png"
            alt="Dipera"
            width={1024}
            height={280}
            priority
            className="h-auto w-[140px] sm:w-[150px]"
          />
        </Link>
      </div>

      {/* Inhalt */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-5 py-28 sm:px-8">
        <section className="w-full max-w-[520px]">
          <div className="rounded-[30px] bg-[#F2F5F8] px-6 py-8 sm:px-10 sm:py-10">
            <div className="mb-8">
              <div className="mb-4 inline-flex rounded-full bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-[#168FD0]">
                Zugang wiederherstellen
              </div>

              <h1 className="text-[34px] font-bold leading-[1.08] tracking-[-0.04em] text-black sm:text-[42px]">
                Passwort vergessen?
              </h1>

              <p className="mt-4 max-w-md text-[15px] leading-7 text-[#323542]">
                Gib deine E-Mail-Adresse ein. Wir senden dir einen Link zum
                Zurücksetzen.
              </p>
            </div>

            <div className="flex flex-col gap-5">
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-bold text-black"
                >
                  E-Mail-Adresse
                </label>

                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@unternehmen.de"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !isLoading) {
                      void handleResetPassword();
                    }
                  }}
                  className="h-[54px] w-full rounded-[16px] border border-black/[0.08] bg-white px-4 text-[15px] text-black outline-none transition placeholder:text-[#8B93A1] focus:border-[#31AEF0] focus:ring-4 focus:ring-[#31AEF0]/10"
                />
              </div>

              <button
                type="button"
                onClick={handleResetPassword}
                disabled={isLoading}
                className="flex min-h-[54px] w-full items-center justify-center rounded-[16px] bg-[#31AEF0] px-6 text-[15px] font-bold text-white transition hover:bg-[#219DDB] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? "Link wird versendet..." : "Link senden"}
              </button>

              <p className="text-center text-sm leading-6 text-[#667085]">
                Zurück zum{" "}
                <Link
                  href="/login"
                  className="font-bold text-[#168FD0] transition hover:text-[#0F76AE]"
                >
                  Login
                </Link>
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* Popup */}
      {showPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-5 backdrop-blur-sm">
          <div className="w-full max-w-[460px] rounded-[28px] bg-white p-7 shadow-[0_24px_80px_rgba(20,32,50,0.16)] sm:p-9">
            <div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-[#E7EDF1]">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-6 w-6 text-[#168FD0]"
                aria-hidden="true"
              >
                <path
                  d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5v-11Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <path
                  d="m6.5 8 5.5 4 5.5-4"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <p className="mt-5 text-[17px] font-semibold leading-7 text-black">
              {popupMessage}
            </p>

            <button
              type="button"
              onClick={() => setShowPopup(false)}
              className="mt-7 flex min-h-[50px] w-full items-center justify-center rounded-[16px] bg-[#31AEF0] px-6 text-[15px] font-bold text-white transition hover:bg-[#219DDB]"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </main>
  );
}