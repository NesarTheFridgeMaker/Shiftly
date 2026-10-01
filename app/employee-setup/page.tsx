"use client";

import Image from "next/image";
import { Be_Vietnam_Pro } from "next/font/google";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type SetupState = "loading" | "error";

type CompleteEmployeeSetupResponse = {
  role?: "owner" | "admin" | "employee";
  error?: string;
  activationCompleted?: boolean;
};

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export default function EmployeeSetupPage() {
  const [setupState, setSetupState] =
    useState<SetupState>("loading");

  const [errorMessage, setErrorMessage] = useState("");

  const completeEmployeeSetup = useCallback(async () => {
    setSetupState("loading");
    setErrorMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        window.location.replace("/login");
        return;
      }

      if (!user.email_confirmed_at) {
        await supabase.auth.signOut();
        window.location.replace("/login");
        return;
      }

      /*
       * Bereits bestehende Profile werden grundsätzlich direkt
       * weitergeleitet.
       *
       * Ausnahme:
       * Ein Mitarbeiterprofil kann bereits durch einen vorherigen
       * Aktivierungsversuch angelegt worden sein, während der
       * anschließende Stripe-Sync fehlgeschlagen ist.
       *
       * In diesem Fall muss die serverseitige Complete-Route erneut
       * aufgerufen werden können. Deshalb verwenden wir die direkte
       * Weiterleitung nur für Business-Owner.
       */
      if (
        user.user_metadata?.registration_type ===
        "business_owner"
      ) {
        const { data: existingOwnerProfile } =
          await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .maybeSingle();

        if (
          existingOwnerProfile?.role === "owner" ||
          existingOwnerProfile?.role === "admin"
        ) {
          window.location.replace("/admin");
          return;
        }

        window.location.replace("/setup");
        return;
      }

      /*
       * Für Mitarbeiter-/Admin-Einladungen wird bewusst die
       * serverseitige Route verwendet. Sie führt zuerst den
       * idempotenten Invite-RPC mit dem Benutzer-Token aus und
       * synchronisiert anschließend die Stripe-Abrechnung.
       */
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (
        sessionError ||
        !session?.access_token
      ) {
        await supabase.auth.signOut();
        window.location.replace("/login");
        return;
      }

      const response = await fetch(
        "/api/employee-setup/complete",
        {
          method: "POST",
          headers: {
            Authorization:
              `Bearer ${session.access_token}`,
          },
        }
      );

      let result: CompleteEmployeeSetupResponse = {};

      try {
        result =
          (await response.json()) as CompleteEmployeeSetupResponse;
      } catch {
        result = {};
      }

      if (!response.ok) {
        console.error(
          "AUTOMATIC EMPLOYEE SETUP ERROR:",
          result
        );

        const rawMessage =
          result.error ||
          "Dein Mitarbeiter-Zugang konnte nicht aktiviert werden.";

        const message = rawMessage.toLowerCase();

        if (
          message.includes("bereits verwendet") ||
          message.includes("ungültig")
        ) {
          setErrorMessage(
            "Die Einladung ist ungültig oder wurde bereits verwendet. Bitte wende dich an deinen Betrieb."
          );
        } else if (
          message.includes("kein einladungscode")
        ) {
          setErrorMessage(
            "Deinem Konto konnte keine Einladung zugeordnet werden. Bitte registriere dich erneut über den Einladungslink."
          );
        } else if (result.activationCompleted) {
          setErrorMessage(
            "Dein Mitarbeiterkonto wurde aktiviert, aber die Abrechnung konnte noch nicht synchronisiert werden. Bitte klicke auf „Erneut versuchen“."
          );
        } else {
          setErrorMessage(rawMessage);
        }

        setSetupState("error");
        return;
      }

      if (
        result.role === "owner" ||
        result.role === "admin"
      ) {
        window.location.replace("/admin");
        return;
      }

      if (result.role === "employee") {
        window.location.replace("/employee");
        return;
      }

      setErrorMessage(
        "Die Benutzerrolle konnte nicht bestimmt werden."
      );
      setSetupState("error");
    } catch (error) {
      console.error("EMPLOYEE SETUP ERROR:", error);

      setErrorMessage(
        "Bei der Aktivierung ist ein unerwarteter Fehler aufgetreten."
      );
      setSetupState("error");
    }
  }, []);

  useEffect(() => {
    void completeEmployeeSetup();
  }, [completeEmployeeSetup]);

  return (
    <main
      className={`${beVietnamPro.className} relative flex min-h-screen items-center justify-center overflow-hidden bg-white px-5 py-28 text-[#323542] sm:px-8`}
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
        <Image
          src="/logo/dipera-logo-dark.png"
          alt="Dipera"
          width={1024}
          height={280}
          priority
          className="h-auto w-[140px] sm:w-[150px]"
        />
      </div>

      {/* Inhalt */}
      <section className="relative z-10 w-full max-w-[520px] rounded-[30px] bg-[#F2F5F8] px-6 py-9 text-center sm:px-10 sm:py-11">
        {setupState === "loading" ? (
          <>
            <div className="mx-auto mb-7 flex h-16 w-16 items-center justify-center rounded-[20px] bg-white">
              <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#E7EDF1] border-t-[#31AEF0]" />
            </div>

            <div className="mx-auto mb-4 inline-flex rounded-full bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-[#168FD0]">
              Zugang aktivieren
            </div>

            <h1 className="text-[30px] font-bold leading-[1.12] tracking-[-0.035em] text-black sm:text-[36px]">
              Mitarbeiter-Zugang wird eingerichtet
            </h1>

            <p className="mx-auto mt-5 max-w-[390px] text-[15px] leading-7 text-[#323542]">
              Dein Konto wird automatisch mit deinem Betrieb verbunden. Bitte
              schließe diese Seite nicht.
            </p>

            <div className="mx-auto mt-8 flex max-w-[330px] items-center justify-center gap-2 text-sm text-[#667085]">
              <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-[#31AEF0]" />
              <span>Aktivierung läuft</span>
            </div>
          </>
        ) : (
          <>
            <div className="mx-auto mb-7 flex h-16 w-16 items-center justify-center rounded-[20px] bg-white">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-7 w-7 text-[#D92D20]"
                aria-hidden="true"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="9"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <path
                  d="M12 7.5v6"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <path
                  d="M12 17h.01"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <div className="mx-auto mb-4 inline-flex rounded-full bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-[#D92D20]">
              Aktivierung fehlgeschlagen
            </div>

            <h1 className="text-[30px] font-bold leading-[1.12] tracking-[-0.035em] text-black sm:text-[36px]">
              Aktivierung nicht möglich
            </h1>

            <p className="mx-auto mt-5 max-w-[400px] text-[15px] leading-7 text-[#323542]">
              {errorMessage}
            </p>

            <div className="mt-8 flex flex-col gap-3">
              <button
                type="button"
                onClick={() =>
                  void completeEmployeeSetup()
                }
                className="flex min-h-[54px] w-full items-center justify-center rounded-[16px] bg-[#31AEF0] px-6 text-[15px] font-bold text-white transition hover:bg-[#219DDB]"
              >
                Erneut versuchen
              </button>

              <button
                type="button"
                onClick={async () => {
                  await supabase.auth.signOut();
                  window.location.replace("/login");
                }}
                className="flex min-h-[54px] w-full items-center justify-center rounded-[16px] border border-black/[0.08] bg-white px-6 text-[15px] font-bold text-black transition hover:bg-[#E7EDF1]"
              >
                Zurück zum Login
              </button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}