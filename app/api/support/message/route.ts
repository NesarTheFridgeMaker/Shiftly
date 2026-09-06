import { NextRequest, NextResponse } from "next/server";

const RESEND_API_URL = "https://api.resend.com/emails";

type SupportMessageBody = {
  type?: "contact" | "feedback";
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
  website?: string;
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SupportMessageBody;

    const type = body.type === "feedback" ? "feedback" : "contact";
    const name = body.name?.trim() || "";
    const email = body.email?.trim() || "";
    const subject = body.subject?.trim() || "";
    const message = body.message?.trim() || "";
    const honeypot = body.website?.trim() || "";

    // Silent bot rejection.
    if (honeypot) {
      return NextResponse.json({ success: true });
    }

    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: "Bitte fülle alle Pflichtfelder aus." },
        { status: 400 },
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Bitte gib eine gültige E-Mail-Adresse ein." },
        { status: 400 },
      );
    }

    if (name.length > 120 || subject.length > 180 || message.length > 10000) {
      return NextResponse.json(
        { error: "Die Eingabe ist zu lang." },
        { status: 400 },
      );
    }

    const resendApiKey = process.env.RESEND_API_KEY;

    const supportEmail =
      process.env.SUPPORT_EMAIL || "support@dipera.de";

    const feedbackEmail =
      process.env.FEEDBACK_EMAIL || "feedback@dipera.de";

    const recipientEmail =
      type === "feedback" ? feedbackEmail : supportEmail;

    const fromEmail =
      type === "feedback"
        ? "Dipera Feedbackformular <feedbackformular@dipera.de>"
        : "Dipera Kontaktformular <kontaktformular@dipera.de>";

    if (!resendApiKey) {
      console.error("RESEND_API_KEY is missing.");

      return NextResponse.json(
        { error: "Der E-Mail-Versand ist noch nicht konfiguriert." },
        { status: 500 },
      );
    }

    const mailSubject =
      type === "feedback"
        ? `[Dipera Feedback] ${subject}`
        : `[Dipera Kontakt] ${subject}`;

    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
        <h2>${
          type === "feedback"
            ? "Neues Dipera-Feedback"
            : "Neue Support-Anfrage"
        }</h2>

        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>E-Mail:</strong> ${escapeHtml(email)}</p>
        <p><strong>Betreff:</strong> ${escapeHtml(subject)}</p>

        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0" />

        <p style="white-space:pre-wrap">${escapeHtml(message)}</p>
      </div>
    `;

    const resendResponse = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [recipientEmail],
        reply_to: email,
        subject: mailSubject,
        html,
      }),
    });

    const resendResult = await resendResponse.json().catch(() => null);

    if (!resendResponse.ok) {
      console.error("RESEND SUPPORT MAIL ERROR:", resendResult);

      return NextResponse.json(
        { error: "Die Nachricht konnte nicht gesendet werden." },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("SUPPORT MESSAGE ROUTE ERROR:", error);

    return NextResponse.json(
      { error: "Die Nachricht konnte nicht verarbeitet werden." },
      { status: 500 },
    );
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
