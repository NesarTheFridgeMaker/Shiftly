"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";


function EmployeeRegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [inviteCode, setInviteCode] = useState("");
  useEffect(() => {
  const invite = searchParams.get("invite");

  if (invite) {
    setInviteCode(invite);
  }
}, [searchParams]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const [showPopup, setShowPopup] = useState(false);

  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-ZÄÖÜ]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(password);

  function showDiperaPopup(text: string) {
    setPopupMessage(text);
    setShowPopup(true);
  }

async function handleRegister() {
  if (isLoading) return;

  const cleanedInviteCode = inviteCode.trim().toUpperCase();
  const cleanedEmail = email.trim().toLowerCase();

  if (
    !cleanedInviteCode ||
    !cleanedEmail ||
    !password ||
    !confirmPassword
  ) {
    showDiperaPopup("Bitte fülle alle Felder aus.");
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
    showDiperaPopup("Bitte erfülle alle Passwortanforderungen.");
    return;
  }

  setIsLoading(true);

  try {
    /*
     * Beim Testen kann im selben Browser noch ein Owner oder Admin
     * angemeldet sein. Diese Sitzung zuerst beenden.
     */
    await supabase.auth.signOut();

    /*
     * 1. Einladung serverseitig prüfen
     */
    const validateResponse = await fetch(
      "/api/employee-register/validate",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inviteCode: cleanedInviteCode,
        }),
      }
    );

    const validateResult = (await validateResponse.json()) as {
      success?: boolean;
      message?: string;
      role?: string;
    };

    if (!validateResponse.ok || !validateResult.success) {
      showDiperaPopup(
        validateResult.message ??
          "Der Einladungscode konnte nicht geprüft werden."
      );
      return;
    }

    /*
     * 2. Normale Registrierung mit E-Mail-Bestätigung
     */
    const appUrl =
      window.location.origin;

      console.log("VOR signUp");

    const { data, error: signUpError } =
      await supabase.auth.signUp({
        email: cleanedEmail,
        password,
        options: {
          emailRedirectTo: `${appUrl}/auth/callback`,
          data: {
            registration_type: "employee_invite",
            invite_code: cleanedInviteCode,
          },
        },
      });

      console.log("NACH signUp", {
  error: signUpError,
  session: data.session,
  user: data.user,
});

    if (signUpError) {
      console.error(
        "EMPLOYEE SIGN-UP ERROR:",
        signUpError
      );

      const normalizedMessage =
        signUpError.message.toLowerCase();

      if (
        normalizedMessage.includes("already") ||
        normalizedMessage.includes("registered") ||
        normalizedMessage.includes("exists")
      ) {
        showDiperaPopup(
          "Für diese E-Mail-Adresse existiert bereits ein Dipera-Konto. Bitte melde dich mit deinem bestehenden Konto an oder verwende eine andere E-Mail-Adresse."
        );
        return;
      }

      showDiperaPopup(
        signUpError.message ||
          "Der Mitarbeiter-Zugang konnte nicht erstellt werden."
      );
      return;
    }

    if (!data.user) {
      showDiperaPopup(
        "Der Mitarbeiter-Zugang konnte nicht erstellt werden."
      );
      return;
    }

    /*
     * Bei aktivierter E-Mail-Bestätigung ist data.session normalerweise null.
     * Der Benutzer wird erst nach Klick auf den E-Mail-Link angemeldet.
     */
    console.log("EMPLOYEE SIGN-UP RESULT:", {
  userId: data.user?.id,
  emailConfirmedAt: data.user?.email_confirmed_at,
  hasSession: Boolean(data.session),
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
});

if (data.session) {
  await supabase.auth.signOut();

  showDiperaPopup(
    "Fehler bei der E-Mail-Bestätigung: Supabase hat den Zugang sofort freigeschaltet. Bitte prüfe die Browser-Konsole."
  );

  return;
}

showDiperaPopup(
  "Fast geschafft! Wir haben dir eine Bestätigungs-E-Mail geschickt. Bitte öffne die E-Mail und bestätige deine Adresse, um die Registrierung abzuschließen."
);

setPassword("");
setConfirmPassword("");
  } catch (error) {
    console.error(
      "EMPLOYEE REGISTRATION ERROR:",
      error
    );

    showDiperaPopup(
      "Bei der Registrierung ist ein unerwarteter Fehler aufgetreten. Bitte versuche es erneut."
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
            Mitarbeiter-Zugang
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Gib deinen Einladungscode ein und erstelle deinen persönlichen
            Dipera-Zugang.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <input
            type="text"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            placeholder="Einladungscode, z. B. DIPERA-ABC123"
            value={inviteCode}
            onChange={(event) =>
              setInviteCode(event.target.value.toUpperCase())
            }
            disabled={isLoading}
            className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 font-mono text-sm font-semibold tracking-wide text-black outline-none transition focus:border-[#005CA8] focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
          />

          <input
            type="email"
            autoComplete="email"
            placeholder="E-Mail-Adresse"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={isLoading}
            className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-black outline-none transition focus:border-[#005CA8] focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
          />

          <input
            type="password"
            autoComplete="new-password"
            placeholder="Passwort"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={isLoading}
            className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-black outline-none transition focus:border-[#005CA8] focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
          />

          <div className="-mt-1 space-y-1 text-sm">
            <div className={`flex items-center gap-2 ${hasMinLength ? "text-green-600" : "text-slate-500"}`}>
              <span>{hasMinLength ? "✓" : "○"}</span>
              <span>Mindestens 8 Zeichen</span>
            </div>
            <div className={`flex items-center gap-2 ${hasUppercase ? "text-green-600" : "text-slate-500"}`}>
              <span>{hasUppercase ? "✓" : "○"}</span>
              <span>Mindestens ein Großbuchstabe</span>
            </div>
            <div className={`flex items-center gap-2 ${hasNumber ? "text-green-600" : "text-slate-500"}`}>
              <span>{hasNumber ? "✓" : "○"}</span>
              <span>Mindestens eine Zahl</span>
            </div>
            <div className={`flex items-center gap-2 ${hasSpecialChar ? "text-green-600" : "text-slate-500"}`}>
              <span>{hasSpecialChar ? "✓" : "○"}</span>
              <span>Mindestens ein Sonderzeichen</span>
            </div>
          </div>

          <input
            type="password"
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
            className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-black outline-none transition focus:border-[#005CA8] focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
          />

          <button
            type="button"
            onClick={() => void handleRegister()}
            disabled={isLoading}
            className="mt-1 h-12 rounded-xl bg-[#005CA8] font-semibold text-white transition hover:bg-[#004b8a] disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {isLoading ? "Zugang wird erstellt..." : "Zugang erstellen"}
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
export default function EmployeeRegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p>Registrierungsseite wird geladen...</p>
        </div>
      }
    >
      <EmployeeRegisterContent />
    </Suspense>
  );
}
