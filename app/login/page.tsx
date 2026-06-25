"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      window.location.assign("/setup");
      return;
    }

    if (profile.role === "admin") {
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
    <main className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-md">
        <img
          src="/logo/dipera-logo-dark.png"
          alt="Dipera"
          className="w-56 h-auto mx-auto"
        />

        <p className="text-gray-500 text-center mb-8">
          Login zum Dashboard
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

          <button
            type="button"
            onClick={handleLogin}
            className="bg-blue-950 text-white py-3 rounded-xl hover:bg-blue-900 transition"
          >
            Einloggen
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
              type="button"
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