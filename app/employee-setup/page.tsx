"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function EmployeeSetupPage() {
  const [inviteCode, setInviteCode] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const [showPopup, setShowPopup] = useState(false);

  function showDiperaPopup(message: string) {
    setPopupMessage(message);
    setShowPopup(true);
  }

  useEffect(() => {
    async function checkAccess() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.role === "employee") {
        window.location.href = "/employee";
        return;
      }

      if (profile?.role === "admin" || profile?.role === "owner") {
        window.location.href = "/admin";
        return;
      }

      setCheckingAuth(false);
    }

    checkAccess();
  }, []);

  async function handleCompleteInvite() {
    if (!inviteCode) {
      showDiperaPopup("Bitte gib deinen Einladungscode ein.");
      return;
    }

    setIsLoading(true);

    const cleanedInviteCode = inviteCode.trim().toUpperCase();

    const { error } = await supabase.rpc("complete_employee_invite", {
      p_invite_code: cleanedInviteCode,
    });

    if (error) {
      console.error(error);
      showDiperaPopup(error.message || "Der Zugang konnte nicht aktiviert werden.");
      setIsLoading(false);
      return;
    }

    window.location.href = "/employee";
  }

  if (checkingAuth) {
    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow p-6 text-gray-600">
          Mitarbeiter-Zugang wird geprüft...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow p-6 md:p-8 w-full max-w-xl">
        <h1 className="text-3xl font-bold text-blue-950 mb-2">
          Mitarbeiter-Zugang aktivieren
        </h1>

        <p className="text-gray-500 mb-6">
          Gib deinen Einladungscode ein, um deinen Zugang mit deinem Mitarbeiterprofil zu verbinden.
        </p>

        <div className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Einladungscode"
            value={inviteCode}
            onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
            className="border p-3 rounded-lg bg-white text-black"
          />

          <button
            type="button"
            onClick={handleCompleteInvite}
            disabled={isLoading}
            className="bg-blue-950 text-white px-5 py-3 rounded-xl hover:bg-blue-900 transition disabled:bg-gray-400"
          >
            {isLoading ? "Zugang wird aktiviert..." : "Zugang aktivieren"}
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