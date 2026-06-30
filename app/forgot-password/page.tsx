"use client";

import Link from "next/link";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

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
    <main className="relative min-h-screen overflow-hidden bg-[#f7f7f8] flex items-center justify-center p-4">
      <div className="absolute top-8 left-10 z-10">
        <img
          src="/logo/dipera-logo-dark.png"
          alt="Dipera"
          className="w-36 h-auto"
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

      <section className="relative z-10 w-full max-w-md rounded-3xl bg-white/95 p-8 shadow-2xl border border-white">
        <div className="text-center mb-8">
          <h1 className="text-[2.6rem] leading-tight font-light tracking-[-0.04em] text-blue-950">
            Passwort vergessen?
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Gib deine E-Mail-Adresse ein. Wir senden dir einen Link zum Zurücksetzen.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="E-Mail-Adresse"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-12 rounded-xl border border-slate-300 bg-white px-4 text-black outline-none focus:border-blue-700"
          />

          <button
            type="button"
            onClick={handleResetPassword}
            disabled={isLoading}
            className="h-12 rounded-xl bg-blue-700 text-white font-semibold hover:bg-blue-800 transition disabled:bg-gray-400"
          >
            {isLoading ? "Link wird versendet..." : "Link senden"}
          </button>

          <p className="text-center text-sm text-slate-500 mt-2">
            Zurück zum{" "}
            <Link
              href="/login"
              className="font-semibold text-blue-700 hover:text-blue-950"
            >
              Login
            </Link>
          </p>
        </div>
      </section>

      {showPopup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div className="max-w-lg w-full text-center rounded-3xl bg-[#0B1220]/95 p-8">
            <p className="text-2xl font-bold text-white mb-8">
              {popupMessage}
            </p>

            <button
              type="button"
              onClick={() => setShowPopup(false)}
              className="bg-blue-600 text-white px-10 py-4 rounded-2xl"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </main>
  );
}