import { NextResponse } from "next/server";
import { resend } from "@/lib/resend";

export async function POST() {
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!fromEmail) {
    return NextResponse.json(
      { error: "RESEND_FROM_EMAIL ist nicht gesetzt." },
      { status: 500 }
    );
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `Dipera <${fromEmail}>`,
      to: "nesar.khalil@gmx.de",
      subject: "Dipera – Test-E-Mail",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 24px;">
          <h1 style="color: #005CA8;">Dipera</h1>
          <p>Der E-Mail-Versand über Resend funktioniert.</p>
        </div>
      `,
    });

    if (error) {
      console.error("Resend-Fehler:", error);

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      emailId: data?.id,
    });
  } catch (error) {
    console.error("Unerwarteter E-Mail-Fehler:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Die E-Mail konnte nicht versendet werden.",
      },
      { status: 500 }
    );
  }
}