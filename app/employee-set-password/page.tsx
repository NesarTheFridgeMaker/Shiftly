"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Eye,
  EyeOff,
  LockKeyhole,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type PageState = "checking" | "ready" | "saving" | "error";

const MIN_PASSWORD_LENGTH = 8;

export default function EmployeeSetPasswordPage() {
  const router = useRouter();

  const [pageState, setPageState] =
    useState<PageState>("checking");

  const [password, setPassword] = useState("");
  const [passwordRepeat, setPasswordRepeat] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordRepeat, setShowPasswordRepeat] =
    useState(false);

  const [errorMessage, setErrorMessage] = useState("");

  const passwordChecks = {
    minLength: password.length >= MIN_PASSWORD_LENGTH,
    hasLowercase: /[a-zäöüß]/.test(password),
    hasUppercase: /[A-ZÄÖÜ]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecialCharacter: /[^A-Za-zÄÖÜäöüß0-9]/.test(
      password,
    ),
  };

  const passwordIsValid = Object.values(passwordChecks).every(
    Boolean,
  );

  const passwordsMatch =
    passwordRepeat.length > 0 &&
    password === passwordRepeat;

  const passwordRepeatHasError =
    passwordRepeat.length > 0 &&
    password !== passwordRepeat;

  const canSubmit =
    pageState !== "saving" &&
    passwordIsValid &&
    passwordsMatch;

  useEffect(() => {
    let isMounted = true;

    async function checkSession() {
      setPageState("checking");
      setErrorMessage("");

      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (error) {
        console.error(
          "EMPLOYEE PASSWORD SESSION CHECK ERROR:",
          error,
        );

        setErrorMessage(
          "Der Einladungslink konnte nicht geprüft werden.",
        );
        setPageState("error");
        return;
      }

      if (!session?.user) {
        setErrorMessage(
          "Der Einladungslink ist ungültig oder abgelaufen. Bitte fordere bei deinem Betrieb eine neue Einladung an.",
        );
        setPageState("error");
        return;
      }

      if (!session.user.email_confirmed_at) {
        setErrorMessage(
          "Deine E-Mail-Adresse konnte noch nicht bestätigt werden.",
        );
        setPageState("error");
        return;
      }

      /*
       * Verhindert, dass Owner oder bereits vollständig
       * eingerichtete Benutzer diese Seite erneut verwenden.
       */
      const { data: existingProfile, error: profileError } =
        await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .maybeSingle();

      if (!isMounted) {
        return;
      }

      if (profileError) {
        console.error(
          "EMPLOYEE PASSWORD PROFILE CHECK ERROR:",
          profileError,
        );

        setErrorMessage(
          "Dein Benutzerkonto konnte nicht geprüft werden.",
        );
        setPageState("error");
        return;
      }

      if (
        existingProfile?.role === "owner" ||
        existingProfile?.role === "admin"
      ) {
        router.replace("/admin");
        return;
      }

      if (existingProfile?.role === "employee") {
        router.replace("/employee");
        return;
      }

      if (
        session.user.user_metadata?.registration_type ===
        "business_owner"
      ) {
        router.replace("/setup");
        return;
      }

      setPageState("ready");
    }

    void checkSession();

    return () => {
      isMounted = false;
    };
  }, [router]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (pageState === "saving") {
      return;
    }

    setErrorMessage("");

    if (!passwordIsValid) {
      setErrorMessage(
        "Das Passwort erfüllt noch nicht alle Sicherheitsanforderungen.",
      );
      return;
    }

    if (!passwordRepeat) {
      setErrorMessage(
        "Bitte wiederhole dein neues Passwort.",
      );
      return;
    }

    if (!passwordsMatch) {
      setErrorMessage(
        "Die beiden Passwörter stimmen nicht überein.",
      );
      return;
    }

    setPageState("saving");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setErrorMessage(
          "Deine Sitzung ist abgelaufen. Bitte öffne den Einladungslink erneut.",
        );
        setPageState("error");
        return;
      }

      const { error: passwordError } =
        await supabase.auth.updateUser({
          password,
        });

      if (passwordError) {
        console.error(
          "EMPLOYEE PASSWORD UPDATE ERROR:",
          passwordError,
        );

        const message = passwordError.message.toLowerCase();

        if (
          message.includes("same password") ||
          message.includes("different from the old password")
        ) {
          setErrorMessage(
            "Bitte wähle ein anderes Passwort.",
          );
        } else if (
          message.includes("weak") ||
          message.includes("password")
        ) {
          setErrorMessage(
            "Das Passwort erfüllt die Sicherheitsanforderungen nicht.",
          );
        } else if (
          message.includes("session") ||
          message.includes("expired") ||
          message.includes("jwt")
        ) {
          setErrorMessage(
            "Deine Sitzung ist abgelaufen. Bitte öffne den Einladungslink erneut.",
          );
        } else {
          setErrorMessage(
            passwordError.message ||
              "Das Passwort konnte nicht gespeichert werden.",
          );
        }

        setPageState("ready");
        return;
      }

      router.replace("/employee-setup");
    } catch (error) {
      console.error(
        "EMPLOYEE SET PASSWORD ERROR:",
        error,
      );

      setErrorMessage(
        "Beim Speichern des Passworts ist ein unerwarteter Fehler aufgetreten.",
      );
      setPageState("ready");
    }
  }

  async function handleBackToLogin() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-white px-5 py-28 text-[#323542] sm:px-8">
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
        {pageState === "checking" ? (
          <div className="py-6 text-center">
            <div className="mx-auto mb-7 flex h-16 w-16 items-center justify-center rounded-[20px] bg-white">
              <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#E7EDF1] border-t-[#31AEF0]" />
            </div>

            <div className="mb-4 inline-flex rounded-full bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-[#168FD0]">
              Einladung prüfen
            </div>

            <h1 className="text-[30px] font-bold leading-[1.12] tracking-[-0.035em] text-black sm:text-[36px]">
              Einladung wird geprüft
            </h1>

            <p className="mt-4 text-[15px] leading-7 text-[#667085]">
              Bitte warte einen Augenblick.
            </p>
          </div>
        ) : pageState === "error" ? (
          <div className="py-2 text-center">
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

            <div className="mb-4 inline-flex rounded-full bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-[#D92D20]">
              Einladung
            </div>

            <h1 className="text-[30px] font-bold leading-[1.12] tracking-[-0.035em] text-black sm:text-[36px]">
              Einladung nicht verfügbar
            </h1>

            <p className="mx-auto mt-5 max-w-[400px] text-[15px] leading-7 text-[#323542]">
              {errorMessage}
            </p>

            <button
              type="button"
              onClick={() => void handleBackToLogin()}
              className="mt-8 flex min-h-[54px] w-full items-center justify-center rounded-[16px] border border-black/[0.08] bg-white px-6 text-[15px] font-bold text-black transition hover:bg-[#E7EDF1]"
            >
              Zurück zum Login
            </button>
          </div>
        ) : (
          <>
            <div className="text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-[20px] bg-white text-[#168FD0]">
                <LockKeyhole size={28} strokeWidth={1.8} />
              </div>

              <div className="mb-4 inline-flex rounded-full bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-[#168FD0]">
                Zugang einrichten
              </div>

              <h1 className="text-[30px] font-bold leading-[1.12] tracking-[-0.035em] text-black sm:text-[36px]">
                Passwort festlegen
              </h1>

              <p className="mx-auto mt-4 max-w-[390px] text-[15px] leading-7 text-[#667085]">
                Lege jetzt ein sicheres Passwort für deinen
                Dipera-Zugang fest.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="mt-8 space-y-6"
            >
              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-bold text-black"
                >
                  Neues Passwort
                </label>

                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setErrorMessage("");
                    }}
                    autoComplete="new-password"
                    required
                    disabled={pageState === "saving"}
                    className="h-[54px] w-full rounded-[16px] border border-black/[0.08] bg-white px-4 pr-12 text-[15px] text-black outline-none transition placeholder:text-[#8B93A1] focus:border-[#31AEF0] focus:ring-4 focus:ring-[#31AEF0]/10 disabled:cursor-not-allowed disabled:opacity-60"
                    placeholder="Sicheres Passwort eingeben"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword((current) => !current)
                    }
                    disabled={pageState === "saving"}
                    aria-label={
                      showPassword
                        ? "Passwort ausblenden"
                        : "Passwort anzeigen"
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-[10px] p-2 text-[#8B93A1] transition hover:bg-[#F2F5F8] hover:text-black disabled:cursor-not-allowed"
                  >
                    {showPassword ? (
                      <EyeOff size={20} />
                    ) : (
                      <Eye size={20} />
                    )}
                  </button>
                </div>

                <div className="mt-4 rounded-[18px] bg-white px-4 py-4">
                  <p className="mb-3 text-xs font-bold uppercase tracking-[0.08em] text-[#667085]">
                    Dein Passwort benötigt
                  </p>

                  <div className="space-y-2.5">
                    <PasswordRequirement
                      fulfilled={passwordChecks.minLength}
                      label={`Mindestens ${MIN_PASSWORD_LENGTH} Zeichen`}
                    />

                    <PasswordRequirement
                      fulfilled={passwordChecks.hasLowercase}
                      label="Mindestens ein Kleinbuchstabe"
                    />

                    <PasswordRequirement
                      fulfilled={passwordChecks.hasUppercase}
                      label="Mindestens ein Großbuchstabe"
                    />

                    <PasswordRequirement
                      fulfilled={passwordChecks.hasNumber}
                      label="Mindestens eine Zahl"
                    />

                    <PasswordRequirement
                      fulfilled={
                        passwordChecks.hasSpecialCharacter
                      }
                      label="Mindestens ein Sonderzeichen"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label
                  htmlFor="passwordRepeat"
                  className="mb-2 block text-sm font-bold text-black"
                >
                  Passwort wiederholen
                </label>

                <div className="relative">
                  <input
                    id="passwordRepeat"
                    name="passwordRepeat"
                    type={
                      showPasswordRepeat ? "text" : "password"
                    }
                    value={passwordRepeat}
                    onChange={(event) => {
                      setPasswordRepeat(event.target.value);
                      setErrorMessage("");
                    }}
                    autoComplete="new-password"
                    required
                    disabled={pageState === "saving"}
                    className={`h-[54px] w-full rounded-[16px] border bg-white px-4 pr-12 text-[15px] text-black outline-none transition placeholder:text-[#8B93A1] focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60 ${
                      passwordsMatch
                        ? "border-emerald-400 focus:border-emerald-500 focus:ring-emerald-100"
                        : passwordRepeatHasError
                          ? "border-red-400 focus:border-red-500 focus:ring-red-100"
                          : "border-black/[0.08] focus:border-[#31AEF0] focus:ring-[#31AEF0]/10"
                    }`}
                    placeholder="Passwort erneut eingeben"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPasswordRepeat(
                        (current) => !current,
                      )
                    }
                    disabled={pageState === "saving"}
                    aria-label={
                      showPasswordRepeat
                        ? "Passwort ausblenden"
                        : "Passwort anzeigen"
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-[10px] p-2 text-[#8B93A1] transition hover:bg-[#F2F5F8] hover:text-black disabled:cursor-not-allowed"
                  >
                    {showPasswordRepeat ? (
                      <EyeOff size={20} />
                    ) : (
                      <Eye size={20} />
                    )}
                  </button>
                </div>

                {passwordsMatch ? (
                  <p className="mt-2 flex items-center gap-2 text-xs font-semibold text-emerald-600">
                    <Check size={15} strokeWidth={3} />
                    Die Passwörter stimmen überein.
                  </p>
                ) : passwordRepeatHasError ? (
                  <p className="mt-2 text-xs font-semibold text-red-600">
                    Die Passwörter stimmen nicht überein.
                  </p>
                ) : null}
              </div>

              {errorMessage ? (
                <div
                  role="alert"
                  className="rounded-[16px] border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
                >
                  {errorMessage}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={!canSubmit}
                className="flex min-h-[54px] w-full items-center justify-center rounded-[16px] bg-[#31AEF0] px-6 text-[15px] font-bold text-white transition hover:bg-[#219DDB] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pageState === "saving" ? (
                  <>
                    <span className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Passwort wird gespeichert
                  </>
                ) : (
                  "Passwort speichern und fortfahren"
                )}
              </button>
            </form>
          </>
        )}
      </section>
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