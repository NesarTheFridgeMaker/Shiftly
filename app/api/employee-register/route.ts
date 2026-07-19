import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      message:
        "Dieser Registrierungsweg ist nicht mehr verfügbar.",
    },
    {
      status: 410,
    }
  );
}