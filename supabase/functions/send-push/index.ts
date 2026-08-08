import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { JWT } from "npm:google-auth-library";

type PushRequest = {
  employeeId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
};

type FirebaseServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
};

type PushDevice = {
  id: string;
  fcm_token: string;
};

export default {
  fetch: withSupabase(
    {
      auth: "user",
    },
    async (req, ctx) => {
      try {
        if (req.method !== "POST") {
          return Response.json(
            {
              success: false,
              error: "Nur POST-Anfragen sind erlaubt.",
            },
            {
              status: 405,
            },
          );
        }

        const userId = ctx.userClaims?.id;

        if (!userId) {
          return Response.json(
            {
              success: false,
              error: "Benutzer konnte nicht bestimmt werden.",
            },
            {
              status: 401,
            },
          );
        }

        const payload = (await req.json()) as PushRequest;

        if (
          !payload.employeeId?.trim() ||
          !payload.title?.trim() ||
          !payload.body?.trim()
        ) {
          return Response.json(
            {
              success: false,
              error:
                "employeeId, title und body müssen angegeben werden.",
            },
            {
              status: 400,
            },
          );
        }

        /*
         * Absender prüfen.
         *
         * Nur Owner und Admins dürfen diese Function
         * derzeit direkt aufrufen.
         */
        const {
          data: senderProfile,
          error: senderProfileError,
        } = await ctx.supabaseAdmin
          .from("profiles")
          .select("role, business_id")
          .eq("id", userId)
          .maybeSingle();

        if (senderProfileError) {
          console.error(
            "SEND PUSH PROFILE ERROR:",
            senderProfileError,
          );

          return Response.json(
            {
              success: false,
              error:
                "Das Benutzerprofil konnte nicht geprüft werden.",
            },
            {
              status: 500,
            },
          );
        }

        if (!senderProfile) {
          return Response.json(
            {
              success: false,
              error: "Benutzerprofil wurde nicht gefunden.",
            },
            {
              status: 403,
            },
          );
        }

        if (
          senderProfile.role !== "owner" &&
          senderProfile.role !== "admin"
        ) {
          return Response.json(
            {
              success: false,
              error:
                "Du hast keine Berechtigung, Push-Nachrichten zu versenden.",
            },
            {
              status: 403,
            },
          );
        }

        const businessId =
          senderProfile.business_id as string | null;

        if (!businessId) {
          return Response.json(
            {
              success: false,
              error:
                "Dem Benutzer ist kein Betrieb zugeordnet.",
            },
            {
              status: 400,
            },
          );
        }

        /*
         * Sicherstellen, dass der Zielmitarbeiter
         * tatsächlich zum selben Betrieb gehört.
         */
        const {
          data: targetEmployee,
          error: employeeError,
        } = await ctx.supabaseAdmin
          .from("employees")
          .select("id, business_id")
          .eq("id", payload.employeeId)
          .eq("business_id", businessId)
          .maybeSingle();

        if (employeeError) {
          console.error(
            "SEND PUSH EMPLOYEE ERROR:",
            employeeError,
          );

          return Response.json(
            {
              success: false,
              error:
                "Der Zielmitarbeiter konnte nicht geprüft werden.",
            },
            {
              status: 500,
            },
          );
        }

        if (!targetEmployee) {
          return Response.json(
            {
              success: false,
              error:
                "Der Mitarbeiter wurde in diesem Betrieb nicht gefunden.",
            },
            {
              status: 404,
            },
          );
        }

        /*
         * Alle registrierten Geräte des Mitarbeiters laden.
         */
        const {
          data: devices,
          error: devicesError,
        } = await ctx.supabaseAdmin
          .from("push_devices")
          .select("id, fcm_token")
          .eq("employee_id", payload.employeeId)
          .eq("business_id", businessId);

        if (devicesError) {
          console.error(
            "SEND PUSH DEVICES ERROR:",
            devicesError,
          );

          return Response.json(
            {
              success: false,
              error:
                "Die Push-Geräte konnten nicht geladen werden.",
            },
            {
              status: 500,
            },
          );
        }

        const pushDevices =
          (devices ?? []) as PushDevice[];

        if (pushDevices.length === 0) {
          return Response.json(
            {
              success: false,
              error:
                "Für diesen Mitarbeiter ist kein Push-Gerät registriert.",
            },
            {
              status: 404,
            },
          );
        }

        /*
         * Firebase-Service-Account aus Supabase Secret laden.
         */
        const rawServiceAccount = Deno.env.get(
          "FIREBASE_SERVICE_ACCOUNT_JSON",
        );

        if (!rawServiceAccount) {
          throw new Error(
            "FIREBASE_SERVICE_ACCOUNT_JSON ist nicht konfiguriert.",
          );
        }

        const serviceAccount = JSON.parse(
          rawServiceAccount,
        ) as FirebaseServiceAccount;

        if (
          !serviceAccount.project_id ||
          !serviceAccount.client_email ||
          !serviceAccount.private_key
        ) {
          throw new Error(
            "Der Firebase-Service-Account ist unvollständig.",
          );
        }

        const accessToken =
          await getFirebaseAccessToken(serviceAccount);

        const sendResults: Array<{
          deviceId: string;
          success: boolean;
          status: number;
          response: unknown;
        }> = [];

        /*
         * An jedes registrierte Gerät senden.
         */
        for (const device of pushDevices) {
          const firebaseResponse = await fetch(
            `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                message: {
                  token: device.fcm_token,

                  notification: {
                    title: payload.title.trim(),
                    body: payload.body.trim(),
                  },

                  data: payload.data ?? {},

                  android: {
                  priority: "high",

                  notification: {
                    channel_id: "dipera_high_importance_v1",
                    sound: "default",
                  },
                },

                  apns: {
                    payload: {
                      aps: {
                        sound: "default",
                      },
                    },
                  },
                },
              }),
            },
          );

          let responseBody: unknown;

          try {
            responseBody =
              await firebaseResponse.json();
          } catch {
            responseBody =
              await firebaseResponse.text();
          }

          sendResults.push({
            deviceId: device.id,
            success: firebaseResponse.ok,
            status: firebaseResponse.status,
            response: responseBody,
          });
        }

        const successful = sendResults.filter(
          (result) => result.success,
        ).length;

        return Response.json({
          success: successful > 0,
          sent: successful,
          totalDevices: pushDevices.length,
          results: sendResults,
        });
      } catch (error) {
        console.error(
          "SEND PUSH ERROR:",
          error,
        );

        return Response.json(
          {
            success: false,
            error:
              error instanceof Error
                ? error.message
                : "Beim Push-Versand ist ein unbekannter Fehler aufgetreten.",
          },
          {
            status: 500,
          },
        );
      }
    },
  ),
};

async function getFirebaseAccessToken(
  serviceAccount: FirebaseServiceAccount,
) {
  const jwtClient = new JWT({
    email: serviceAccount.client_email,
    key: serviceAccount.private_key,
    scopes: [
      "https://www.googleapis.com/auth/firebase.messaging",
    ],
  });

  const credentials =
    await jwtClient.authorize();

  if (!credentials.access_token) {
    throw new Error(
      "Firebase OAuth-Token konnte nicht erzeugt werden.",
    );
  }

  return credentials.access_token;
}