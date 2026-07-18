"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

function VerifyEmailContent() {
  const searchParams = useSearchParams();

  const emailFromUrl = searchParams.get("email")?.trim().toLowerCase() ?? "";
  const [email, setEmail] = useState(emailFromUrl);
  const [isResending, setIsResending] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const [showPopup, setShowPopup] = useState(false);

  function showDiperaPopup(text: string) {
    setPopupMessage(text);
    setShowPopup(true);
  }

  async function handleResendEmail() {
    if (isResending) return;

    const cleanedEmail = email.trim().toLowerCase();

    if (!cleanedEmail) {
      showDiperaPopup(
        "Bitte gib die E-Mail-Adresse ein, mit der du dich registriert hast."
      );
      return;
    }

    setIsResending(true);

    try {
      const appUrl = (
        process.env.NEXT_PUBLIC_APP_URL || window.location.origin
      ).replace(/\/$/, "");

      const { error } = await supabase.auth.resend({
        type: "signup",
        email: cleanedEmail,
        options: {
          emailRedirectTo: `${appUrl}/auth/callback`,
        },
      });

      if (error) {
        console.error("RESEND CONFIRMATION EMAIL ERROR:", error);

        showDiperaPopup(
          "Die Bestätigungs-E-Mail konnte nicht erneut gesendet werden. Bitte versuche es später noch einmal."
        );
        return;
      }

      showDiperaPopup(
        "Wir haben dir eine neue Bestätigungs-E-Mail gesendet. Bitte prüfe auch deinen Spam-Ordner."
      );
    } catch (error) {
      console.error("RESEND CONFIRMATION EMAIL ERROR:", error);

      showDiperaPopup(
        "Beim erneuten Senden ist ein unerwarteter Fehler aufgetreten."
      );
    } finally {
      setIsResending(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f7f7f8] p-4">
      <div className="absolute left-5 top-5 z-10 sm:left-10 sm:top-8">
        <img
          src="/logo/dipera-logo-dark.png"
          alt="Dipera"
          className="h-auto w-28 sm:w-36"
        />
      </div>

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 bottom-16 h-72 w-[55rem] rotate-[-18deg] rounded-full bg-gradient-to-r from-blue-100/40 via-white to-blue-200/30 blur-2xl" />

        <div className="absolute right-20 top-24 h-80 w-[38rem] rotate-[22deg] rounded-full bg-gradient-to-r from-white via-blue-100/50 to-slate-200/40 blur-2xl" />

        {[...Array(9)].map((_, index) => (
          <div
            key={index}
            className="absolute h-40 w-12 rounded-2xl border border-white/80 bg-white/55 shadow-2xl backdrop-blur"
            style={{
              left: `${18 + index * 8}%`,
              top: `${56 - Math.sin(index) * 18}%`,
              transform: `rotate(${-34 + index * 9}deg)`,
              opacity: 0.45,
            }}
          />
        ))}
      </div>

      <section className="relative z-10 mt-16 w-full max-w-md rounded-3xl border border-white bg-white/95 p-6 text-center shadow-2xl sm:mt-0 sm:p-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-3xl">
          ✉️
        </div>

        <h1 className="mt-6 text-[2.25rem] font-light leading-tight tracking-[-0.04em] text-blue-950 sm:text-[2.6rem]">
          Fast geschafft
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-500">
          Wir haben dir eine E-Mail mit einem Bestätigungslink gesendet.
          Klicke auf den Link, um deinen Dipera-Zugang zu aktivieren.
        </p>

        {emailFromUrl && (
          <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Bestätigungs-E-Mail gesendet an
            </p>

            <p className="mt-1 break-all font-semibold text-blue-950">
              {emailFromUrl}
            </p>
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left">
          <p className="font-semibold text-slate-800">
            Keine E-Mail erhalten?
          </p>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            Prüfe zunächst deinen Spam- oder Junk-Ordner. Der Versand kann
            außerdem wenige Minuten dauern.
          </p>
        </div>

        {!emailFromUrl && (
          <input
            type="email"
            autoComplete="email"
            placeholder="E-Mail-Adresse"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={isResending}
            className="mt-5 h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-left text-black outline-none transition focus:border-[#005CA8] focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
          />
        )}

        <button
          type="button"
          onClick={() => void handleResendEmail()}
          disabled={isResending}
          className="mt-5 h-12 w-full rounded-xl bg-[#005CA8] font-semibold text-white transition hover:bg-[#004b8a] disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          {isResending
            ? "E-Mail wird gesendet..."
            : "Bestätigungs-E-Mail erneut senden"}
        </button>

        <p className="mt-5 text-sm text-slate-500">
          E-Mail bereits bestätigt?{" "}
          <Link
            href="/login"
            className="font-semibold text-[#005CA8] hover:text-blue-950"
          >
            Zum Login
          </Link>
        </p>
      </section>

      {showPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-[#0B1220]/95 p-8 text-center shadow-2xl">
            <p className="mb-8 text-xl font-semibold leading-8 text-white sm:text-2xl">
              {popupMessage}
            </p>

            <button
              type="button"
              onClick={() => setShowPopup(false)}
              className="rounded-2xl bg-[#005CA8] px-10 py-4 font-semibold text-white transition hover:bg-[#004b8a]"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f7f7f8]">
          <p className="text-slate-500">
            Bestätigungsseite wird geladen...
          </p>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}