"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);

  const [popupMessage, setPopupMessage] = useState("");
  const [showPopup, setShowPopup] = useState(false);

  function showDiperaPopup(message: string) {
    setPopupMessage(message);
    setShowPopup(true);
  }

  async function handleResetPassword() {
    if (!password || !confirmPassword) {
      showDiperaPopup("Bitte fülle alle Felder aus.");
      return;
    }

    if (password !== confirmPassword) {
      showDiperaPopup("Die Passwörter stimmen nicht überein.");
      return;
    }

    if (password.length < 8) {
      showDiperaPopup(
        "Das Passwort muss mindestens 8 Zeichen lang sein."
      );
      return;
    }

    setIsLoading(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    setIsLoading(false);

    if (error) {
      console.error(error);
      showDiperaPopup(error.message);
      return;
    }

    showDiperaPopup(
      "Dein Passwort wurde erfolgreich geändert."
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f7f7f8] flex items-center justify-center p-4">

      <div className="absolute top-8 left-10">
        <img
          src="/logo/dipera-logo-dark.png"
          alt="Dipera"
          className="w-36"
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

      <section className="relative z-10 w-full max-w-md rounded-3xl bg-white/95 border border-white shadow-2xl p-8">

        <div className="text-center mb-8">

          <h1 className="text-[2.6rem] font-light tracking-[-0.04em] text-blue-950">
            Neues Passwort
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Vergib ein neues Passwort für dein Dipera-Konto.
          </p>

        </div>

        <div className="flex flex-col gap-4">

          <input
            type="password"
            placeholder="Neues Passwort"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 rounded-xl border border-slate-300 px-4 bg-white text-black"
          />

          <input
            type="password"
            placeholder="Passwort wiederholen"
            value={confirmPassword}
            onChange={(e) =>
              setConfirmPassword(e.target.value)
            }
            className="h-12 rounded-xl border border-slate-300 px-4 bg-white text-black"
          />

          <button
            type="button"
            disabled={isLoading}
            onClick={handleResetPassword}
            className="h-12 rounded-xl bg-blue-700 text-white font-semibold hover:bg-blue-800 transition"
          >
            {isLoading
              ? "Passwort wird gespeichert..."
              : "Passwort speichern"}
          </button>

        </div>

      </section>

      {showPopup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50">

          <div className="max-w-lg w-full text-center rounded-3xl bg-[#0B1220]/95 p-8">

            <p className="text-2xl font-bold text-white mb-8">
              {popupMessage}
            </p>

            <button
              type="button"
              onClick={() => {
                setShowPopup(false);
                router.push("/login");
              }}
              className="bg-blue-600 text-white px-10 py-4 rounded-2xl"
            >
              Zum Login
            </button>

          </div>

        </div>
      )}

    </main>
  );
}