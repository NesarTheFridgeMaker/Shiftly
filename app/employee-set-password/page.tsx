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

      <section className="relative z-10 w-full max-w-md rounded-3xl border border-white bg-white/95 p-6 shadow-2xl sm:p-8">
        {pageState === "checking" ? (
          <div className="py-5 text-center">
            <div className="mx-auto mb-5 h-11 w-11 animate-spin rounded-full border-4 border-blue-100 border-t-[#005CA8]" />

            <h1 className="text-2xl font-semibold text-blue-950">
              Einladung wird geprüft
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              Bitte warte einen Augenblick.
            </p>
          </div>
        ) : pageState === "error" ? (
          <div className="py-2 text-center">
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-xl font-semibold text-red-600">
              !
            </div>

            <h1 className="text-2xl font-semibold text-blue-950">
              Einladung nicht verfügbar
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              {errorMessage}
            </p>

            <button
              type="button"
              onClick={() => void handleBackToLogin()}
              className="mt-6 h-12 w-full rounded-xl border border-slate-300 bg-white font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Zurück zum Login
            </button>
          </div>
        ) : (
          <>
            <div className="text-center">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-[#005CA8]">
                <LockKeyhole size={26} />
              </div>

              <h1 className="text-2xl font-semibold text-blue-950">
                Passwort festlegen
              </h1>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                Lege jetzt ein sicheres Passwort für deinen
                Dipera-Zugang fest.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="mt-7 space-y-5"
            >
              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium text-slate-700"
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
                    className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 pr-12 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#005CA8] focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed"
                  >
                    {showPassword ? (
                      <EyeOff size={20} />
                    ) : (
                      <Eye size={20} />
                    )}
                  </button>
                </div>

                <div className="mt-4 space-y-2">
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

              <div>
                <label
                  htmlFor="passwordRepeat"
                  className="mb-2 block text-sm font-medium text-slate-700"
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
                    className={`h-12 w-full rounded-xl border bg-white px-4 pr-12 text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-4 disabled:cursor-not-allowed disabled:bg-slate-50 ${
                      passwordsMatch
                        ? "border-emerald-400 focus:border-emerald-500 focus:ring-emerald-100"
                        : passwordRepeatHasError
                          ? "border-red-400 focus:border-red-500 focus:ring-red-100"
                          : "border-slate-300 focus:border-[#005CA8] focus:ring-blue-100"
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed"
                  >
                    {showPasswordRepeat ? (
                      <EyeOff size={20} />
                    ) : (
                      <Eye size={20} />
                    )}
                  </button>
                </div>

                {passwordsMatch ? (
                  <p className="mt-2 flex items-center gap-2 text-xs font-medium text-emerald-600">
                    <Check size={15} strokeWidth={3} />
                    Die Passwörter stimmen überein.
                  </p>
                ) : passwordRepeatHasError ? (
                  <p className="mt-2 text-xs font-medium text-red-600">
                    Die Passwörter stimmen nicht überein.
                  </p>
                ) : null}
              </div>

              {errorMessage ? (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
                >
                  {errorMessage}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={!canSubmit}
                className="flex h-12 w-full items-center justify-center rounded-xl bg-[#005CA8] font-semibold text-white transition hover:bg-[#004b8a] disabled:cursor-not-allowed disabled:opacity-50"
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
      className={`flex items-center gap-2 text-xs transition ${
        fulfilled
          ? "font-medium text-emerald-600"
          : "text-slate-400"
      }`}
    >
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${
          fulfilled
            ? "border-emerald-500 bg-emerald-500 text-white"
            : "border-slate-300 bg-white text-transparent"
        }`}
      >
        <Check size={13} strokeWidth={3} />
      </span>

      <span>{label}</span>
    </div>
  );
}