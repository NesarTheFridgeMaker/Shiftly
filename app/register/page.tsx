"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const [showPopup, setShowPopup] = useState(false);

function showDiperaPopup(text: string) {
  setPopupMessage(text);
  setShowPopup(true);
}

  async function handleRegister() {
    if (!email || !password || !confirmPassword) {
  showDiperaPopup("Bitte alle Felder ausfüllen.");
  return;
}

if (password !== confirmPassword) {
  showDiperaPopup("Die Passwörter stimmen nicht überein.");
  return;
}

    setIsLoading(true);

    await supabase.auth.signOut();

    const { error: signUpError } = await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: `${window.location.origin}/login`,
  },
});

    if (signUpError) {
      console.error(signUpError);
      showDiperaPopup(signUpError.message);
      setIsLoading(false);
      return;
    }

    setIsLoading(false);

    showDiperaPopup(
  "Wir haben einen Registrierungslink an deine E-Mail Adresse versendet. Schaue wenn nötig auch in den Spamordner."
);
  }

  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow p-6 md:p-8 w-full max-w-xl">
        <h1 className="text-3xl font-bold text-blue-950 mb-2">
          Bei Dipera registrieren
        </h1>

        <p className="text-gray-500 mb-6">
          Erstelle hier dein Dipera-Konto. Deinen Betrieb richtest du im nächsten Schritt, nach Bestätigung deiner E-Mail Adresse ein.
        </p>

        <div className="flex flex-col gap-4">

          <input
            type="email"
            placeholder="E-Mail"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="border p-3 rounded-lg bg-white text-black"
          />

          <input
            type="password"
            placeholder="Passwort"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="border p-3 rounded-lg bg-white text-black"
          />

          <input
            type="password"
            placeholder="Passwort wiederholen"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="border p-3 rounded-lg bg-white text-black"
          />

          <button
            type="button"
            onClick={handleRegister}
            disabled={isLoading}
            className="bg-blue-950 text-white px-5 py-3 rounded-xl hover:bg-blue-900 transition disabled:bg-gray-400"
          >
            {isLoading ? "Registrierung läuft..." : "Konto erstellen"}
          </button>
        </div>
      </div>
      {showPopup && (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50">

    <div className="max-w-lg w-full text-center rounded-3xl bg-[#0B1220]/95 p-8">

      <p className="text-2xl font-bold text-white mb-8">
        {popupMessage}
      </p>

      <button
        onClick={() => setShowPopup(false)}
        className="bg-blue-600 text-white px-10 py-4 rounded-2xl"
      >
        OK
      </button>

    </div>

  </div>
)}
    </main>
  );
}