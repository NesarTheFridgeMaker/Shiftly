"use client";

import Link from "next/link";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-ZÄÖÜ]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(password);
  const [isLoading, setIsLoading] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const [showPopup, setShowPopup] = useState(false);

  function showDiperaPopup(text: string) {
    setPopupMessage(text);
    setShowPopup(true);
  }

  async function handleRegister() {
    if (!email || !password || !confirmPassword) {
      showDiperaPopup("Bitte alle Felder ausfüllen.");
      return;
    }

    if (password !== confirmPassword) {
      showDiperaPopup("Die Passwörter stimmen nicht überein.");
      return;
    }

    if (
  !hasMinLength ||
  !hasUppercase ||
  !hasNumber ||
  !hasSpecialChar
) {
  showDiperaPopup(
    "Bitte erfülle alle Passwortanforderungen."
  );
  return;
}

    setIsLoading(true);

    await supabase.auth.signOut();

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
        data: {
          registration_type: "business_owner",
        },
      },
    });

    if (signUpError) {
  console.error(signUpError);

  if (
    signUpError.message.toLowerCase().includes("already") ||
    signUpError.message.toLowerCase().includes("registered") ||
    signUpError.message.toLowerCase().includes("exists")
  ) {
    showDiperaPopup(
      "Für diese E-Mail-Adresse existiert bereits ein Dipera-Konto. Bitte melde dich an oder nutze „Passwort vergessen“."
    );
  } else {
    showDiperaPopup(signUpError.message);
  }

  setIsLoading(false);
  return;
}

    setIsLoading(false);

    showDiperaPopup(
      "Wir haben einen Registrierungslink an deine E-Mail-Adresse versendet. Schaue wenn nötig auch in den Spamordner."
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
            Registrieren
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Erstelle dein Dipera-Konto. Deinen Betrieb richtest du danach ein.
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

          <input
            type="password"
            placeholder="Passwort"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="h-12 rounded-xl border border-slate-300 bg-white px-4 text-black outline-none focus:border-blue-700"
          />

          <div className="-mt-2 space-y-1 text-sm">

  <div
    className={`flex items-center gap-2 ${
      hasMinLength ? "text-green-600" : "text-slate-500"
    }`}
  >
    <span>{hasMinLength ? "✓" : "○"}</span>
    <span>Mindestens 8 Zeichen</span>
  </div>

  <div
    className={`flex items-center gap-2 ${
      hasUppercase ? "text-green-600" : "text-slate-500"
    }`}
  >
    <span>{hasUppercase ? "✓" : "○"}</span>
    <span>Mindestens ein Großbuchstabe</span>
  </div>

  <div
    className={`flex items-center gap-2 ${
      hasNumber ? "text-green-600" : "text-slate-500"
    }`}
  >
    <span>{hasNumber ? "✓" : "○"}</span>
    <span>Mindestens eine Zahl</span>
  </div>

  <div
    className={`flex items-center gap-2 ${
      hasSpecialChar ? "text-green-600" : "text-slate-500"
    }`}
  >
    <span>{hasSpecialChar ? "✓" : "○"}</span>
    <span>Mindestens ein Sonderzeichen</span>
  </div>

</div>

          <input
            type="password"
            placeholder="Passwort wiederholen"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="h-12 rounded-xl border border-slate-300 bg-white px-4 text-black outline-none focus:border-blue-700"
          />

          <button
            type="button"
            onClick={handleRegister}
            disabled={isLoading}
            className="h-12 rounded-xl bg-blue-700 text-white font-semibold hover:bg-blue-800 transition disabled:bg-gray-400"
          >
            {isLoading ? "Registrierung läuft..." : "Konto erstellen"}
          </button>

          <p className="text-center text-sm text-slate-500 mt-2">
            Bereits registriert?{" "}
            <Link
              href="/login"
              className="font-semibold text-blue-700 hover:text-blue-950"
            >
              Zum Login
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