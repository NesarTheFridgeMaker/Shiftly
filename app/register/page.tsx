"use client";

import Link from "next/link";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import DiperaPopup from "@/components/DiperaPopup";
import { supabase } from "@/lib/supabaseClient";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);

  const [popupMessage, setPopupMessage] = useState("");
  const [popupTitle, setPopupTitle] = useState("");
  const [popupVariant, setPopupVariant] = useState<
    "info" | "success" | "warning" | "danger"
  >("info");
  const [showPopup, setShowPopup] = useState(false);

  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-ZÄÖÜ]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(password);

  const passwordsMatch =
    confirmPassword.length > 0 && password === confirmPassword;

  const passwordIsValid =
    hasMinLength && hasUppercase && hasNumber && hasSpecialChar;

  function showDiperaPopup(
    message: string,
    options?: {
      title?: string;
      variant?: "info" | "success" | "warning" | "danger";
    },
  ) {
    setPopupMessage(message);
    setPopupTitle(options?.title ?? "");
    setPopupVariant(options?.variant ?? "info");
    setShowPopup(true);
  }

  async function handleRegister() {
    if (isLoading) return;

    const cleanedEmail = email.trim().toLowerCase();

    if (!cleanedEmail || !password || !confirmPassword) {
      showDiperaPopup("Bitte fülle alle Felder aus.", {
        title: "Angaben fehlen",
        variant: "warning",
      });
      return;
    }

    if (!passwordIsValid) {
      showDiperaPopup("Bitte erfülle alle Passwortanforderungen.", {
        title: "Passwort nicht sicher genug",
        variant: "warning",
      });
      return;
    }

    if (password !== confirmPassword) {
      showDiperaPopup("Die Passwörter stimmen nicht überein.", {
        title: "Passwörter prüfen",
        variant: "warning",
      });
      return;
    }

    setIsLoading(true);

    try {
      await supabase.auth.signOut();

      const { error: signUpError } = await supabase.auth.signUp({
        email: cleanedEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
          data: {
            registration_type: "business_owner",
          },
        },
      });

      if (signUpError) {
        console.error("OWNER SIGN-UP ERROR:", signUpError);

        const normalizedMessage = signUpError.message.toLowerCase();

        if (
          normalizedMessage.includes("already") ||
          normalizedMessage.includes("registered") ||
          normalizedMessage.includes("exists")
        ) {
          showDiperaPopup(
            "Für diese E-Mail-Adresse existiert bereits ein Dipera-Konto. Bitte melde dich an oder nutze „Passwort vergessen“.",
            {
              title: "Konto bereits vorhanden",
              variant: "warning",
            },
          );
          return;
        }

        showDiperaPopup(
          signUpError.message ||
            "Das Dipera-Konto konnte nicht erstellt werden.",
          {
            title: "Registrierung fehlgeschlagen",
            variant: "danger",
          },
        );
        return;
      }

      setPassword("");
      setConfirmPassword("");

      showDiperaPopup(
        "Wir haben einen Bestätigungslink an deine E-Mail-Adresse versendet. Schaue bei Bedarf auch im Spamordner nach.",
        {
          title: "E-Mail bestätigen",
          variant: "success",
        },
      );
    } catch (error) {
      console.error("OWNER REGISTRATION ERROR:", error);

      showDiperaPopup(
        "Bei der Registrierung ist ein unerwarteter Fehler aufgetreten. Bitte versuche es erneut.",
        {
          title: "Registrierung fehlgeschlagen",
          variant: "danger",
        },
      );
    } finally {
      setIsLoading(false);
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

      <section className="relative z-10 mt-16 w-full max-w-md rounded-3xl border border-white bg-white/95 p-6 shadow-2xl sm:mt-0 sm:p-8">
        <div className="mb-8 text-center">
          <h1 className="text-[2.25rem] font-light leading-tight tracking-[-0.04em] text-blue-950 sm:text-[2.6rem]">
            Registrieren
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Erstelle dein Dipera-Konto. Deinen Betrieb richtest du danach ein.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <input
            type="email"
            autoComplete="email"
            placeholder="E-Mail-Adresse"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={isLoading}
            className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-black outline-none transition focus:border-[#005CA8] focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
          />

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Passwort"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={isLoading}
              className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 pr-12 text-black outline-none transition focus:border-[#005CA8] focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
            />

            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              disabled={isLoading}
              aria-label={
                showPassword ? "Passwort ausblenden" : "Passwort anzeigen"
              }
              className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed"
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>

          <div className="-mt-1 space-y-1 text-sm">
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

          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Passwort wiederholen"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              disabled={isLoading}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleRegister();
                }
              }}
              className={[
                "h-12 w-full rounded-xl border bg-white px-4 pr-12 text-black outline-none transition",
                "focus:ring-4 disabled:cursor-not-allowed disabled:bg-slate-100",
                confirmPassword.length === 0
                  ? "border-slate-300 focus:border-[#005CA8] focus:ring-blue-100"
                  : passwordsMatch
                    ? "border-green-500 focus:border-green-600 focus:ring-green-100"
                    : "border-red-400 focus:border-red-500 focus:ring-red-100",
              ].join(" ")}
            />

            <button
              type="button"
              onClick={() => setShowConfirmPassword((current) => !current)}
              disabled={isLoading}
              aria-label={
                showConfirmPassword
                  ? "Passwortwiederholung ausblenden"
                  : "Passwortwiederholung anzeigen"
              }
              className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed"
            >
              {showConfirmPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>

          {confirmPassword.length > 0 && (
            <p
              className={`-mt-2 text-sm ${
                passwordsMatch ? "text-green-600" : "text-red-600"
              }`}
            >
              {passwordsMatch
                ? "✓ Die Passwörter stimmen überein."
                : "Die Passwörter stimmen noch nicht überein."}
            </p>
          )}

          <button
            type="button"
            onClick={() => void handleRegister()}
            disabled={isLoading}
            className="mt-1 h-12 rounded-xl bg-[#005CA8] font-semibold text-white transition hover:bg-[#004b8a] disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {isLoading ? "Registrierung läuft..." : "Konto erstellen"}
          </button>

          <p className="mt-2 text-center text-sm text-slate-500">
            Bereits registriert?{" "}
            <Link
              href="/login"
              className="font-semibold text-[#005CA8] hover:text-blue-950"
            >
              Zum Login
            </Link>
          </p>
        </div>
      </section>

      <DiperaPopup
        open={showPopup}
        title={popupTitle || undefined}
        message={popupMessage}
        variant={popupVariant}
        onClose={() => setShowPopup(false)}
      />
    </main>
  );
}