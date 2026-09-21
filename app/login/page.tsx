"use client";

import Link from "next/link";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const [showPopup, setShowPopup] = useState(false);

  function showDiperaPopup(text: string) {
    setPopupMessage(text);
    setShowPopup(true);
  }

  async function handleLogin() {
    if (!email || !password) {
      showDiperaPopup("Bitte E-Mail und Passwort eingeben.");
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      showDiperaPopup(`Login fehlgeschlagen: ${error.message}`);
      return;
    }

    const user = data.user;

    if (!user) {
      showDiperaPopup("Benutzer konnte nicht geladen werden.");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error(profileError);
      showDiperaPopup("Profil konnte nicht geladen werden.");
      return;
    }

    if (!profile) {
      const registrationType = user.user_metadata?.registration_type;

      if (registrationType === "employee_invite") {
        window.location.assign("/employee-setup");
        return;
      }

      window.location.assign("/setup");
      return;
    }

    if (profile.role === "admin" || profile.role === "owner") {
      window.location.assign("/admin");
      return;
    }

    if (profile.role === "employee") {
      window.location.assign("/employee");
      return;
    }

    showDiperaPopup("Unbekannte Benutzerrolle.");
  }

  return (
    <main className="min-h-screen bg-white text-[#24324d]">
      <div className="grid min-h-screen lg:grid-cols-[52%_48%]">
        {/* =========================================================
            LINKE SEITE – DIPERA MARKENFLÄCHE
        ========================================================== */}
        <section className="relative hidden min-h-screen overflow-hidden bg-[#102b4c] lg:flex lg:items-center">
          <div className="w-full px-16 xl:px-24 2xl:px-32">
            {/* Logo */}
            <Link href="/" className="mb-14 inline-flex">
              <img
                src="/logo/dipera-logo-light.png"
                alt="Dipera"
                className="h-auto w-[180px]"
              />
            </Link>

            {/* Text */}
            <div className="max-w-[650px]">
              <p className="mb-5 text-[13px] font-bold uppercase tracking-[0.22em] text-[#31aef0]">
                Willkommen bei Dipera
              </p>

              <h2 className="text-[48px] font-bold leading-[1.06] tracking-[-0.045em] text-white xl:text-[58px]">
                Dein Arbeitsplatz.
                <br />
                <span className="text-[#31aef0]">
                  Einfach organisiert.
                </span>
              </h2>

              <p className="mt-7 max-w-[590px] text-[17px] leading-8 text-[#aebed1] xl:text-[18px]">
                Arbeitszeiten, Dienstpläne und Abwesenheiten übersichtlich
                verwalten – alles an einem Ort für dich und dein Team.
              </p>
            </div>

            {/* Kleine Trennlinie */}
            <div className="mt-12 h-[2px] w-16 rounded-full bg-[#31aef0]" />

            <p className="mt-6 max-w-[480px] text-[14px] leading-6 text-[#7f94ac]">
              Einfach. Übersichtlich. Dipera.
            </p>
          </div>
        </section>

        {/* =========================================================
            RECHTE SEITE – LOGIN
        ========================================================== */}
        <section className="relative flex min-h-screen items-center justify-center bg-white px-5 py-10 sm:px-8 lg:px-12 xl:px-20">
          {/* Logo auf Mobile */}
          <Link href="/" className="absolute left-6 top-6 lg:hidden">
            <img
              src="/logo/dipera-logo-dark.png"
              alt="Dipera"
              className="h-auto w-[125px]"
            />
          </Link>

          <div className="w-full max-w-[470px] pt-16 lg:pt-0">
            {/* Überschrift */}
            <div className="mb-9">
              <p className="mb-3 text-[13px] font-bold uppercase tracking-[0.18em] text-[#31aef0]">
                Willkommen zurück
              </p>

              <h1 className="text-[38px] font-bold leading-tight tracking-[-0.045em] text-[#24324d] sm:text-[44px]">
                Einloggen
              </h1>

              <p className="mt-3 text-[15px] leading-6 text-[#64748b]">
                Melde dich an und greife auf dein Dipera-Konto zu.
              </p>

              <p className="mt-4 text-[14px] text-[#64748b]">
                Noch kein Konto?{" "}
                <Link
                  href="/register"
                  className="font-bold text-[#31aef0] transition hover:text-[#168dcc]"
                >
                  Kostenlos registrieren
                </Link>
              </p>
            </div>

            {/* Formular */}
            <div className="space-y-5">
              {/* E-Mail */}
              <div>
                <label
                  htmlFor="login-email"
                  className="mb-2 block text-[14px] font-semibold text-[#24324d]"
                >
                  E-Mail-Adresse
                </label>

                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@unternehmen.de"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-[54px] w-full rounded-xl border border-[#d7e0ea] bg-white px-4 text-[15px] text-[#24324d] outline-none transition placeholder:text-slate-400 focus:border-[#31aef0] focus:ring-4 focus:ring-[#31aef0]/10"
                />
              </div>

              {/* Passwort */}
              <div>
                <div className="mb-2 flex items-center justify-between gap-4">
                  <label
                    htmlFor="login-password"
                    className="block text-[14px] font-semibold text-[#24324d]"
                  >
                    Passwort
                  </label>

                  <Link
                    href="/forgot-password"
                    className="text-[13px] font-semibold text-[#31aef0] transition hover:text-[#168dcc]"
                  >
                    Passwort vergessen?
                  </Link>
                </div>

                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Passwort eingeben"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void handleLogin();
                      }
                    }}
                    className="h-[54px] w-full rounded-xl border border-[#d7e0ea] bg-white px-4 pr-12 text-[15px] text-[#24324d] outline-none transition placeholder:text-slate-400 focus:border-[#31aef0] focus:ring-4 focus:ring-[#31aef0]/10"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword((current) => !current)
                    }
                    aria-label={
                      showPassword
                        ? "Passwort ausblenden"
                        : "Passwort anzeigen"
                    }
                    className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-[#24324d]"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Login Button */}
              <button
                type="button"
                onClick={() => void handleLogin()}
                className="group mt-2 flex h-[58px] w-full items-center justify-center rounded-full bg-[#102b4c] px-7 text-[15px] font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#0a203b]"
              >
                Einloggen

                <span
                  className="ml-4 text-xl transition-transform group-hover:translate-x-1"
                  aria-hidden="true"
                >
                  →
                </span>
              </button>
            </div>

            <p className="mt-7 text-center text-[13px] leading-6 text-slate-400">
              Sicherer Zugriff auf deine Dipera-Arbeitsumgebung.
            </p>
          </div>
        </section>
      </div>

      {/* =========================================================
          POPUP
      ========================================================== */}
      {showPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-[#0B1220]/95 p-8 text-center">
            <p className="mb-8 text-2xl font-bold text-white">
              {popupMessage}
            </p>

            <button
              type="button"
              onClick={() => setShowPopup(false)}
              className="rounded-2xl bg-[#31aef0] px-10 py-4 font-semibold text-white transition hover:bg-[#168dcc]"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </main>
  );
}