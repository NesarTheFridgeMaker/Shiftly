"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function EmployeeRegisterPage() {
  const [inviteCode, setInviteCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
const [showPopup, setShowPopup] = useState(false);

function showDiperaPopup(text: string) {
  setPopupMessage(text);
  setShowPopup(true);
}

  async function handleRegister() {
    if (!inviteCode || !email || !password) {
      showDiperaPopup("Bitte Einladungscode, E-Mail und Passwort eingeben.");
      return;
    }

    setIsLoading(true);

    await supabase.auth.signOut();

        const cleanedInviteCode = inviteCode.trim().toUpperCase();

const { data: isInviteValid, error: inviteCheckError } = await supabase.rpc(
  "check_employee_invite",
  {
    p_invite_code: cleanedInviteCode,
  }
);

if (inviteCheckError) {
  console.error(inviteCheckError);
  showDiperaPopup("Einladungscode konnte nicht geprüft werden.");
  setIsLoading(false);
  return;
}

if (!isInviteValid) {
  showDiperaPopup("Bitte geben Sie einen gültigen Einladungscode ein.");
  setIsLoading(false);
  return;
}

    const { error: signUpError } = await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: `${window.location.origin}/login`,
    data: {
      registration_type: "employee_invite",
    },
  },
});

setIsLoading(false);

showDiperaPopup(
  "Bitte bestätige deine E-Mail-Adresse. Danach kannst du dich einloggen und deinen Mitarbeiter-Zugang aktivieren."
);

    if (signUpError) {
      console.error(signUpError);
      showDiperaPopup(signUpError.message);
      setIsLoading(false);
      return;
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow p-6 md:p-8 w-full max-w-xl">
        <h1 className="text-3xl font-bold text-blue-950 mb-2">
          Mitarbeiter-Zugang erstellen
        </h1>

        <p className="text-gray-500 mb-6">
          Gib deinen Einladungscode ein und erstelle deinen persönlichen Zugang.
        </p>

        <div className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Einladungscode"
            value={inviteCode}
            onChange={(event) =>
              setInviteCode(event.target.value.toUpperCase())
            }
            className="border p-3 rounded-lg bg-white text-black"
          />

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

          <button
            type="button"
            onClick={handleRegister}
            disabled={isLoading}
            className="bg-blue-950 text-white px-5 py-3 rounded-xl hover:bg-blue-900 transition disabled:bg-gray-400"
          >
            {isLoading ? "Zugang wird erstellt..." : "Zugang erstellen"}
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