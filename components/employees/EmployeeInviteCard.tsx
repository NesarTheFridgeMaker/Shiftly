"use client";

import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

type EmployeeInvite = {
  id: string;
  employee_id: string;
  business_id: string;
  invite_code: string;
  email: string | null;
  delivery_method: "email" | "whatsapp";
  auth_user_id: string | null;
  claimed_at: string | null;
  used_at: string | null;
};

type EmployeeInviteCardProps = {
  invite: EmployeeInvite | null;
  onOpenInvite: () => void;
};

export default function EmployeeInviteCard({
  invite,
  onOpenInvite,
}: EmployeeInviteCardProps) {
  const hasOpenInvite = Boolean(invite && !invite.used_at);

  return (
    <div className="mt-4 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h4 className="font-semibold text-[#0F172A]">
            Mitarbeiter-Zugang
          </h4>

          <p className="mt-1 text-sm text-[#64748B]">
            Einladung für das Mitarbeiter-Dashboard.
          </p>
        </div>

        {invite?.used_at ? (
          <Badge variant="success" dot>
            Registriert
          </Badge>
        ) : invite ? (
          <Badge variant="primary" dot>
            Einladung offen
          </Badge>
        ) : (
          <Badge variant="muted">Einladung fehlt</Badge>
        )}
      </div>

      {invite ? (
        <>
          <div className="rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 font-mono text-sm font-semibold tracking-wide text-[#0F172A]">
            {invite.invite_code}
          </div>

          {!invite.used_at && (
            <p className="mt-2 text-xs font-medium text-[#64748B]">
              Versandart:{" "}
              {invite.delivery_method === "email"
                ? `E-Mail${invite.email ? ` an ${invite.email}` : ""}`
                : "WhatsApp oder kopierter Link"}
            </p>
          )}

          <p className="mt-2 text-xs leading-5 text-[#64748B]">
            {invite.used_at
              ? "Der Mitarbeiter hat seinen Zugang bereits aktiviert."
              : "Die Einladung wurde noch nicht verwendet und kann jederzeit erneut versendet werden."}
          </p>

          {hasOpenInvite && (
            <div className="mt-4">
              <Button
                variant="primary"
                size="sm"
                type="button"
                onClick={onOpenInvite}
              >
                Einladung versenden
              </Button>
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-[#64748B]">
          Für diesen Mitarbeiter wurde noch kein Einladungscode erstellt.
        </p>
      )}
    </div>
  );
}