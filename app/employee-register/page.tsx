"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Eye, EyeOff } from "lucide-react";
import { Be_Vietnam_Pro } from "next/font/google";

import DiperaPopup from "@/components/DiperaPopup";
import { supabase } from "@/lib/supabaseClient";

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

function EmployeeRegisterContent() {
  const searchParams = useSearchParams();

  const [inviteCode, setInviteCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

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

  useEffect(() => {
    const invite = searchParams.get("invite");

    if (invite) {
      setInviteCode(invite.toUpperCase());
    }
  }, [searchParams]);

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

    const cleanedInviteCode = inviteCode.trim().toUpperCase();
    const cleanedEmail = email.trim().toLowerCase();

    if (
      !cleanedInviteCode ||
      !cleanedEmail ||
      !password ||
      !confirmPassword
    ) {
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
        },
      );

      let validateResult: {
        success?: boolean;
        message?: string;
        role?: string;
      } = {};

      try {
        validateResult = (await validateResponse.json()) as {
          success?: boolean;
          message?: string;
          role?: string;
        };
      } catch {
        showDiperaPopup(
          "Die Einladung konnte nicht geprüft werden. Bitte versuche es erneut.",
          {
            title: "Einladung nicht verfügbar",
            variant: "danger",
          },
        );
        return;
      }

      if (!validateResponse.ok || !validateResult.success) {
        showDiperaPopup(
          validateResult.message ??
            "Der Einladungscode konnte nicht geprüft werden.",
          {
            title: "Einladung ungültig",
            variant: "warning",
          },
        );
        return;
      }

      const appUrl = window.location.origin;

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

      if (signUpError) {
        console.error("EMPLOYEE SIGN-UP ERROR:", signUpError);

        const normalizedMessage =
          signUpError.message.toLowerCase();

        if (
          normalizedMessage.includes("already") ||
          normalizedMessage.includes("registered") ||
          normalizedMessage.includes("exists")
        ) {
          showDiperaPopup(
            "Für diese E-Mail-Adresse existiert bereits ein Dipera-Konto. Bitte melde dich mit deinem bestehenden Konto an oder verwende eine andere E-Mail-Adresse.",
            {
              title: "Konto bereits vorhanden",
              variant: "warning",
            },
          );
          return;
        }

        showDiperaPopup(
          signUpError.message ||
            "Der Mitarbeiter-Zugang konnte nicht erstellt werden.",
          {
            title: "Registrierung fehlgeschlagen",
            variant: "danger",
          },
        );
        return;
      }

      if (!data.user) {
        showDiperaPopup(
          "Der Mitarbeiter-Zugang konnte nicht erstellt werden.",
          {
            title: "Registrierung fehlgeschlagen",
            variant: "danger",
          },
        );
        return;
      }

      setPassword("");
      setConfirmPassword("");

      if (data.session) {
        await supabase.auth.signOut();

        showDiperaPopup(
          "Die Registrierung wurde angelegt. Bitte prüfe jetzt deine E-Mails und bestätige deine E-Mail-Adresse.",
          {
            title: "E-Mail bestätigen",
            variant: "success",
          },
        );
        return;
      }

      showDiperaPopup(
        "Fast geschafft! Wir haben dir eine Bestätigungs-E-Mail geschickt. Bitte öffne die E-Mail und bestätige deine Adresse, um die Registrierung abzuschließen.",
        {
          title: "E-Mail bestätigen",
          variant: "success",
        },
      );
    } catch (error) {
      console.error("EMPLOYEE REGISTRATION ERROR:", error);

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
        <img
          src="/logo/dipera-logo-dark.png"
          alt="Dipera"
          className="h-auto w-[140px] sm:w-[150px]"
        />
      </div>

      <section className="relative z-10 w-full max-w-[540px] rounded-[30px] bg-[#F2F5F8] px-6 py-9 sm:px-10 sm:py-11">
        <div className="text-center">
          <div className="mb-4 inline-flex rounded-full bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-[#168FD0]">
            Einladung
          </div>

          <h1 className="text-[32px] font-bold leading-[1.1] tracking-[-0.04em] text-black sm:text-[40px]">
            Mitarbeiter-Zugang
          </h1>

          <p className="mx-auto mt-4 max-w-[410px] text-[15px] leading-7 text-[#667085]">
            Gib deinen Einladungscode ein und erstelle deinen persönlichen
            Dipera-Zugang.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-5">
          {/* Einladungscode */}
          <div>
            <label
              htmlFor="inviteCode"
              className="mb-2 block text-sm font-bold text-black"
            >
              Einladungscode
            </label>

            <input
              id="inviteCode"
              type="text"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              placeholder="z. B. DIPERA-ABC123"
              value={inviteCode}
              onChange={(event) =>
                setInviteCode(event.target.value.toUpperCase())
              }
              disabled={isLoading}
              className="h-[54px] w-full rounded-[16px] border border-black/[0.08] bg-white px-4 font-mono text-sm font-semibold tracking-wide text-black outline-none transition placeholder:font-sans placeholder:font-normal placeholder:tracking-normal placeholder:text-[#8B93A1] focus:border-[#31AEF0] focus:ring-4 focus:ring-[#31AEF0]/10 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>

          {/* E-Mail */}
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-bold text-black"
            >
              E-Mail-Adresse
            </label>

            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="name@unternehmen.de"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={isLoading}
              className="h-[54px] w-full rounded-[16px] border border-black/[0.08] bg-white px-4 text-[15px] text-black outline-none transition placeholder:text-[#8B93A1] focus:border-[#31AEF0] focus:ring-4 focus:ring-[#31AEF0]/10 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>

          {/* Passwort */}
          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-bold text-black"
            >
              Passwort
            </label>

            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Sicheres Passwort eingeben"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                disabled={isLoading}
                className="h-[54px] w-full rounded-[16px] border border-black/[0.08] bg-white px-4 pr-12 text-[15px] text-black outline-none transition placeholder:text-[#8B93A1] focus:border-[#31AEF0] focus:ring-4 focus:ring-[#31AEF0]/10 disabled:cursor-not-allowed disabled:opacity-60"
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword((current) => !current)
                }
                disabled={isLoading}
                aria-label={
                  showPassword
                    ? "Passwort ausblenden"
                    : "Passwort anzeigen"
                }
                className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-[10px] text-[#8B93A1] transition hover:bg-[#F2F5F8] hover:text-black disabled:cursor-not-allowed"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>

            <div className="mt-4 rounded-[18px] bg-white px-4 py-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.08em] text-[#667085]">
                Dein Passwort benötigt
              </p>

              <div className="space-y-2.5">
                <PasswordRequirement
                  fulfilled={hasMinLength}
                  label="Mindestens 8 Zeichen"
                />

                <PasswordRequirement
                  fulfilled={hasUppercase}
                  label="Mindestens ein Großbuchstabe"
                />

                <PasswordRequirement
                  fulfilled={hasNumber}
                  label="Mindestens eine Zahl"
                />

                <PasswordRequirement
                  fulfilled={hasSpecialChar}
                  label="Mindestens ein Sonderzeichen"
                />
              </div>
            </div>
          </div>

          {/* Passwort wiederholen */}
          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-2 block text-sm font-bold text-black"
            >
              Passwort wiederholen
            </label>

            <div className="relative">
              <input
                id="confirmPassword"
                type={
                  showConfirmPassword ? "text" : "password"
                }
                autoComplete="new-password"
                placeholder="Passwort erneut eingeben"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(event.target.value)
                }
                disabled={isLoading}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void handleRegister();
                  }
                }}
                className={[
                  "h-[54px] w-full rounded-[16px] border bg-white px-4 pr-12 text-[15px] text-black outline-none transition placeholder:text-[#8B93A1]",
                  "focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60",
                  confirmPassword.length === 0
                    ? "border-black/[0.08] focus:border-[#31AEF0] focus:ring-[#31AEF0]/10"
                    : passwordsMatch
                      ? "border-emerald-400 focus:border-emerald-500 focus:ring-emerald-100"
                      : "border-red-400 focus:border-red-500 focus:ring-red-100",
                ].join(" ")}
              />

              <button
                type="button"
                onClick={() =>
                  setShowConfirmPassword(
                    (current) => !current,
                  )
                }
                disabled={isLoading}
                aria-label={
                  showConfirmPassword
                    ? "Passwortwiederholung ausblenden"
                    : "Passwortwiederholung anzeigen"
                }
                className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-[10px] text-[#8B93A1] transition hover:bg-[#F2F5F8] hover:text-black disabled:cursor-not-allowed"
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
                className={`mt-2 flex items-center gap-2 text-xs font-semibold ${
                  passwordsMatch
                    ? "text-emerald-600"
                    : "text-red-600"
                }`}
              >
                {passwordsMatch && (
                  <Check size={15} strokeWidth={3} />
                )}

                {passwordsMatch
                  ? "Die Passwörter stimmen überein."
                  : "Die Passwörter stimmen noch nicht überein."}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => void handleRegister()}
            disabled={isLoading}
            className="mt-1 flex min-h-[54px] w-full items-center justify-center rounded-[16px] bg-[#31AEF0] px-6 text-[15px] font-bold text-white transition hover:bg-[#219DDB] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <span className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Zugang wird erstellt...
              </>
            ) : (
              "Zugang erstellen"
            )}
          </button>

          <p className="text-center text-sm leading-6 text-[#667085]">
            Bereits registriert?{" "}
            <Link
              href="/login"
              className="font-bold text-[#168FD0] transition hover:text-[#0F76AE]"
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

type PasswordRequirementProps = {
  fulfilled: boolean;
  label: string;
};

function PasswordRequirement({
  fulfilled,
  label,
}: PasswordRequirementProps) {
  return (
    <div
      className={`flex items-center gap-2.5 text-xs transition ${
        fulfilled
          ? "font-semibold text-emerald-600"
          : "text-[#667085]"
      }`}
    >
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${
          fulfilled
            ? "border-emerald-500 bg-emerald-500 text-white"
            : "border-[#C8D0D9] bg-[#F2F5F8] text-transparent"
        }`}
      >
        <Check size={13} strokeWidth={3} />
      </span>

      <span>{label}</span>
    </div>
  );
}

export default function EmployeeRegisterPage() {
  return (
    <Suspense
      fallback={
        <div
          className={`${beVietnamPro.className} flex min-h-screen items-center justify-center bg-white`}
        >
          <div className="flex flex-col items-center">
            <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#E7EDF1] border-t-[#31AEF0]" />

            <p className="mt-4 text-sm text-[#667085]">
              Registrierungsseite wird geladen...
            </p>
          </div>
        </div>
      }
    >
      <EmployeeRegisterContent />
    </Suspense>
  );
}