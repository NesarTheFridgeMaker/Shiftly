"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function EmployeeSetupPage() {
  const [inviteCode, setInviteCode] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const [showPopup, setShowPopup] = useState(false);

  function showDiperaPopup(message: string) {
    setPopupMessage(message);
    setShowPopup(true);
  }

  useEffect(() => {
    async function checkAccess() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      if (!user.email_confirmed_at) {
        await supabase.auth.signOut();
        window.location.href = "/login";
        return;
      }

      if (
        user.user_metadata?.registration_type === "business_owner"
      ) {
        window.location.href = "/setup";
        return;
      }

      const { data: profile, error: profileError } =
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

        showDiperaPopup(
          "Dein Benutzerprofil konnte nicht geprüft werden."
        );
        setCheckingAuth(false);
        return;
      }

      if (profile?.role === "employee") {
        window.location.href = "/employee";
        return;
      }

      if (
        profile?.role === "admin" ||
        profile?.role === "owner"
      ) {
        window.location.href = "/admin";
        return;
      }

      setCheckingAuth(false);
    }

    void checkAccess();
  }, []);

  async function handleCompleteInvite() {
    if (isLoading) return;

    const cleanedInviteCode =
      inviteCode.trim().toUpperCase();

    if (!cleanedInviteCode) {
      showDiperaPopup(
        "Bitte gib deinen Einladungscode ein."
      );
      return;
    }

    setIsLoading(true);

    try {
      const {
        data: assignedRole,
        error,
      } = await supabase.rpc(
        "complete_employee_invite_v2",
        {
          p_invite_code: cleanedInviteCode,
        }
      );

      if (error) {
        console.error(
          "COMPLETE EMPLOYEE INVITE ERROR:",
          error
        );

        const message = error.message.toLowerCase();

        if (
          message.includes("invalid") ||
          message.includes("not found") ||
          message.includes("ungültig")
        ) {
          showDiperaPopup(
            "Der Einladungscode ist ungültig oder gehört nicht zu diesem Konto."
          );
        } else if (
          message.includes("used") ||
          message.includes("already") ||
          message.includes("verwendet")
        ) {
          showDiperaPopup(
            "Dieser Einladungscode wurde bereits verwendet."
          );
        } else {
          showDiperaPopup(
            error.message ||
              "Der Mitarbeiter-Zugang konnte nicht aktiviert werden."
          );
        }

        return;
      }

      if (
        assignedRole === "admin" ||
        assignedRole === "owner"
      ) {
        window.location.replace("/admin");
        return;
      }

      if (assignedRole === "employee") {
        window.location.replace("/employee");
        return;
      }

      showDiperaPopup(
        "Die Benutzerrolle konnte nach der Aktivierung nicht bestimmt werden."
      );

    } catch (error) {
      console.error(
        "EMPLOYEE SETUP ERROR:",
        error
      );

      showDiperaPopup(
        "Bei der Aktivierung ist ein unerwarteter Fehler aufgetreten. Bitte versuche es erneut."
      );
    } finally {
      setIsLoading(false);
    }
  }

  if (checkingAuth) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f7f7f8] p-4">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 bottom-16 h-72 w-[55rem] rotate-[-18deg] rounded-full bg-gradient-to-r from-blue-100/40 via-white to-blue-200/30 blur-2xl" />
          <div className="absolute right-20 top-24 h-80 w-[38rem] rotate-[22deg] rounded-full bg-gradient-to-r from-white via-blue-100/50 to-slate-200/40 blur-2xl" />
        </div>

        <div className="relative z-10 w-full max-w-sm rounded-3xl border border-white bg-white/95 p-6 text-center shadow-2xl">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-blue-100 border-t-[#005CA8]" />

          <p className="text-sm font-medium text-slate-600">
            Mitarbeiter-Zugang wird geprüft...
          </p>
        </div>
      </main>
    );
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
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EFF6FF] text-xl text-[#005CA8]">
            ✓
          </div>

          <h1 className="text-[2.25rem] font-light leading-tight tracking-[-0.04em] text-blue-950 sm:text-[2.6rem]">
            Zugang aktivieren
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Verbinde dein bestätigtes Dipera-Konto mit deinem
            Mitarbeiterprofil.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="invite-code"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Einladungscode
            </label>

            <input
              id="invite-code"
              type="text"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              placeholder="z. B. DIPERA-ABC123"
              value={inviteCode}
              onChange={(event) =>
                setInviteCode(
                  event.target.value.toUpperCase()
                )
              }
              disabled={isLoading}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleCompleteInvite();
                }
              }}
              className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 font-mono text-sm font-semibold tracking-wide text-black outline-none transition focus:border-[#005CA8] focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
            />
          </div>

          <div className="rounded-2xl border border-[#DBEAFE] bg-[#EFF6FF] p-4">
            <p className="text-sm font-semibold text-[#0F172A]">
              So funktioniert die Aktivierung
            </p>

            <p className="mt-1 text-sm leading-6 text-[#64748B]">
              Der Einladungscode ordnet dein Konto dem richtigen
              Betrieb und deinem persönlichen Mitarbeiterprofil zu.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              void handleCompleteInvite()
            }
            disabled={isLoading}
            className="mt-1 h-12 rounded-xl bg-[#005CA8] font-semibold text-white transition hover:bg-[#004b8a] disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {isLoading
              ? "Zugang wird aktiviert..."
              : "Mitarbeiter-Zugang aktivieren"}
          </button>

          <p className="text-center text-xs leading-5 text-slate-400">
            Nach erfolgreicher Aktivierung wirst du direkt zu
            deinem Dashboard weitergeleitet.
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
