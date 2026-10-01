"use client";



import { useEffect, useState } from "react";

import { Be_Vietnam_Pro } from "next/font/google";



import { supabase } from "@/lib/supabaseClient";



const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const inputClassName =
  "h-[56px] w-full rounded-[18px] border border-transparent bg-[#F2F5F8] px-5 text-[15px] text-black outline-none transition placeholder:text-[#8B93A1] focus:border-[#31AEF0] focus:bg-white focus:ring-4 focus:ring-[#31AEF0]/10 disabled:cursor-not-allowed disabled:opacity-60";



const labelClassName =
  "mb-2.5 block text-[14px] font-semibold text-black";



function normalizeOptionalValue(value: string) {

  const cleaned = value.trim();



  return cleaned || null;

}



function isValidEmail(value: string) {

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

}



export default function SetupPage() {

  const [businessName, setBusinessName] = useState("");



  const [adminName, setAdminName] = useState("");



  const [adminPin, setAdminPin] = useState("");



  const [phone, setPhone] = useState("");



  const [street, setStreet] = useState("");



  const [houseNumber, setHouseNumber] = useState("");



  const [postalCode, setPostalCode] = useState("");



  const [city, setCity] = useState("");



  const [countryCode, setCountryCode] = useState("DE");



  const [supportEmail, setSupportEmail] = useState("");



  const [billingEmail, setBillingEmail] = useState("");



  const [website, setWebsite] = useState("");



  const [vatId, setVatId] = useState("");



  const [legalForm, setLegalForm] = useState("");



  const [showOptionalBillingData, setShowOptionalBillingData] =

    useState(false);



  const [acceptedLegalTerms, setAcceptedLegalTerms] = useState(false);



  const [isLoading, setIsLoading] = useState(false);



  const [checkingAuth, setCheckingAuth] = useState(true);



  const [popupMessage, setPopupMessage] = useState("");



  const [showPopup, setShowPopup] = useState(false);



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



      if (

        profile?.role === "owner" ||

        profile?.role === "admin"

      ) {

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



      if (

        user.user_metadata?.registration_type !==

        "business_owner"

      ) {

        window.location.replace("/employee-setup");



        return;

      }



      setSupportEmail((current) => current || user.email || "");



      setBillingEmail((current) => current || user.email || "");



      const alreadyConfigured =

        await checkProfileAndRedirect(user.id);



      if (alreadyConfigured || stopped) {

        return;

      }



      const params = new URLSearchParams(

        window.location.search

      );



      const checkoutStatus = params.get("checkout");



      if (checkoutStatus === "cancelled") {

        showDiperaPopup(

          "Der Checkout wurde abgebrochen."

        );



        setCheckingAuth(false);



        return;

      }



      if (checkoutStatus !== "success") {

        setCheckingAuth(false);



        return;

      }



      setCheckingAuth(true);



      pollingInterval = setInterval(async () => {

        const completed =

          await checkProfileAndRedirect(user.id);



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



    if (!acceptedLegalTerms) {

      showDiperaPopup(

        "Bitte bestätige die AGB und den Vertrag zur Auftragsverarbeitung (AVV), bevor du fortfährst."

      );



      return;

    }



    const cleanedBusinessName = businessName.trim();



    const cleanedAdminName = adminName.trim();



    const cleanedPhone = phone.trim();



    const cleanedStreet = street.trim();



    const cleanedHouseNumber = houseNumber.trim();



    const cleanedPostalCode = postalCode.trim();



    const cleanedCity = city.trim();



    const cleanedCountryCode = countryCode.trim().toUpperCase();



    const cleanedSupportEmail = supportEmail.trim().toLowerCase();



    const cleanedBillingEmail = billingEmail.trim().toLowerCase();



    if (

      !cleanedBusinessName ||

      !cleanedAdminName ||

      !adminPin ||

      !cleanedPhone ||

      !cleanedStreet ||

      !cleanedHouseNumber ||

      !cleanedPostalCode ||

      !cleanedCity ||

      !cleanedCountryCode ||

      !cleanedSupportEmail ||

      !cleanedBillingEmail

    ) {

      showDiperaPopup(

        "Bitte fülle alle Pflichtfelder aus."

      );



      return;

    }



    if (!/^\d{4}$/.test(adminPin)) {

      showDiperaPopup(

        "Die PIN muss genau aus vier Zahlen bestehen."

      );



      return;

    }



    if (!/^[A-Z]{2}$/.test(cleanedCountryCode)) {

      showDiperaPopup(

        "Bitte wähle einen gültigen Ländercode aus."

      );



      return;

    }



    if (

      !isValidEmail(cleanedSupportEmail) ||

      !isValidEmail(cleanedBillingEmail)

    ) {

      showDiperaPopup(

        "Bitte prüfe die Support- und Rechnungs-E-Mail-Adresse."

      );



      return;

    }



    setIsLoading(true);



    try {

      const {

        data: { session },

        error: sessionError,

      } = await supabase.auth.getSession();



      if (

        sessionError ||

        !session?.access_token

      ) {

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



            contactName: cleanedAdminName,



            adminPin,



            phone: cleanedPhone,



            street: cleanedStreet,



            houseNumber: cleanedHouseNumber,



            postalCode: cleanedPostalCode,



            city: cleanedCity,



            countryCode: cleanedCountryCode,



            supportEmail: cleanedSupportEmail,



            billingEmail: cleanedBillingEmail,



            website: normalizeOptionalValue(website),



            vatId: normalizeOptionalValue(vatId),



            legalForm: normalizeOptionalValue(legalForm),



            legalTermsAccepted: acceptedLegalTerms,

          }),

        }

      );



      const data = (await response.json()) as {

        url?: string;



        error?: string;

      };



      if (!response.ok || !data.url) {

        showDiperaPopup(

          data.error ||

            "Checkout konnte nicht gestartet werden."

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
      <main className={`${beVietnamPro.className} flex min-h-screen items-center justify-center bg-[#F2F5F8] p-4 text-[#323542]`}>
        <div className="w-full max-w-[430px] rounded-[32px] bg-white p-9 text-center shadow-[0_24px_80px_rgba(36,50,77,0.10)]">
          <div className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-4 border-[#31AEF0]/20 border-t-[#31AEF0]" />
          <p className="font-bold text-black">Dein Betrieb wird eingerichtet...</p>
          <p className="mt-2 text-sm text-[#667085]">Bitte schließe diese Seite nicht.</p>
        </div>
      </main>
    );
  }

  return (

    <main className={`${beVietnamPro.className} relative min-h-screen overflow-hidden bg-white px-4 py-8 text-[#323542] sm:px-6`}>

      <div className="absolute left-5 top-5 z-10 sm:left-10 sm:top-8">

        <img

          src="/logo/dipera-logo-dark.png"

          alt="Dipera"

          className="h-auto w-28 sm:w-36"

        />

      </div>



      <section className="relative z-10 mx-auto mt-16 w-full max-w-[1180px] rounded-[36px] bg-[#F2F5F8] p-6 sm:mt-20 sm:p-9 lg:p-12">

        <div className="mb-8 text-center">

          <h1 className="text-[2.5rem] font-bold leading-[1.08] tracking-[-0.045em] text-black sm:text-[3rem]">

            Betrieb einrichten

          </h1>



          <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-7 text-[#323542]">

            Hinterlege die wichtigsten Unternehmensdaten und starte

            anschließend deine 14-tägige Testphase.

          </p>

        </div>



        <div className="space-y-6">

          <div className="rounded-[30px] bg-white p-6 sm:p-7">

            <div className="mb-5">

              <h2 className="text-xl font-bold tracking-[-0.025em] text-black">

                Unternehmensdaten

              </h2>



              <p className="mt-1 text-sm leading-6 text-[#667085]">

                Diese Angaben verwenden wir für deine

                Unternehmenszuordnung und die Kommunikation.

              </p>

            </div>



            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

              <div>

                <label

                  htmlFor="business-name"

                  className={labelClassName}

                >

                  Firmenname \*

                </label>



                <input

                  id="business-name"

                  type="text"

                  autoComplete="organization"

                  placeholder="z. B. Musterfirma GmbH"

                  value={businessName}

                  onChange={(event) =>

                    setBusinessName(event.target.value)

                  }

                  disabled={isLoading}

                  className={inputClassName}

                />

              </div>



              <div>

                <label

                  htmlFor="admin-name"

                  className={labelClassName}

                >

                  Ansprechpartner \*

                </label>



                <input

                  id="admin-name"

                  type="text"

                  autoComplete="name"

                  placeholder="Vor- und Nachname"

                  value={adminName}

                  onChange={(event) =>

                    setAdminName(event.target.value)

                  }

                  disabled={isLoading}

                  className={inputClassName}

                />

              </div>



              <div>

                <label

                  htmlFor="phone"

                  className={labelClassName}

                >

                  Telefonnummer \*

                </label>



                <input

                  id="phone"

                  type="tel"

                  autoComplete="tel"

                  placeholder="+49 ..."

                  value={phone}

                  onChange={(event) =>

                    setPhone(event.target.value)

                  }

                  disabled={isLoading}

                  className={inputClassName}

                />

              </div>



              <div>

                <label

                  htmlFor="support-email"

                  className={labelClassName}

                >

                  Kontakt-/Support-E-Mail \*

                </label>



                <input

                  id="support-email"

                  type="email"

                  autoComplete="email"

                  placeholder="verwaltung@firma.de"

                  value={supportEmail}

                  onChange={(event) =>

                    setSupportEmail(event.target.value)

                  }

                  disabled={isLoading}

                  className={inputClassName}

                />

              </div>

            </div>

          </div>



          <div className="rounded-[30px] bg-white p-6 sm:p-7">

            <div className="mb-5">

              <h2 className="text-xl font-bold tracking-[-0.025em] text-black">

                Unternehmensanschrift

              </h2>



              <p className="mt-1 text-sm leading-6 text-[#667085]">

                Bitte gib die offizielle Geschäfts- beziehungsweise

                Rechnungsanschrift an.

              </p>

            </div>



            <div className="grid grid-cols-1 gap-4 md:grid-cols-6">

              <div className="md:col-span-4">

                <label

                  htmlFor="street"

                  className={labelClassName}

                >

                  Straße \*

                </label>



                <input

                  id="street"

                  type="text"

                  autoComplete="address-line1"

                  placeholder="Musterstraße"

                  value={street}

                  onChange={(event) =>

                    setStreet(event.target.value)

                  }

                  disabled={isLoading}

                  className={inputClassName}

                />

              </div>



              <div className="md:col-span-2">

                <label

                  htmlFor="house-number"

                  className={labelClassName}

                >

                  Hausnummer \*

                </label>



                <input

                  id="house-number"

                  type="text"

                  placeholder="12a"

                  value={houseNumber}

                  onChange={(event) =>

                    setHouseNumber(event.target.value)

                  }

                  disabled={isLoading}

                  className={inputClassName}

                />

              </div>



              <div className="md:col-span-2">

                <label

                  htmlFor="postal-code"

                  className={labelClassName}

                >

                  PLZ \*

                </label>



                <input

                  id="postal-code"

                  type="text"

                  inputMode="numeric"

                  autoComplete="postal-code"

                  placeholder="70173"

                  value={postalCode}

                  onChange={(event) =>

                    setPostalCode(event.target.value)

                  }

                  disabled={isLoading}

                  className={inputClassName}

                />

              </div>



              <div className="md:col-span-3">

                <label

                  htmlFor="city"

                  className={labelClassName}

                >

                  Ort \*

                </label>



                <input

                  id="city"

                  type="text"

                  autoComplete="address-level2"

                  placeholder="Stuttgart"

                  value={city}

                  onChange={(event) =>

                    setCity(event.target.value)

                  }

                  disabled={isLoading}

                  className={inputClassName}

                />

              </div>



              <div className="md:col-span-1">

                <label

                  htmlFor="country-code"

                  className={labelClassName}

                >

                  Land \*

                </label>



                <select

                  id="country-code"

                  value={countryCode}

                  onChange={(event) =>

                    setCountryCode(event.target.value)

                  }

                  disabled={isLoading}

                  className={inputClassName}

                >

                  <option value="DE">DE</option>

                  <option value="AT">AT</option>

                  <option value="CH">CH</option>

                </select>

              </div>

            </div>

          </div>



          <div className="rounded-[30px] bg-[#E7EDF1] p-6 sm:p-7">

            <button

              type="button"

              onClick={() =>

                setShowOptionalBillingData((current) => !current)

              }

              disabled={isLoading}

              className="flex w-full items-center justify-between gap-4 text-left"

            >

              <div>

                <h2 className="text-xl font-bold tracking-[-0.025em] text-black">

                  Zusätzliche Rechnungsdaten

                </h2>



                <p className="mt-1 text-sm leading-6 text-[#667085]">

                  Optional: Rechtsform, USt-IdNr., Website und separate

                  Rechnungs-E-Mail.

                </p>

              </div>



              <span className="text-xl text-[#31AEF0]">

                {showOptionalBillingData ? "−" : "+"}

              </span>

            </button>



            {showOptionalBillingData && (

              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">

                <div>

                  <label

                    htmlFor="legal-form"

                    className={labelClassName}

                  >

                    Rechtsform

                  </label>



                  <input

                    id="legal-form"

                    type="text"

                    placeholder="z. B. GmbH, UG, Einzelunternehmen"

                    value={legalForm}

                    onChange={(event) =>

                      setLegalForm(event.target.value)

                    }

                    disabled={isLoading}

                    className={inputClassName}

                  />

                </div>



                <div>

                  <label

                    htmlFor="vat-id"

                    className={labelClassName}

                  >

                    USt-IdNr.

                  </label>



                  <input

                    id="vat-id"

                    type="text"

                    placeholder="DE123456789"

                    value={vatId}

                    onChange={(event) =>

                      setVatId(event.target.value.toUpperCase())

                    }

                    disabled={isLoading}

                    className={inputClassName}

                  />

                </div>



                <div>

                  <label

                    htmlFor="website"

                    className={labelClassName}

                  >

                    Website

                  </label>



                  <input

                    id="website"

                    type="url"

                    placeholder="https://www.firma.de"

                    value={website}

                    onChange={(event) =>

                      setWebsite(event.target.value)

                    }

                    disabled={isLoading}

                    className={inputClassName}

                  />

                </div>



                <div>

                  <label

                    htmlFor="billing-email"

                    className={labelClassName}

                  >

                    Rechnungs-E-Mail \*

                  </label>



                  <input

                    id="billing-email"

                    type="email"

                    autoComplete="email"

                    placeholder="buchhaltung@firma.de"

                    value={billingEmail}

                    onChange={(event) =>

                      setBillingEmail(event.target.value)

                    }

                    disabled={isLoading}

                    className={inputClassName}

                  />

                </div>

              </div>

            )}



            {!showOptionalBillingData && (

              <p className="mt-4 rounded-[20px] bg-white px-5 py-4 text-sm leading-6 text-[#323542]">

                Die Rechnungs-E-Mail ist aktuell mit deiner

                Registrierungs-E-Mail vorbelegt und kann hier geändert

                werden.

              </p>

            )}

          </div>



          <div className="rounded-[30px] bg-white p-6 sm:p-7">

            <div className="mb-5">

              <h2 className="text-xl font-bold tracking-[-0.025em] text-black">

                Preis

              </h2>



              <p className="mt-1 text-sm leading-6 text-[#667085]">

                Ein Tarif mit allen Funktionen. Die Abrechnung richtet sich

                automatisch nach der Anzahl deiner aktiven

                Dipera-Mitarbeiterkonten.

              </p>

            </div>



            <div className="grid gap-4 md:grid-cols-2">

              <div className="rounded-[24px] bg-[#F2F5F8] px-5 py-5">

                <p className="text-sm text-[#667085]">

                  Grundpreis

                </p>



                <p className="mt-1 text-2xl font-semibold text-black">

                  29,90 €{" "}

                  <span className="text-sm font-medium text-[#667085]">

                    netto / Monat

                  </span>

                </p>



                <p className="mt-2 text-sm leading-6 text-[#323542]">

                  Inklusive bis zu 10 aktiver Mitarbeiterkonten und aller

                  Funktionen.

                </p>

              </div>



              <div className="rounded-[24px] bg-[#F2F5F8] px-5 py-5">

                <p className="text-sm text-[#667085]">

                  Ab dem 11. Mitarbeiter

                </p>



                <p className="mt-1 text-2xl font-semibold text-black">

                  +3,49 €{" "}

                  <span className="text-sm font-medium text-[#667085]">

                    netto / Monat

                  </span>

                </p>



                <p className="mt-2 text-sm leading-6 text-[#323542]">

                  Je zusätzlichem aktiven Mitarbeiterkonto. Aktivierungen

                  im laufenden Abrechnungszeitraum werden anteilig

                  berechnet.

                </p>

              </div>

            </div>



            <p className="mt-4 text-sm leading-6 text-[#667085]">

              Der Owner zählt als aktives Mitarbeiterkonto.

              Deaktivierungen reduzieren die Abrechnung ab dem nächsten

              Abrechnungszeitraum.

            </p>

          </div>



          <div className="rounded-[30px] bg-white p-6 sm:p-7">

            <div className="mb-5">

              <h2 className="text-xl font-bold tracking-[-0.025em] text-black">

                Administrator

              </h2>



              <p className="mt-1 text-sm leading-6 text-[#667085]">

                Die PIN wird für den ersten Administrator deines Betriebs

                verwendet.

              </p>

            </div>



            <div className="max-w-sm">

              <label

                htmlFor="admin-pin"

                className={labelClassName}

              >

                4-stellige Admin-PIN \*

              </label>



              <input

                id="admin-pin"

                type="text"

                inputMode="numeric"

                autoComplete="off"

                maxLength={4}

                placeholder="1234"

                value={adminPin}

                onChange={(event) => {

                  const onlyNumbers = event.target.value.replace(

                    /\D/g,

                    ""

                  );



                  setAdminPin(onlyNumbers.slice(0, 4));

                }}

                onKeyDown={(event) => {

                  if (event.key === "Enter") {

                    event.preventDefault();



                    void handleStartCheckout();

                  }

                }}

                disabled={isLoading}

                className={inputClassName}

              />

            </div>

          </div>



          {/* Rechtliche Zustimmung */}

          <div className="rounded-[30px] bg-white p-6 sm:p-7">

            <label

              htmlFor="legal-terms"

              className="flex cursor-pointer items-start gap-3"

            >

              <input

                id="legal-terms"

                type="checkbox"

                checked={acceptedLegalTerms}

                onChange={(event) =>

                  setAcceptedLegalTerms(event.target.checked)

                }

                disabled={isLoading}

                className="mt-1 h-5 w-5 shrink-0 cursor-pointer rounded border-slate-300 accent-[#31AEF0] disabled:cursor-not-allowed"

              />



              <span className="text-sm leading-6 text-[#323542]">

                Ich bestätige, dass ich als Unternehmer handle, und

                akzeptiere die{" "}

                <a

                  href="/agb"

                  target="_blank"

                  rel="noopener noreferrer"

                  className="font-semibold text-[#31AEF0] underline decoration-[#31AEF0]/35 underline-offset-4 transition hover:text-[#31AEF0]"

                  onClick={(event) => event.stopPropagation()}

                >

                  Allgemeinen Geschäftsbedingungen (AGB)

                </a>{" "}

                sowie den{" "}

                <a

                  href="/avv"

                  target="_blank"

                  rel="noopener noreferrer"

                  className="font-semibold text-[#31AEF0] underline decoration-[#31AEF0]/35 underline-offset-4 transition hover:text-[#31AEF0]"

                  onClick={(event) => event.stopPropagation()}

                >

                  Vertrag zur Auftragsverarbeitung (AVV)

                </a>

                .

              </span>

            </label>



            <p className="mt-3 pl-8 text-xs leading-5 text-[#8B93A1]">

              Die Dokumente öffnen sich in einem neuen Tab, damit deine

              Eingaben auf dieser Seite erhalten bleiben.

            </p>

          </div>



          <button

            type="button"

            onClick={() => void handleStartCheckout()}

            disabled={isLoading}

            className="h-[58px] w-full rounded-full bg-[#31AEF0] px-7 text-[15px] font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#219DE0] disabled:cursor-not-allowed disabled:translate-y-0 disabled:bg-[#AAB3BE]"

          >

            {isLoading

              ? "Testphase wird gestartet..."

              : "14 Tage kostenlos testen & Betrieb erstellen"}

          </button>



          <p className="text-center text-xs leading-relaxed text-[#667085]">

            14 Tage kostenlos. Danach 29,90 € netto pro Monat inklusive

            bis zu 10 aktiver Mitarbeiterkonten, anschließend 3,49 € netto

            je weiterem aktiven Mitarbeiterkonto. Monatlich kündbar.

          </p>

        </div>

      </section>



      {showPopup && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-6 backdrop-blur-sm">

          <div className="w-full max-w-lg rounded-[32px] bg-white p-8 text-center shadow-[0_24px_80px_rgba(36,50,77,0.18)]">

            <p className="mb-8 text-xl font-bold leading-8 text-black sm:text-2xl">

              {popupMessage}

            </p>



            <button

              type="button"

              onClick={() => setShowPopup(false)}

              className="rounded-full bg-[#31AEF0] px-10 py-4 font-bold text-white transition hover:bg-[#219DE0]"

            >

              OK

            </button>

          </div>

        </div>

      )}

    </main>

  );

}