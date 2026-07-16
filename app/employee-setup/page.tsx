"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type SetupState = "loading" | "error";

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
       * Bereits bestehende Profile werden sofort weitergeleitet.
       */
      const { data: existingProfile, error: profileError } =
        await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

      if (profileError) {
        console.error(
          "EMPLOYEE SETUP PROFILE CHECK ERROR:",
          profileError
        );

        setErrorMessage(
          "Dein Benutzerprofil konnte nicht geprüft werden."
        );
        setSetupState("error");
        return;
      }

      if (
        existingProfile?.role === "owner" ||
        existingProfile?.role === "admin"
      ) {
        window.location.replace("/admin");
        return;
      }

      if (existingProfile?.role === "employee") {
        window.location.replace("/employee");
        return;
      }

      if (
        user.user_metadata?.registration_type ===
        "business_owner"
      ) {
        window.location.replace("/setup");
        return;
      }

      const { data: assignedRole, error: inviteError } =
        await supabase.rpc(
          "complete_employee_invite_from_metadata"
        );

      if (inviteError) {
        console.error(
          "AUTOMATIC EMPLOYEE INVITE ERROR:",
          inviteError
        );

        const message = inviteError.message.toLowerCase();

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
        } else {
          setErrorMessage(
            inviteError.message ||
              "Dein Mitarbeiter-Zugang konnte nicht aktiviert werden."
          );
        }

        setSetupState("error");
        return;
      }

      if (
        assignedRole === "owner" ||
        assignedRole === "admin"
      ) {
        window.location.replace("/admin");
        return;
      }

      if (assignedRole === "employee") {
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
      </div>

      <section className="relative z-10 w-full max-w-md rounded-3xl border border-white bg-white/95 p-8 text-center shadow-2xl">
        {setupState === "loading" ? (
          <>
            <div className="mx-auto mb-5 h-11 w-11 animate-spin rounded-full border-4 border-blue-100 border-t-[#005CA8]" />

            <h1 className="text-2xl font-semibold text-blue-950">
              Mitarbeiter-Zugang wird eingerichtet
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              Dein Konto wird automatisch mit deinem Betrieb
              verbunden. Bitte schließe diese Seite nicht.
            </p>
          </>
        ) : (
          <>
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-xl text-red-600">
              !
            </div>

            <h1 className="text-2xl font-semibold text-blue-950">
              Aktivierung nicht möglich
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              {errorMessage}
            </p>

            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => void completeEmployeeSetup()}
                className="h-12 rounded-xl bg-[#005CA8] font-semibold text-white transition hover:bg-[#004b8a]"
              >
                Erneut versuchen
              </button>

              <button
                type="button"
                onClick={async () => {
                  await supabase.auth.signOut();
                  window.location.replace("/login");
                }}
                className="h-12 rounded-xl border border-slate-300 bg-white font-semibold text-slate-700 transition hover:bg-slate-50"
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