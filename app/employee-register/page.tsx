"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function EmployeeRegisterPage() {
  const [inviteCode, setInviteCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);

  async function handleRegister() {
    if (!inviteCode || !email || !password) {
      alert("Bitte Einladungscode, E-Mail und Passwort eingeben.");
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
  alert("Einladungscode konnte nicht geprüft werden.");
  setIsLoading(false);
  return;
}

if (!isInviteValid) {
  alert("Bitte geben Sie einen gültigen Einladungscode ein.");
  setIsLoading(false);
  return;
}

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      console.error(signUpError);
      alert(signUpError.message);
      setIsLoading(false);
      return;
    }

    const { error: rpcError } = await supabase.rpc(
      "complete_employee_invite",
      {
        p_invite_code: cleanedInviteCode,
      }
    );

    if (rpcError) {
      console.error(rpcError);
      alert(JSON.stringify(rpcError, null, 2));
      setIsLoading(false);
      return;
    }

    window.location.href = "/employee";
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
    </main>
  );
}