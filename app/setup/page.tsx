"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function SetupPage() {
  const [businessName, setBusinessName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminPin, setAdminPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [popupMessage, setPopupMessage] = useState("");
  const [showPopup, setShowPopup] = useState(false);

  function showDiperaPopup(message: string) {
    setPopupMessage(message);
    setShowPopup(true);
  }

  useEffect(() => {
  async function checkSetupAccess() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.error(error);
      showDiperaPopup("Profil konnte nicht geprüft werden.");
      setCheckingAuth(false);
      return;
    }

    if (profile?.role === "admin") {
      window.location.href = "/admin";
      return;
    }

    if (profile?.role === "employee") {
      window.location.href = "/employee";
      return;
    }

    setCheckingAuth(false);
  }

  checkSetupAccess();
}, []);

  async function handleCreateBusiness() {
    if (!businessName || !adminName || !adminPin) {
      showDiperaPopup("Bitte alle Felder ausfüllen.");
      return;
    }

    if (adminPin.length !== 4) {
      showDiperaPopup("Die PIN muss genau 4 Zahlen haben.");
      return;
    }

    setIsLoading(true);

    const { error } = await supabase.rpc(
      "create_business_with_admin",
      {
        p_business_name: businessName.trim(),
        p_admin_name: adminName.trim(),
        p_admin_pin: adminPin.trim(),
      }
    );

    if (error) {
      console.error(error);
      showDiperaPopup("Der Betrieb konnte nicht erstellt werden.");
      setIsLoading(false);
      return;
    }

    window.location.href = "/admin";
  }

  if (checkingAuth) {
  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow p-6 text-gray-600">
        Setup wird vorbereitet...
      </div>
    </main>
  );
}

  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow p-6 md:p-8 w-full max-w-xl">
        <h1 className="text-3xl font-bold text-blue-950 mb-2">
          Betrieb einrichten
        </h1>

        <p className="text-gray-500 mb-6">
          Richte deinen Betrieb ein und erstelle deinen ersten Admin-Zugang.
        </p>

        <div className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Betriebsname"
            value={businessName}
            onChange={(event) => setBusinessName(event.target.value)}
            className="border p-3 rounded-lg bg-white text-black"
          />

          <input
            type="text"
            placeholder="Dein Name"
            value={adminName}
            onChange={(event) => setAdminName(event.target.value)}
            className="border p-3 rounded-lg bg-white text-black"
          />

          <input
            type="text"
            inputMode="numeric"
            maxLength={4}
            placeholder="4-stellige Admin-PIN"
            value={adminPin}
            onChange={(event) => {
              const onlyNumbers = event.target.value.replace(/\D/g, "");
              setAdminPin(onlyNumbers.slice(0, 4));
            }}
            className="border p-3 rounded-lg bg-white text-black"
          />

          <button
            type="button"
            onClick={handleCreateBusiness}
            disabled={isLoading}
            className="bg-blue-950 text-white px-5 py-3 rounded-xl hover:bg-blue-900 transition disabled:bg-gray-400"
          >
            {isLoading ? "Betrieb wird erstellt..." : "Betrieb erstellen"}
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