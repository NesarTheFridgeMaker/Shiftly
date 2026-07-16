"use client";

import { useEffect, useState } from "react";

import {
  INDIVIDUAL_OFFER_FROM,
  STANDARD_EMPLOYEE_LIMITS,
} from "@/lib/billing/plans";
import { supabase } from "@/lib/supabaseClient";

export default function SetupPage() {
  const [businessName, setBusinessName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminPin, setAdminPin] = useState("");
  const [selectedPlanIndex, setSelectedPlanIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [popupMessage, setPopupMessage] = useState("");
  const [showPopup, setShowPopup] = useState(false);

  const employeeLimitOptions = [
    ...STANDARD_EMPLOYEE_LIMITS,
    INDIVIDUAL_OFFER_FROM,
  ] as const;

  const selectedEmployeeLimit = employeeLimitOptions[selectedPlanIndex];
  const requiresIndividualOffer =
    selectedEmployeeLimit >= INDIVIDUAL_OFFER_FROM;

  function showDiperaPopup(message: string) {
    setPopupMessage(message);
    setShowPopup(true);
  }

  useEffect(() => {
    let pollingInterval: ReturnType<typeof setInterval> | null = null;
    let pollingTimeout: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;

    async function checkProfileAndRedirect(userId: string) {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        console.error("SETUP PROFILE CHECK ERROR:", error);
        return false;
      }

      if (profile?.role === "owner" || profile?.role === "admin") {
        window.location.replace("/admin");
        return true;
      }

      if (profile?.role === "employee") {
        window.location.replace("/employee");
        return true;
      }

      return false;
    }

    async function checkSetupAccess() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        window.location.replace("/login");
        return;
      }

      if (!user.email_confirmed_at) {
        await supabase.auth.signOut();
        window.location.replace("/login");
        return;
      }

      if (user.user_metadata?.registration_type !== "business_owner") {
        window.location.replace("/employee-setup");
        return;
      }

      const alreadyConfigured = await checkProfileAndRedirect(user.id);

      if (alreadyConfigured || stopped) {
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const checkoutStatus = params.get("checkout");

      if (checkoutStatus === "cancelled") {
        showDiperaPopup("Der Checkout wurde abgebrochen.");
        setCheckingAuth(false);
        return;
      }

      if (checkoutStatus !== "success") {
        setCheckingAuth(false);
        return;
      }

      setCheckingAuth(true);

      pollingInterval = setInterval(async () => {
        const completed = await checkProfileAndRedirect(user.id);

        if (completed && pollingInterval) {
          clearInterval(pollingInterval);
        }
      }, 1500);

      pollingTimeout = setTimeout(() => {
        if (pollingInterval) {
          clearInterval(pollingInterval);
        }

        setCheckingAuth(false);

        showDiperaPopup(
          "Die Einrichtung dauert länger als erwartet. Bitte lade die Seite in einigen Sekunden erneut. Es ist kein weiterer Checkout erforderlich."
        );
      }, 30000);
    }

    void checkSetupAccess();

    return () => {
      stopped = true;

      if (pollingInterval) {
        clearInterval(pollingInterval);
      }

      if (pollingTimeout) {
        clearTimeout(pollingTimeout);
      }
    };
  }, []);

  async function handleStartCheckout() {
    if (isLoading) return;

    const cleanedBusinessName = businessName.trim();
    const cleanedAdminName = adminName.trim();

    if (!cleanedBusinessName || !cleanedAdminName || !adminPin) {
      showDiperaPopup("Bitte alle Felder ausfüllen.");
      return;
    }

    if (!/^\d{4}$/.test(adminPin)) {
      showDiperaPopup("Die PIN muss genau aus vier Zahlen bestehen.");
      return;
    }

    if (requiresIndividualOffer) {
      showDiperaPopup(
        "Für Betriebe ab 50 Mitarbeitern erstellen wir ein individuelles Angebot. Die direkte Kontaktanfrage bauen wir im nächsten Schritt ein."
      );
      return;
    }

    setIsLoading(true);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        showDiperaPopup(
          "Deine Anmeldung ist abgelaufen. Bitte melde dich erneut an."
        );
        return;
      }

      const response = await fetch(
        "/api/stripe/create-checkout-session",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            businessName: cleanedBusinessName,
            adminName: cleanedAdminName,
            adminPin,
            selectedEmployeeLimit,
          }),
        }
      );

      const data = (await response.json()) as {
        url?: string;
        error?: string;
      };

      if (!response.ok || !data.url) {
        showDiperaPopup(
          data.error || "Checkout konnte nicht gestartet werden."
        );
        return;
      }

      window.location.href = data.url;
    } catch (error) {
      console.error("SETUP CHECKOUT ERROR:", error);

      showDiperaPopup(
        "Beim Starten des Checkouts ist ein unerwarteter Fehler aufgetreten."
      );
    } finally {
      setIsLoading(false);
    }
  }

  if (checkingAuth) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f7f7f8] p-4">
        <div className="rounded-3xl border border-white bg-white/95 p-8 text-center shadow-2xl">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-blue-100 border-t-[#005CA8]" />

          <p className="font-medium text-slate-700">
            Dein Betrieb wird eingerichtet...
          </p>

          <p className="mt-2 text-sm text-slate-500">
            Bitte schließe diese Seite nicht.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f7f7f8] p-4">
      <div className="absolute left-5 top-5 z-10 sm:left-10 sm:top-8">
        <img
          src="/logo/dipera-logo-dark.png"
          alt="Dipera"
          className="h-auto w-28 sm:w-36"
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

      <section className="relative z-10 mt-16 w-full max-w-md rounded-3xl border border-white bg-white/95 p-6 shadow-2xl sm:mt-0 sm:p-8">
        <div className="mb-8 text-center">
          <h1 className="text-[2.25rem] font-light leading-tight tracking-[-0.04em] text-blue-950 sm:text-[2.6rem]">
            Betrieb einrichten
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Starte deine 14-tägige Testphase und richte deinen Betrieb ein.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <input
            type="text"
            autoComplete="organization"
            placeholder="Betriebsname"
            value={businessName}
            onChange={(event) => setBusinessName(event.target.value)}
            disabled={isLoading}
            className="h-12 rounded-xl border border-slate-300 bg-white px-4 text-black outline-none transition focus:border-[#005CA8] focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
          />

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-700">
                  Mitarbeiterpaket
                </p>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Wähle aus, wie viele Mitarbeiter Dipera maximal nutzen sollen.
                </p>
              </div>

              <div className="shrink-0 rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-800">
                {requiresIndividualOffer
                  ? "Ab 50"
                  : `Bis ${selectedEmployeeLimit}`}
              </div>
            </div>

            <input
              type="range"
              min="0"
              max={employeeLimitOptions.length - 1}
              step="1"
              value={selectedPlanIndex}
              onChange={(event) =>
                setSelectedPlanIndex(Number(event.target.value))
              }
              disabled={isLoading}
              className="mt-6 w-full cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="Mitarbeiterpaket auswählen"
            />

            <div className="mt-2 flex justify-between text-xs text-slate-400">
              <span>Bis 10</span>
              <span>Ab 50</span>
            </div>

            <div className="mt-4 rounded-xl bg-white p-4">
              {requiresIndividualOffer ? (
                <>
                  <p className="text-sm font-medium text-slate-700">
                    Individuelles Firmenpaket
                  </p>

                  <p className="mt-1 text-lg font-semibold text-blue-950">
                    Ab 50 Mitarbeitern
                  </p>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Für größere Betriebe erstellen wir ein individuelles Angebot,
                    das zum tatsächlichen Nutzungsumfang passt.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-slate-700">
                    Ausgewähltes Paket
                  </p>

                  <p className="mt-1 text-lg font-semibold text-blue-950">
                    Bis zu {selectedEmployeeLimit} Mitarbeiter
                  </p>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Der monatliche Preis wird entsprechend der gewählten
                    Paketgröße berechnet.
                  </p>
                </>
              )}
            </div>
          </div>

          <input
            type="text"
            autoComplete="name"
            placeholder="Dein Name"
            value={adminName}
            onChange={(event) => setAdminName(event.target.value)}
            disabled={isLoading}
            className="h-12 rounded-xl border border-slate-300 bg-white px-4 text-black outline-none transition focus:border-[#005CA8] focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
          />

          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            maxLength={4}
            placeholder="4-stellige Admin-PIN"
            value={adminPin}
            onChange={(event) => {
              const onlyNumbers = event.target.value.replace(/\D/g, "");
              setAdminPin(onlyNumbers.slice(0, 4));
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void handleStartCheckout();
              }
            }}
            disabled={isLoading}
            className="h-12 rounded-xl border border-slate-300 bg-white px-4 text-black outline-none transition focus:border-[#005CA8] focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
          />

          <button
            type="button"
            onClick={() => void handleStartCheckout()}
            disabled={isLoading}
            className="h-12 rounded-xl bg-[#005CA8] font-semibold text-white transition hover:bg-[#004b8a] disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {isLoading
              ? "Testphase wird gestartet..."
              : requiresIndividualOffer
                ? "Individuelles Angebot anfragen"
                : "14 Tage kostenlos testen & Betrieb erstellen"}
          </button>

          <p className="text-center text-xs leading-relaxed text-slate-500">
            {requiresIndividualOffer
              ? "Wir melden uns mit einem passenden Angebot für deinen Betrieb."
              : "Nach der 14-tägigen Testphase gilt der monatliche Preis des ausgewählten Mitarbeiterpakets. Monatlich kündbar."}
          </p>

          {!requiresIndividualOffer && (
            <p className="text-center text-xs leading-5 text-slate-400">
              Du kannst später jederzeit in ein größeres Paket wechseln.
            </p>
          )}
        </div>
      </section>

      {showPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-[#0B1220]/95 p-8 text-center shadow-2xl">
            <p className="mb-8 text-xl font-semibold leading-8 text-white sm:text-2xl">
              {popupMessage}
            </p>

            <button
              type="button"
              onClick={() => setShowPopup(false)}
              className="rounded-2xl bg-[#005CA8] px-10 py-4 font-semibold text-white transition hover:bg-[#004b8a]"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
