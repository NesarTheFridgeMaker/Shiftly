import { NextRequest, NextResponse } from "next/server";

import { stripe } from "@/lib/stripe";

import { supabaseAdmin } from "@/lib/supabaseServer";

const CURRENT_AGB_VERSION = "2026-09-25";
const CURRENT_AVV_VERSION = "2026-09-25";

type CheckoutRequestBody = {
  businessName?: unknown;

  adminName?: unknown;

  contactName?: unknown;

  adminPin?: unknown;

  phone?: unknown;

  street?: unknown;

  houseNumber?: unknown;

  postalCode?: unknown;

  city?: unknown;

  countryCode?: unknown;

  supportEmail?: unknown;

  billingEmail?: unknown;

  website?: unknown;

  vatId?: unknown;

  legalForm?: unknown;

  legalTermsAccepted?: unknown;
};

function getBearerToken(request: NextRequest) {
  const authorization =
    request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization
    .slice("Bearer ".length)
    .trim();

  return token || null;
}

function getRequiredString(value: unknown) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function getOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const cleaned = value.trim();

  return cleaned || null;
}

function normalizeEmail(value: unknown) {
  return typeof value === "string"
    ? value.trim().toLowerCase()
    : "";
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidWebsite(value: string | null) {
  if (!value) {
    return true;
  }

  try {
    const parsedUrl = new URL(value);

    return (
      parsedUrl.protocol === "http:" ||
      parsedUrl.protocol === "https:"
    );
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";

    const accessToken = getBearerToken(request);

    if (!accessToken) {
      return NextResponse.json(
        { error: "Nicht angemeldet." },
        { status: 401 }
      );
    }

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(accessToken);

    if (userError || !user) {
      console.error(
        "CHECKOUT USER ERROR:",
        userError
      );

      return NextResponse.json(
        {
          error:
            "Deine Anmeldung ist nicht mehr gültig.",
        },
        { status: 401 }
      );
    }

    if (
      user.user_metadata?.registration_type !==
      "business_owner"
    ) {
      return NextResponse.json(
        {
          error:
            "Dieser Checkout ist nur für Unternehmensregistrierungen verfügbar.",
        },
        { status: 403 }
      );
    }

    let body: CheckoutRequestBody;

    try {
      body =
        (await request.json()) as CheckoutRequestBody;
    } catch {
      return NextResponse.json(
        { error: "Ungültige Anfrage." },
        { status: 400 }
      );
    }

    const businessName =
      getRequiredString(body.businessName);

    const adminName =
      getRequiredString(body.adminName);

    const contactName =
      getRequiredString(body.contactName) ||
      adminName;

    const adminPin =
      getRequiredString(body.adminPin);

    const phone =
      getRequiredString(body.phone);

    const street =
      getRequiredString(body.street);

    const houseNumber =
      getRequiredString(body.houseNumber);

    const postalCode =
      getRequiredString(body.postalCode);

    const city =
      getRequiredString(body.city);

    const countryCode =
      getRequiredString(body.countryCode)
        .toUpperCase();

    const supportEmail =
      normalizeEmail(body.supportEmail);

    const billingEmail =
      normalizeEmail(body.billingEmail);

    const website =
      getOptionalString(body.website);

    const vatId =
      getOptionalString(body.vatId);

    const legalForm =
      getOptionalString(body.legalForm);

    const legalTermsAccepted =
      body.legalTermsAccepted === true;

    if (
      !businessName ||
      !adminName ||
      !contactName ||
      !adminPin ||
      !phone ||
      !street ||
      !houseNumber ||
      !postalCode ||
      !city ||
      !countryCode ||
      !supportEmail ||
      !billingEmail
    ) {
      return NextResponse.json(
        {
          error:
            "Bitte fülle alle Pflichtfelder vollständig aus.",
        },
        { status: 400 }
      );
    }

    if (!/^\d{4}$/.test(adminPin)) {
      return NextResponse.json(
        {
          error:
            "Die Admin-PIN muss aus genau vier Zahlen bestehen.",
        },
        { status: 400 }
      );
    }

    if (!/^[A-Z]{2}$/.test(countryCode)) {
      return NextResponse.json(
        {
          error:
            "Der ausgewählte Ländercode ist ungültig.",
        },
        { status: 400 }
      );
    }

    if (
      !isValidEmail(supportEmail) ||
      !isValidEmail(billingEmail)
    ) {
      return NextResponse.json(
        {
          error:
            "Bitte prüfe die Support- und Rechnungs-E-Mail-Adresse.",
        },
        { status: 400 }
      );
    }

    if (!isValidWebsite(website)) {
      return NextResponse.json(
        {
          error:
            "Bitte gib eine gültige Website mit http:// oder https:// an.",
        },
        { status: 400 }
      );
    }

    /*
     * Die rechtliche Zustimmung wird zusätzlich serverseitig geprüft.
     * Eine ausschließlich clientseitige Checkbox reicht nicht aus,
     * da Requests an diese Route auch direkt gesendet werden könnten.
     */
    if (!legalTermsAccepted) {
      return NextResponse.json(
        {
          error:
            "Bitte bestätige die AGB und den Vertrag zur Auftragsverarbeitung (AVV).",
        },
        { status: 400 }
      );
    }

    const basePriceId =
      process.env.STRIPE_PRICE_BASE;

    if (!basePriceId) {
      console.error(
        "STRIPE_PRICE_BASE ist nicht gesetzt."
      );

      return NextResponse.json(
        {
          error:
            "Der Dipera-Grundpreis ist noch nicht für den Checkout konfiguriert.",
        },
        { status: 500 }
      );
    }

    /*
     * Bereits vollständig eingerichtete Nutzer dürfen
     * keinen zweiten Betrieb über denselben Setup-Ablauf erzeugen.
     */
    const {
      data: existingProfile,
      error: existingProfileError,
    } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (existingProfileError) {
      console.error(
        "CHECKOUT PROFILE CHECK ERROR:",
        existingProfileError
      );

      return NextResponse.json(
        {
          error:
            "Der Kontostatus konnte nicht geprüft werden.",
        },
        { status: 500 }
      );
    }

    if (existingProfile) {
      return NextResponse.json(
        {
          error:
            "Für dieses Konto wurde bereits ein Betrieb eingerichtet.",
        },
        { status: 409 }
      );
    }

    /*
     * Vorhandenes offenes Setup wiederverwenden,
     * statt bei jedem Checkout-Versuch einen neuen Datensatz anzulegen.
     */
    const {
      data: existingPendingSetup,
      error: pendingLookupError,
    } = await supabaseAdmin
      .from("pending_business_setups")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .order("created_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (pendingLookupError) {
      console.error(
        "PENDING SETUP LOOKUP ERROR:",
        pendingLookupError
      );

      return NextResponse.json(
        {
          error:
            "Die Einrichtung konnte nicht vorbereitet werden.",
        },
        { status: 500 }
      );
    }

    let pendingSetupId: string;

    /*
     * Der Zeitpunkt und die Versionen werden bewusst serverseitig
     * festgelegt. Der Browser übermittelt lediglich, ob der Nutzer
     * die Zustimmung aktiv erteilt hat.
     */
    const legalAcceptedAt =
      new Date().toISOString();

    const pendingSetupValue = {
      user_id: user.id,

      business_name: businessName,

      admin_name: adminName,

      contact_name: contactName,

      admin_pin: adminPin,

      status: "pending",

      phone,

      street,

      house_number: houseNumber,

      postal_code: postalCode,

      city,

      country_code: countryCode,

      support_email: supportEmail,

      billing_email: billingEmail,

      website,

      vat_id: vatId,

      legal_form: legalForm,

      plan_key: null,

      employee_limit: null,

      requested_employee_count: null,

      legal_accepted_at: legalAcceptedAt,

      agb_version: CURRENT_AGB_VERSION,

      avv_version: CURRENT_AVV_VERSION,
    };

    if (existingPendingSetup) {
      const { error: pendingUpdateError } =
        await supabaseAdmin
          .from("pending_business_setups")
          .update(pendingSetupValue)
          .eq("id", existingPendingSetup.id)
          .eq("user_id", user.id);

      if (pendingUpdateError) {
        console.error(
          "PENDING SETUP UPDATE ERROR:",
          pendingUpdateError
        );

        return NextResponse.json(
          {
            error:
              "Die Einrichtung konnte nicht aktualisiert werden.",
          },
          { status: 500 }
        );
      }

      pendingSetupId =
        existingPendingSetup.id;
    } else {
      const {
        data: createdPendingSetup,
        error: pendingInsertError,
      } = await supabaseAdmin
        .from("pending_business_setups")
        .insert(pendingSetupValue)
        .select("id")
        .single();

      if (
        pendingInsertError ||
        !createdPendingSetup
      ) {
        console.error(
          "PENDING SETUP INSERT ERROR:",
          pendingInsertError
        );

        return NextResponse.json(
          {
            error:
              "Die Einrichtung konnte nicht vorbereitet werden.",
          },
          { status: 500 }
        );
      }

      pendingSetupId =
        createdPendingSetup.id;
    }

    const session =
      await stripe.checkout.sessions.create({
        mode: "subscription",

        customer_email:
          user.email ?? billingEmail,

        line_items: [
          {
            price: basePriceId,

            quantity: 1,
          },
        ],

        subscription_data: {
          trial_period_days: 14,

          metadata: {
            pending_setup_id:
              pendingSetupId,

            user_id: user.id,
          },
        },

        metadata: {
          pending_setup_id:
            pendingSetupId,

          user_id: user.id,
        },

        success_url:
          `${appUrl}/setup?checkout=success`,

        cancel_url:
          `${appUrl}/setup?checkout=cancelled`,
      });

    if (!session.url) {
      return NextResponse.json(
        {
          error:
            "Stripe hat keine Checkout-URL zurückgegeben.",
        },
        { status: 500 }
      );
    }

    const { error: sessionUpdateError } =
      await supabaseAdmin
        .from("pending_business_setups")
        .update({
          stripe_checkout_session_id:
            session.id,
        })
        .eq("id", pendingSetupId)
        .eq("user_id", user.id);

    if (sessionUpdateError) {
      console.error(
        "CHECKOUT SESSION SAVE ERROR:",
        sessionUpdateError
      );
    }

    return NextResponse.json({
      url: session.url,
    });
  } catch (error) {
    console.error(
      "STRIPE CHECKOUT ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Checkout konnte nicht erstellt werden.",
      },
      { status: 500 }
    );
  }
}