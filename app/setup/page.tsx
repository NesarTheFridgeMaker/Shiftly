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

      if (!user.email_confirmed_at) {
        await supabase.auth.signOut();
        window.location.href = "/login";
        return;
      }

      if (user.user_metadata?.registration_type !== "business_owner") {
        window.location.href = "/employee-setup";
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

      if (profile?.role === "owner" || profile?.role === "admin") {
        window.location.href = "/admin";
        return;
      }

      if (profile?.role === "employee") {
        window.location.href = "/employee";
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const checkoutStatus = params.get("checkout");

      if (checkoutStatus === "success") {
  showDiperaPopup(
    "Deine Testphase wurde gestartet. Dein Betrieb wird eingerichtet."
  );

  setCheckingAuth(false);
  return;
}

      if (checkoutStatus === "cancelled") {
        showDiperaPopup("Der Checkout wurde abgebrochen.");
      }

      setCheckingAuth(false);
    }

    checkSetupAccess();
  }, []);

  async function handleStartCheckout() {
    if (!businessName || !adminName || !adminPin) {
      showDiperaPopup("Bitte alle Felder ausfüllen.");
      return;
    }

    if (adminPin.length !== 4) {
      showDiperaPopup("Die PIN muss genau 4 Zahlen haben.");
      return;
    }

    setIsLoading(true);

    const {
  data: { session },
} = await supabase.auth.getSession();

const response = await fetch("/api/stripe/create-checkout-session", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session?.access_token}`,
  },
  body: JSON.stringify({
    businessName,
    adminName,
    adminPin,
  }),
});

    const data = await response.json();

    setIsLoading(false);

    if (!response.ok || !data.url) {
      showDiperaPopup(
        data.error || "Checkout konnte nicht gestartet werden."
      );
      return;
    }

    window.location.href = data.url;
  }

  if (checkingAuth) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-[#f7f7f8] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow p-6 text-gray-600">
          Setup wird vorbereitet...
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f7f7f8] flex items-center justify-center p-4">
      <div className="absolute top-8 left-10 z-10">
        <img
          src="/logo/dipera-logo-dark.png"
          alt="Dipera"
          className="w-36 h-auto"
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

      <section className="relative z-10 w-full max-w-md rounded-3xl bg-white/95 p-8 shadow-2xl border border-white">
        <div className="text-center mb-8">
          <h1 className="text-[2.6rem] leading-tight font-light tracking-[-0.04em] text-blue-950">
            Betrieb einrichten
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Starte deine 14-tägige Testphase und richte deinen Betrieb ein.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Betriebsname"
            value={businessName}
            onChange={(event) => setBusinessName(event.target.value)}
            className="h-12 rounded-xl border border-slate-300 bg-white px-4 text-black outline-none focus:border-blue-700"
          />

          <input
            type="text"
            placeholder="Dein Name"
            value={adminName}
            onChange={(event) => setAdminName(event.target.value)}
            className="h-12 rounded-xl border border-slate-300 bg-white px-4 text-black outline-none focus:border-blue-700"
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
            className="h-12 rounded-xl border border-slate-300 bg-white px-4 text-black outline-none focus:border-blue-700"
          />

          <button
            type="button"
            onClick={handleStartCheckout}
            disabled={isLoading}
            className="h-12 rounded-xl bg-blue-700 text-white font-semibold hover:bg-blue-800 transition disabled:bg-gray-400"
          >
            {isLoading
              ? "Testphase wird gestartet..."
              : "14 Tage kostenlos testen & Betrieb erstellen"}
          </button>

          <p className="text-center text-xs text-slate-500 leading-relaxed">
            Nach Ablauf der Testphase kostet Dipera 14,99 € monatlich.
            Monatlich kündbar.
          </p>
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