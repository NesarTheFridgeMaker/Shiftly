"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

import { supabase } from "@/lib/supabaseClient";
import type { EmailOtpType } from "@supabase/supabase-js";

const ALLOWED_NEXT_PATHS = new Set([
  "/employee-set-password",
  "/employee-setup",
  "/setup",
  "/admin",
  "/employee",
]);

function getSafeNextPath(value: string | null) {
  if (!value) {
    return null;
  }

  return ALLOWED_NEXT_PATHS.has(value) ? value : null;
}

function AuthCallbackContent() {
  const searchParams = useSearchParams();
  const hasStarted = useRef(false);

  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (hasStarted.current) {
      return;
    }

    hasStarted.current = true;

async function completeEmailConfirmation() {
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const verificationType = searchParams.get("type");

  const requestedNextPath = getSafeNextPath(
    searchParams.get("next"),
  );

  try {
    let user = null;

    if (code) {
      const { data, error: exchangeError } =
        await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        console.error(
          "EMAIL CONFIRMATION CODE EXCHANGE ERROR:",
          exchangeError,
        );

        setErrorMessage(
  exchangeError.message
);
        return;
      }

      user = data.user;
    } else if (
      tokenHash &&
      verificationType === "invite"
    ) {
      const { data, error: verificationError } =
        await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: "invite",
        });

      if (verificationError) {
        console.error(
          "EMAIL INVITE TOKEN VERIFICATION ERROR:",
          verificationError,
        );

        setErrorMessage(
          "Der Einladungslink ist ungültig, abgelaufen oder wurde bereits verwendet.",
        );
        return;
      }

      user = data.user;
    } else {
      setErrorMessage(
        "Der Bestätigungslink ist ungültig oder unvollständig.",
      );
      return;
    }

    if (!user) {
      setErrorMessage(
        "Die E-Mail-Adresse wurde bestätigt, aber der Benutzer konnte nicht geladen werden.",
      );
      return;
    }

    // Ab hier bleibt dein bisheriger Code bestehen:
    if (requestedNextPath) {
      window.location.replace(requestedNextPath);
      return;
    }
        /*
         * Bereits vorhandenes Dipera-Profil laden.
         */
        const { data: profile, error: profileError } =
          await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .maybeSingle();

        if (profileError) {
          console.error(
            "EMAIL CONFIRMATION PROFILE LOAD ERROR:",
            profileError,
          );

          setErrorMessage(
            "Deine E-Mail-Adresse wurde bestätigt, aber dein Dipera-Profil konnte nicht geladen werden.",
          );
          return;
        }

        if (profile?.role === "owner" || profile?.role === "admin") {
          window.location.replace("/admin");
          return;
        }

        if (profile?.role === "employee") {
          window.location.replace("/employee");
          return;
        }

        /*
         * Noch kein Profil vorhanden:
         * Anhand der Auth-Metadaten unterscheiden wir zwischen
         * Mitarbeiterregistrierung und Betriebsregistrierung.
         */
        const metadata = user.user_metadata ?? {};

        const isEmployeeInvite =
          metadata.registration_type === "employee_invite" ||
          Boolean(metadata.invite_id) ||
          Boolean(metadata.invite_code) ||
          Boolean(metadata.employee_id);

        if (isEmployeeInvite) {
          /*
           * Beim WhatsApp-/Registrierungsweg wurde das Passwort
           * bereits auf employee-register festgelegt.
           */
          window.location.replace("/employee-setup");
          return;
        }

        /*
         * Owner-Registrierung ohne vorhandenes Profil.
         */
        window.location.replace("/setup");
      } catch (error) {
        console.error(
          "EMAIL CONFIRMATION CALLBACK ERROR:",
          error,
        );

        setErrorMessage(
          "Bei der Bestätigung ist ein unerwarteter Fehler aufgetreten.",
        );
      }
    }

    void completeEmailConfirmation();
  }, [searchParams]);

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
        {!errorMessage ? (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
              <div className="h-7 w-7 animate-spin rounded-full border-4 border-blue-200 border-t-[#005CA8]" />
            </div>

            <h1 className="mt-6 text-[2.1rem] font-light leading-tight tracking-[-0.04em] text-blue-950 sm:text-[2.45rem]">
              E-Mail wird bestätigt
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              Einen Moment bitte. Wir aktivieren deinen
              Dipera-Zugang und leiten dich anschließend weiter.
            </p>
          </>
        ) : (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-3xl">
              !
            </div>

            <h1 className="mt-6 text-[2.1rem] font-light leading-tight tracking-[-0.04em] text-blue-950 sm:text-[2.45rem]">
              Bestätigung fehlgeschlagen
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              {errorMessage}
            </p>

            <Link
              href="/login"
              className="mt-6 flex h-12 w-full items-center justify-center rounded-xl bg-[#005CA8] font-semibold text-white transition hover:bg-[#004b8a]"
            >
              Zur Loginseite
            </Link>
          </>
        )}
      </section>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f7f7f8]">
          <p className="text-slate-500">
            Bestätigung wird verarbeitet...
          </p>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}