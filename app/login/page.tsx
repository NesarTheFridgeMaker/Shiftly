"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

async function handleLogin() {
  if (!email || !password) {
    alert("Bitte E-Mail und Passwort eingeben.");
    return;
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    alert(`Login fehlgeschlagen: ${error.message}`);
    return;
  }

  const user = data.user;

  if (!user) {
    alert("Benutzer konnte nicht geladen werden.");
    return;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    console.error(profileError);

    alert("Profil konnte nicht geladen werden.");
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

  alert("Unbekannte Benutzerrolle.");
}

  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-md">
<img
  src="/logo/dipera-logo.png"
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
            onClick={handleLogin}
            className="bg-blue-950 text-white py-3 rounded-xl hover:bg-blue-900 transition"
          >
            Einloggen
          </button>
        </div>
      </div>
    </main>
  );
}