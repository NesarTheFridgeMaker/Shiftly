"use client";



import Link from "next/link";
import { Be_Vietnam_Pro } from "next/font/google";

import { useState } from "react";

import {

  Check,

  Eye,

  EyeOff,

  ShieldCheck,

  Smartphone,

  Timer,

} from "lucide-react";



import DiperaPopup from "@/components/DiperaPopup";

import { supabase } from "@/lib/supabaseClient";



const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

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

    <main className={`${beVietnamPro.className} min-h-screen bg-white text-[#323542]`}>

      <div className="grid min-h-screen lg:grid-cols-[52%_48%]">

        {/* =========================================================

            LINKE SEITE – DIPERA MARKENBEREICH

        ========================================================== */}

        <section className="relative hidden min-h-screen overflow-hidden bg-[#F2F5F8] lg:flex lg:flex-col">

          {/* Logo */}

          <div className="relative z-30 px-12 pt-10 xl:px-16 xl:pt-12">

            <Link href="/" className="inline-flex">

              <img

                src="/logo/dipera-logo-dark.png"

                alt="Dipera"

                className="h-auto w-[150px]"

              />

            </Link>

          </div>



          {/* Claim */}

          <div className="relative z-20 px-12 pt-12 xl:px-16 xl:pt-14">

            <p className="mb-4 text-[13px] font-bold uppercase tracking-[0.2em] text-[#31aef0]">

              Personalverwaltung einfach gemacht

            </p>



            <h2 className="max-w-[600px] text-[50px] font-bold leading-[1.02] tracking-[-0.05em] text-black xl:text-[62px]">

              Dein Team.

              <br />

              Deine Zeit.

              <span className="block text-[#31aef0]">

                Einfach organisiert.

              </span>

            </h2>



            <p className="mt-5 max-w-[520px] text-[16px] leading-7 text-[#323542] xl:text-[17px]">

              Arbeitszeiten, Dienstpläne und Abwesenheiten an einem Ort –

              übersichtlich für dich und einfach für dein Team.

            </p>

          </div>



          {/* Mitarbeiter + grafische Elemente */}

          <div className="relative mt-auto min-h-[410px] flex-1 xl:min-h-[460px]">

            {/* Dezenter Kreis hinter der Person */}

            <div

              aria-hidden="true"

              className="absolute bottom-[-160px] left-1/2 h-[540px] w-[540px] -translate-x-1/2 rounded-full bg-white/55 xl:h-[620px] xl:w-[620px]"

            />



            {/* Kleine Karte links */}

            <div className="absolute bottom-[205px] left-[7%] z-20 rounded-[24px] bg-white px-5 py-4 shadow-[0_16px_45px_rgba(36,50,77,0.10)] xl:left-[9%]">

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#31aef0]/10 text-[#31aef0]">

                  <Timer className="h-5 w-5" />

                </div>



                <div>

                  <p className="text-[11px] font-medium text-slate-400">

                    Zeiterfassung

                  </p>

                  <p className="text-[14px] font-bold text-black">

                    Einfach einstempeln

                  </p>

                </div>

              </div>

            </div>



            {/* Kleine Karte rechts */}

            <div className="absolute bottom-[285px] right-[6%] z-20 rounded-[24px] bg-white px-5 py-4 shadow-[0_16px_45px_rgba(36,50,77,0.10)] xl:right-[8%]">

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#31aef0]/10 text-[#31aef0]">

                  <Smartphone className="h-5 w-5" />

                </div>



                <div>

                  <p className="text-[11px] font-medium text-slate-400">

                    Mitarbeiter-App

                  </p>

                  <p className="text-[14px] font-bold text-black">

                    Immer dabei

                  </p>

                </div>

              </div>

            </div>



            {/* Mitarbeiter */}

            <div className="absolute bottom-[-70px] left-1/2 z-10 h-[500px] w-[465px] -translate-x-1/2 xl:h-[560px] xl:w-[520px]">

              <img

                src="/register-employee.png"

                alt="Mitarbeiter mit Smartphone"

                className="h-full w-full object-contain object-bottom"

              />

            </div>

            {/* Untere Vertrauenszeile */}

            <div className="absolute bottom-8 left-12 z-30 flex items-center gap-2 rounded-full bg-white/90 px-5 py-3 text-[13px] font-semibold text-[#323542] shadow-sm xl:left-16">

              <ShieldCheck className="h-4 w-4 text-[#31aef0]" />

              Einfach. Übersichtlich. Dipera.

            </div>

          </div>

        </section>



        {/* =========================================================

            RECHTE SEITE – REGISTRIERUNG

        ========================================================== */}

        <section className="relative flex min-h-screen items-center justify-center bg-white px-5 py-10 sm:px-8 lg:px-12 xl:px-20">

          {/* Mobile Logo */}

          <Link

            href="/"

            className="absolute left-6 top-6 lg:hidden"

          >

            <img

              src="/logo/dipera-logo-dark.png"

              alt="Dipera"

              className="h-auto w-[125px]"

            />

          </Link>



          <div className="w-full max-w-[470px] pt-16 lg:pt-0">

            {/* Kopfbereich */}

            <div className="mb-8">

              <p className="mb-3 text-[13px] font-bold uppercase tracking-[0.18em] text-[#31aef0]">

                Willkommen bei Dipera

              </p>



              <h1 className="text-[38px] font-bold leading-tight tracking-[-0.045em] text-black sm:text-[44px]">

                Konto erstellen

              </h1>



              <p className="mt-3 text-[15px] leading-7 text-[#323542]">

                Erstelle dein Dipera-Konto. Deinen Betrieb richtest du

                anschließend in wenigen Schritten ein.

              </p>



              <p className="mt-4 text-[14px] text-[#323542]">

                Du hast bereits ein Konto?{" "}

                <Link

                  href="/login"

                  className="font-bold text-[#31aef0] transition hover:text-[#168dcc]"

                >

                  Anmelden

                </Link>

              </p>

            </div>



            {/* Formular */}

            <div className="space-y-5">

              {/* E-Mail */}

              <div>

                <label

                  htmlFor="register-email"

                  className="mb-2.5 block text-[14px] font-semibold text-black"

                >

                  E-Mail-Adresse

                </label>



                <input

                  id="register-email"

                  type="email"

                  autoComplete="email"

                  placeholder="name@unternehmen.de"

                  value={email}

                  onChange={(event) => setEmail(event.target.value)}

                  disabled={isLoading}

                  className="h-[56px] w-full rounded-[18px] border border-transparent bg-[#F2F5F8] px-5 text-[15px] text-black outline-none transition placeholder:text-[#8B93A1] focus:border-[#31AEF0] focus:bg-white focus:ring-4 focus:ring-[#31AEF0]/10 disabled:cursor-not-allowed disabled:opacity-60"

                />

              </div>



              {/* Passwort */}

              <div>

                <label

                  htmlFor="register-password"

                  className="mb-2.5 block text-[14px] font-semibold text-black"

                >

                  Passwort

                </label>



                <div className="relative">

                  <input

                    id="register-password"

                    type={showPassword ? "text" : "password"}

                    autoComplete="new-password"

                    placeholder="Passwort erstellen"

                    value={password}

                    onChange={(event) => setPassword(event.target.value)}

                    disabled={isLoading}

                    className="h-[56px] w-full rounded-[18px] border border-transparent bg-[#F2F5F8] px-5 pr-12 text-[15px] text-black outline-none transition placeholder:text-[#8B93A1] focus:border-[#31AEF0] focus:bg-white focus:ring-4 focus:ring-[#31AEF0]/10 disabled:cursor-not-allowed disabled:opacity-60"

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

                    className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-[#7A8492] transition hover:bg-white hover:text-black disabled:cursor-not-allowed"

                  >

                    {showPassword ? (

                      <EyeOff className="h-5 w-5" />

                    ) : (

                      <Eye className="h-5 w-5" />

                    )}

                  </button>

                </div>

              </div>



              {/* Passwortregeln */}

              <div className="grid grid-cols-1 gap-2.5 rounded-[22px] bg-[#E7EDF1] p-5 sm:grid-cols-2">

                <PasswordRequirement

                  valid={hasMinLength}

                  label="Mindestens 8 Zeichen"

                />



                <PasswordRequirement

                  valid={hasUppercase}

                  label="Ein Großbuchstabe"

                />



                <PasswordRequirement

                  valid={hasNumber}

                  label="Mindestens eine Zahl"

                />



                <PasswordRequirement

                  valid={hasSpecialChar}

                  label="Ein Sonderzeichen"

                />

              </div>



              {/* Passwort wiederholen */}

              <div>

                <label

                  htmlFor="register-confirm-password"

                  className="mb-2.5 block text-[14px] font-semibold text-black"

                >

                  Passwort wiederholen

                </label>



                <div className="relative">

                  <input

                    id="register-confirm-password"

                    type={showConfirmPassword ? "text" : "password"}

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

                      "h-[56px] w-full rounded-[18px] border bg-[#F2F5F8] px-5 pr-12 text-[15px] text-black outline-none transition placeholder:text-[#8B93A1]",

                      "focus:bg-white focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60",

                      confirmPassword.length === 0

                        ? "border-transparent focus:border-[#31AEF0] focus:ring-[#31AEF0]/10"

                        : passwordsMatch

                          ? "border-emerald-400 focus:border-emerald-500 focus:ring-emerald-100"

                          : "border-red-400 focus:border-red-500 focus:ring-red-100",

                    ].join(" ")}

                  />



                  <button

                    type="button"

                    onClick={() =>

                      setShowConfirmPassword((current) => !current)

                    }

                    disabled={isLoading}

                    aria-label={

                      showConfirmPassword

                        ? "Passwortwiederholung ausblenden"

                        : "Passwortwiederholung anzeigen"

                    }

                    className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-[#7A8492] transition hover:bg-white hover:text-black disabled:cursor-not-allowed"

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

                    className={`mt-2 flex items-center gap-1.5 text-[13px] font-medium ${

                      passwordsMatch

                        ? "text-emerald-600"

                        : "text-red-600"

                    }`}

                  >

                    {passwordsMatch && (

                      <Check className="h-4 w-4" />

                    )}



                    {passwordsMatch

                      ? "Die Passwörter stimmen überein."

                      : "Die Passwörter stimmen noch nicht überein."}

                  </p>

                )}

              </div>



              {/* Hauptbutton */}

              <button

                type="button"

                onClick={() => void handleRegister()}

                disabled={isLoading}

                className="group mt-2 flex h-[58px] w-full items-center justify-center rounded-full bg-[#31AEF0] px-7 text-[15px] font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#219DE0] disabled:cursor-not-allowed disabled:translate-y-0 disabled:bg-[#AAB3BE]"

              >

                {isLoading ? (

                  "Registrierung läuft..."

                ) : (

                  <>

                    Konto erstellen

                    <span

                      className="ml-4 text-xl transition-transform group-hover:translate-x-1"

                      aria-hidden="true"

                    >

                      →

                    </span>

                  </>

                )}

              </button>

            </div>



            {/* Unterer Login-Link auf Mobile / zusätzlicher Abschluss */}

            <p className="mt-7 text-center text-[13px] leading-6 text-[#7A8492]">

              Mit deiner Registrierung erstellst du zunächst dein persönliches

              Dipera-Konto. Deinen Betrieb richtest du anschließend ein.

            </p>

          </div>

        </section>

      </div>



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



function PasswordRequirement({

  valid,

  label,

}: {

  valid: boolean;

  label: string;

}) {

  return (

    <div

      className={`flex items-center gap-2 text-[12px] font-medium transition ${

        valid ? "text-emerald-600" : "text-slate-500"

      }`}

    >

      <span

        className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full ${

          valid

            ? "bg-emerald-100 text-emerald-600"

            : "bg-slate-200 text-slate-400"

        }`}

      >

        {valid ? (

          <Check className="h-3 w-3" strokeWidth={3} />

        ) : (

          <span className="h-1.5 w-1.5 rounded-full bg-current" />

        )}

      </span>



      {label}

    </div>

  );

}