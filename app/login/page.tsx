"use client";



import Link from "next/link";
import { Be_Vietnam_Pro } from "next/font/google";

import { useState } from "react";

import { Eye, EyeOff } from "lucide-react";

import { supabase } from "@/lib/supabaseClient";



const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export default function LoginPage() {

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [popupMessage, setPopupMessage] = useState("");

  const [showPopup, setShowPopup] = useState(false);



  function showDiperaPopup(text: string) {

    setPopupMessage(text);

    setShowPopup(true);

  }



  async function handleLogin() {

    if (!email || !password) {

      showDiperaPopup("Bitte E-Mail und Passwort eingeben.");

      return;

    }



    const { data, error } = await supabase.auth.signInWithPassword({

      email,

      password,

    });



    if (error) {

      showDiperaPopup(`Login fehlgeschlagen: ${error.message}`);

      return;

    }



    const user = data.user;



    if (!user) {

      showDiperaPopup("Benutzer konnte nicht geladen werden.");

      return;

    }



    const { data: profile, error: profileError } = await supabase

      .from("profiles")

      .select("role")

      .eq("id", user.id)

      .maybeSingle();



    if (profileError) {

      console.error(profileError);

      showDiperaPopup("Profil konnte nicht geladen werden.");

      return;

    }



    if (!profile) {

      const registrationType = user.user_metadata?.registration_type;



      if (registrationType === "employee_invite") {

        window.location.assign("/employee-setup");

        return;

      }



      window.location.assign("/setup");

      return;

    }



    if (profile.role === "admin" || profile.role === "owner") {

      window.location.assign("/admin");

      return;

    }



    if (profile.role === "employee") {

      window.location.assign("/employee");

      return;

    }



    showDiperaPopup("Unbekannte Benutzerrolle.");

  }



  return (

    <main className={`${beVietnamPro.className} min-h-screen bg-white text-[#323542]`}>

      <div className="grid min-h-screen lg:grid-cols-[52%_48%]">

        {/* =========================================================

            LINKE SEITE – DIPERA MARKENFLÄCHE

        ========================================================== */}

        <section className="relative hidden min-h-screen overflow-hidden bg-[#F2F5F8] lg:flex lg:flex-col">
          <div className="relative z-30 px-12 pt-10 xl:px-16 xl:pt-12">
            <Link href="/" className="inline-flex">
              <img
                src="/logo/dipera-logo-dark.png"
                alt="Dipera"
                className="h-auto w-[150px]"
              />
            </Link>
          </div>

          <div className="relative z-20 px-12 pt-16 xl:px-16 xl:pt-20">
            <p className="mb-4 text-[13px] font-bold uppercase tracking-[0.2em] text-[#31AEF0]">
              Willkommen zurück
            </p>

            <h2 className="max-w-[610px] text-[50px] font-bold leading-[1.02] tracking-[-0.05em] text-black xl:text-[62px]">
              Dein Arbeitsplatz.
              <span className="block text-[#31AEF0]">Einfach organisiert.</span>
            </h2>

            <p className="mt-6 max-w-[540px] text-[16px] leading-7 text-[#323542] xl:text-[17px]">
              Arbeitszeiten, Dienstpläne und Abwesenheiten übersichtlich
              verwalten – alles an einem Ort für dich und dein Team.
            </p>
          </div>

          <div className="relative mt-auto flex-1">
            <div
              aria-hidden="true"
              className="absolute bottom-[-210px] left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-white/60 xl:h-[610px] xl:w-[610px]"
            />

            <div className="absolute bottom-16 left-12 right-12 z-20 grid gap-4 xl:left-16 xl:right-16 xl:grid-cols-2">
              <div className="rounded-[28px] bg-white px-7 py-7 shadow-[0_16px_45px_rgba(36,50,77,0.07)]">
                <span className="block h-12 w-[7px] rounded-full bg-[#31AEF0]" />
                <p className="mt-6 text-[20px] font-bold tracking-[-0.025em] text-black">
                  Alles an einem Ort
                </p>
                <p className="mt-3 text-[14px] leading-6 text-[#323542]">
                  Personal, Zeiten und Planung übersichtlich in Dipera verwalten.
                </p>
              </div>

              <div className="rounded-[28px] bg-white px-7 py-7 shadow-[0_16px_45px_rgba(36,50,77,0.07)]">
                <span className="block h-12 w-[7px] rounded-full bg-[#31AEF0]" />
                <p className="mt-6 text-[20px] font-bold tracking-[-0.025em] text-black">
                  Direkt weiterarbeiten
                </p>
                <p className="mt-3 text-[14px] leading-6 text-[#323542]">
                  Einloggen und direkt zurück in deinen Dipera-Arbeitsalltag.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            RECHTE SEITE – LOGIN
        ========================================================== */}
        <section className="relative flex min-h-screen items-center justify-center bg-white px-5 py-10 sm:px-8 lg:px-12 xl:px-20">

          {/* Logo auf Mobile */}

          <Link href="/" className="absolute left-6 top-6 lg:hidden">

            <img

              src="/logo/dipera-logo-dark.png"

              alt="Dipera"

              className="h-auto w-[125px]"

            />

          </Link>



          <div className="w-full max-w-[470px] pt-16 lg:pt-0">

            {/* Überschrift */}

            <div className="mb-9">

              <p className="mb-3 text-[13px] font-bold uppercase tracking-[0.18em] text-[#31aef0]">

                Willkommen zurück

              </p>



              <h1 className="text-[38px] font-bold leading-tight tracking-[-0.045em] text-black sm:text-[44px]">

                Einloggen

              </h1>



              <p className="mt-3 text-[15px] leading-6 text-[#323542]">

                Melde dich an und greife auf dein Dipera-Konto zu.

              </p>



              <p className="mt-4 text-[14px] text-[#323542]">

                Noch kein Konto?{" "}

                <Link

                  href="/register"

                  className="font-bold text-[#31aef0] transition hover:text-[#168dcc]"

                >

                  Kostenlos registrieren

                </Link>

              </p>

            </div>



            {/* Formular */}

            <div className="space-y-5">

              {/* E-Mail */}

              <div>

                <label

                  htmlFor="login-email"

                  className="mb-2 block text-[14px] font-semibold text-black"

                >

                  E-Mail-Adresse

                </label>



                <input

                  id="login-email"

                  type="email"

                  autoComplete="email"

                  placeholder="name@unternehmen.de"

                  value={email}

                  onChange={(event) => setEmail(event.target.value)}

                  className="h-[56px] w-full rounded-[18px] border border-transparent bg-[#F2F5F8] px-5 text-[15px] text-black outline-none transition placeholder:text-[#8B93A1] focus:border-[#31AEF0] focus:bg-white focus:ring-4 focus:ring-[#31AEF0]/10"

                />

              </div>



              {/* Passwort */}

              <div>

                <div className="mb-2 flex items-center justify-between gap-4">

                  <label

                    htmlFor="login-password"

                    className="block text-[14px] font-semibold text-black"

                  >

                    Passwort

                  </label>



                  <Link

                    href="/forgot-password"

                    className="text-[13px] font-semibold text-[#31aef0] transition hover:text-[#168dcc]"

                  >

                    Passwort vergessen?

                  </Link>

                </div>



                <div className="relative">

                  <input

                    id="login-password"

                    type={showPassword ? "text" : "password"}

                    autoComplete="current-password"

                    placeholder="Passwort eingeben"

                    value={password}

                    onChange={(event) => setPassword(event.target.value)}

                    onKeyDown={(event) => {

                      if (event.key === "Enter") {

                        event.preventDefault();

                        void handleLogin();

                      }

                    }}

                    className="h-[56px] w-full rounded-[18px] border border-transparent bg-[#F2F5F8] px-5 pr-12 text-[15px] text-black outline-none transition placeholder:text-[#8B93A1] focus:border-[#31AEF0] focus:bg-white focus:ring-4 focus:ring-[#31AEF0]/10"

                  />



                  <button

                    type="button"

                    onClick={() =>

                      setShowPassword((current) => !current)

                    }

                    aria-label={

                      showPassword

                        ? "Passwort ausblenden"

                        : "Passwort anzeigen"

                    }

                    className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[#7A8492] transition hover:bg-white hover:text-black"

                  >

                    {showPassword ? (

                      <EyeOff className="h-5 w-5" />

                    ) : (

                      <Eye className="h-5 w-5" />

                    )}

                  </button>

                </div>

              </div>



              {/* Login Button */}

              <button

                type="button"

                onClick={() => void handleLogin()}

                className="group mt-2 flex h-[58px] w-full items-center justify-center rounded-full bg-[#31AEF0] px-7 text-[15px] font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#219DE0]"

              >

                Einloggen



                <span

                  className="ml-4 text-xl transition-transform group-hover:translate-x-1"

                  aria-hidden="true"

                >

                  →

                </span>

              </button>

            </div>



            <p className="mt-7 text-center text-[13px] leading-6 text-[#7A8492]">

              Sicherer Zugriff auf deine Dipera-Arbeitsumgebung.

            </p>

          </div>

        </section>

      </div>



      {/* =========================================================

          POPUP

      ========================================================== */}

      {showPopup && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-6 backdrop-blur-sm">

          <div className="w-full max-w-lg rounded-[32px] bg-white p-8 text-center shadow-[0_24px_80px_rgba(36,50,77,0.18)]">

            <p className="mb-8 text-2xl font-bold text-black">

              {popupMessage}

            </p>



            <button

              type="button"

              onClick={() => setShowPopup(false)}

              className="rounded-2xl bg-[#31aef0] px-10 py-4 font-semibold text-white transition hover:bg-[#168dcc]"

            >

              OK

            </button>

          </div>

        </div>

      )}

    </main>

  );

}