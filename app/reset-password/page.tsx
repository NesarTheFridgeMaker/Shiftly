"use client";



import { FormEvent, useState } from "react";

import { useRouter } from "next/navigation";
import { Be_Vietnam_Pro } from "next/font/google";

import {

  Check,

  Eye,

  EyeOff,

  LockKeyhole,

} from "lucide-react";



import DiperaPopup from "@/components/DiperaPopup";

import { supabase } from "@/lib/supabaseClient";



const MIN_PASSWORD_LENGTH = 8;

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});



export default function ResetPasswordPage() {

  const router = useRouter();



  const [password, setPassword] = useState("");

  const [confirmPassword, setConfirmPassword] =

    useState("");



  const [showPassword, setShowPassword] = useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =

    useState(false);



  const [isLoading, setIsLoading] = useState(false);



  const [popupMessage, setPopupMessage] = useState("");

  const [showPopup, setShowPopup] = useState(false);

  const [passwordWasChanged, setPasswordWasChanged] =

    useState(false);



  const passwordChecks = {

    minLength: password.length >= MIN_PASSWORD_LENGTH,

    hasLowercase: /[a-zäöüß]/.test(password),

    hasUppercase: /[A-ZÄÖÜ]/.test(password),

    hasNumber: /\d/.test(password),

    hasSpecialCharacter:

      /[^A-Za-zÄÖÜäöüß0-9]/.test(password),

  };



  const passwordIsValid = Object.values(

    passwordChecks,

  ).every(Boolean);



  const passwordsMatch =

    confirmPassword.length > 0 &&

    password === confirmPassword;



  const confirmPasswordHasError =

    confirmPassword.length > 0 &&

    password !== confirmPassword;



  const canSubmit =

    !isLoading &&

    passwordIsValid &&

    passwordsMatch;



  function showDiperaPopup(

    message: string,

    success = false,

  ) {

    setPopupMessage(message);

    setPasswordWasChanged(success);

    setShowPopup(true);

  }



  async function handleResetPassword(

    event: FormEvent<HTMLFormElement>,

  ) {

    event.preventDefault();



    if (isLoading) {

      return;

    }



    if (!passwordIsValid) {

      showDiperaPopup(

        "Das Passwort erfüllt noch nicht alle Sicherheitsanforderungen.",

      );

      return;

    }



    if (!confirmPassword) {

      showDiperaPopup(

        "Bitte wiederhole dein neues Passwort.",

      );

      return;

    }



    if (!passwordsMatch) {

      showDiperaPopup(

        "Die beiden Passwörter stimmen nicht überein.",

      );

      return;

    }



    setIsLoading(true);



    try {

      const {

        data: { user },

        error: userError,

      } = await supabase.auth.getUser();



      if (userError || !user) {

        showDiperaPopup(

          "Deine Sitzung ist ungültig oder abgelaufen. Bitte fordere einen neuen Link zum Zurücksetzen des Passworts an.",

        );

        return;

      }



      const { error: passwordError } =

        await supabase.auth.updateUser({

          password,

        });



      if (passwordError) {

        console.error(

          "RESET PASSWORD UPDATE ERROR:",

          passwordError,

        );



        const message =

          passwordError.message.toLowerCase();



        if (

          message.includes("same password") ||

          message.includes(

            "different from the old password",

          )

        ) {

          showDiperaPopup(

            "Bitte wähle ein anderes Passwort als dein bisheriges Passwort.",

          );

        } else if (

          message.includes("weak") ||

          message.includes("password")

        ) {

          showDiperaPopup(

            "Das Passwort erfüllt die Sicherheitsanforderungen nicht.",

          );

        } else if (

          message.includes("session") ||

          message.includes("expired") ||

          message.includes("jwt")

        ) {

          showDiperaPopup(

            "Der Link zum Zurücksetzen des Passworts ist abgelaufen. Bitte fordere einen neuen Link an.",

          );

        } else {

          showDiperaPopup(

            passwordError.message ||

              "Das Passwort konnte nicht gespeichert werden.",

          );

        }



        return;

      }



      showDiperaPopup(

        "Dein Passwort wurde erfolgreich geändert. Du kannst dich jetzt mit deinem neuen Passwort anmelden.",

        true,

      );

    } catch (error) {

      console.error("RESET PASSWORD ERROR:", error);



      showDiperaPopup(

        "Beim Speichern des Passworts ist ein unerwarteter Fehler aufgetreten.",

      );

    } finally {

      setIsLoading(false);

    }

  }



  function handleClosePopup() {

    setShowPopup(false);



    if (passwordWasChanged) {

      router.replace("/login");

    }

  }



  return (

    <main className={`${beVietnamPro.className} relative flex min-h-screen items-center justify-center overflow-hidden bg-white p-4 text-[#323542]`}>

      <div className="absolute left-5 top-5 z-10 sm:left-10 sm:top-8">

        <img

          src="/logo/dipera-logo-dark.png"

          alt="Dipera"

          className="h-auto w-28 sm:w-36"

        />

      </div>



      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[760px] w-[760px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#F2F5F8]" />
        <div className="absolute bottom-[-220px] right-[-120px] h-[520px] w-[520px] rounded-full bg-[#E7EDF1]/70" />
      </div>

      <section className="relative z-10 mt-16 w-full max-w-[480px] rounded-[36px] bg-[#F2F5F8] p-7 shadow-[0_24px_80px_rgba(36,50,77,0.10)] sm:mt-0 sm:p-10">

        <div className="text-center">

          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-[22px] bg-white text-[#31AEF0]">

            <LockKeyhole size={26} />

          </div>



          <h1 className="text-[2.1rem] font-bold leading-tight tracking-[-0.045em] text-black sm:text-[2.45rem]">

            Neues Passwort

          </h1>



          <p className="mt-4 text-[15px] leading-7 text-[#323542]">

            Vergib ein neues und sicheres Passwort für dein

            Dipera-Konto.

          </p>

        </div>



        <form

          onSubmit={handleResetPassword}

          className="mt-7 space-y-5"

        >

          <div>

            <label

              htmlFor="password"

              className="mb-2.5 block text-[14px] font-semibold text-black"

            >

              Neues Passwort

            </label>



            <div className="relative">

              <input

                id="password"

                name="password"

                type={

                  showPassword ? "text" : "password"

                }

                value={password}

                onChange={(event) =>

                  setPassword(event.target.value)

                }

                autoComplete="new-password"

                required

                disabled={isLoading}

                placeholder="Sicheres Passwort eingeben"

                className="h-[56px] w-full rounded-[18px] border border-transparent bg-white px-5 pr-12 text-[15px] text-black outline-none transition placeholder:text-[#8B93A1] focus:border-[#31AEF0] focus:ring-4 focus:ring-[#31AEF0]/10 disabled:cursor-not-allowed disabled:opacity-60"

              />



              <button

                type="button"

                onClick={() =>

                  setShowPassword(

                    (current) => !current,

                  )

                }

                disabled={isLoading}

                aria-label={

                  showPassword

                    ? "Passwort ausblenden"

                    : "Passwort anzeigen"

                }

                className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-[#7A8492] transition hover:bg-[#F2F5F8] hover:text-black disabled:cursor-not-allowed"

              >

                {showPassword ? (

                  <EyeOff size={20} />

                ) : (

                  <Eye size={20} />

                )}

              </button>

            </div>



            <div className="mt-4 space-y-2.5 rounded-[22px] bg-[#E7EDF1] p-5">

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

              htmlFor="confirmPassword"

              className="mb-2.5 block text-[14px] font-semibold text-black"

            >

              Passwort wiederholen

            </label>



            <div className="relative">

              <input

                id="confirmPassword"

                name="confirmPassword"

                type={

                  showConfirmPassword

                    ? "text"

                    : "password"

                }

                value={confirmPassword}

                onChange={(event) =>

                  setConfirmPassword(

                    event.target.value,

                  )

                }

                autoComplete="new-password"

                required

                disabled={isLoading}

                placeholder="Passwort erneut eingeben"

                className={`h-[56px] w-full rounded-[18px] border bg-white px-5 pr-12 text-[15px] text-black outline-none transition placeholder:text-[#8B93A1] focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60 ${

                  passwordsMatch

                    ? "border-emerald-400 focus:border-emerald-500 focus:ring-emerald-100"

                    : confirmPasswordHasError

                      ? "border-red-400 focus:border-red-500 focus:ring-red-100"

                      : "border-transparent focus:border-[#31AEF0] focus:ring-[#31AEF0]/10"

                }`}

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

                    ? "Passwort ausblenden"

                    : "Passwort anzeigen"

                }

                className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-[#7A8492] transition hover:bg-[#F2F5F8] hover:text-black disabled:cursor-not-allowed"

              >

                {showConfirmPassword ? (

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

            ) : confirmPasswordHasError ? (

              <p className="mt-2 text-xs font-medium text-red-600">

                Die Passwörter stimmen nicht überein.

              </p>

            ) : null}

          </div>



          <button

            type="submit"

            disabled={!canSubmit}

            className="flex h-[58px] w-full items-center justify-center rounded-full bg-[#31AEF0] text-[15px] font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#219DE0] disabled:cursor-not-allowed disabled:translate-y-0 disabled:bg-[#AAB3BE]"

          >

            {isLoading ? (

              <>

                <span className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />

                Passwort wird gespeichert

              </>

            ) : (

              "Passwort speichern"

            )}

          </button>

        </form>

      </section>



      <DiperaPopup

        open={showPopup}

        message={popupMessage}

        onClose={handleClosePopup}

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

      className={`flex items-center gap-2 text-xs transition ${

        fulfilled

          ? "font-medium text-emerald-600"

          : "text-[#8B93A1]"

      }`}

    >

      <span

        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${

          fulfilled

            ? "border-emerald-500 bg-emerald-500 text-white"

            : "border-[#C8D0D9] bg-white text-transparent"

        }`}

      >

        <Check size={13} strokeWidth={3} />

      </span>



      <span>{label}</span>

    </div>

  );

}