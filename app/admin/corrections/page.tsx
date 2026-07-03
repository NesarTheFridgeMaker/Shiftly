"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getBusinessId } from "@/lib/getBusinessId";
import PageHeader from "@/components/ui/PageHeader";
import Section from "@/components/ui/Section";
import StatCard from "@/components/ui/StatCard";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import DiperaPopup from "@/components/DiperaPopup";

const statusOptions = [
  { value: "all", label: "Alle" },
  { value: "pending", label: "Offen" },
  { value: "approved", label: "Genehmigt" },
  { value: "rejected", label: "Abgelehnt" },
];

type CorrectionRequest = {
  id: string;
  business_id: string;
  employee_id: string;
  employee_name: string;
  correction_date: string;
  requested_start_time: string | null;
  requested_end_time: string | null;
  reason: string | null;
  status: string;
  created_at: string;
};

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("de-DE");
}

function formatTime(time: string | null) {
  if (!time) return "-";
  return time.slice(0, 5);
}

function formatStatus(status: string) {
  if (status === "pending") return "Offen";
  if (status === "approved") return "Genehmigt";
  if (status === "rejected") return "Abgelehnt";
  return status;
}

function getStatusVariant(status: string) {
  if (status === "approved") return "success" as const;
  if (status === "rejected") return "danger" as const;
  if (status === "pending") return "warning" as const;
  return "muted" as const;
}

export default function CorrectionsPage() {
  const [requests, setRequests] = useState<CorrectionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState("pending");
  const [popupMessage, setPopupMessage] = useState("");
  const [showPopup, setShowPopup] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  function showDiperaPopup(message: string) {
    setPopupMessage(message);
    setShowPopup(true);
  }

  async function loadCorrectionRequests() {
    setLoading(true);

    const businessId = await getBusinessId();

    if (!businessId) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("time_correction_requests")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("LOAD CORRECTION REQUESTS ERROR:", error);
      showDiperaPopup(
        `Korrekturanträge konnten nicht geladen werden. ${error.message ?? ""}`
      );
      setLoading(false);
      return;
    }

    setRequests(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadCorrectionRequests();
  }, []);

  const pendingCount = requests.filter(
    (request) => request.status === "pending"
  ).length;

  const approvedCount = requests.filter(
    (request) => request.status === "approved"
  ).length;

  const rejectedCount = requests.filter(
    (request) => request.status === "rejected"
  ).length;

  const filteredRequests = useMemo(() => {
    if (selectedStatus === "all") return requests;

    return requests.filter((request) => request.status === selectedStatus);
  }, [requests, selectedStatus]);

  async function notifyEmployee(
    request: CorrectionRequest,
    title: string,
    message: string
  ) {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("employee_id", request.employee_id)
      .single();

    if (error) {
      console.error("PROFILE LOOKUP ERROR:", error);
      return;
    }

    if (!profile?.id) return;

    const { error: notificationError } = await supabase
      .from("notifications")
      .insert([
        {
          business_id: request.business_id,
          user_id: profile.id,
          employee_id: request.employee_id,
          title,
          message,
          type: "time_correction",
          is_read: false,
        },
      ]);

    if (notificationError) {
      console.error("NOTIFICATION ERROR:", notificationError);
    }
  }

  async function handleRejectRequest(request: CorrectionRequest) {
    setActionLoadingId(request.id);

    const { error } = await supabase
      .from("time_correction_requests")
      .update({
        status: "rejected",
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", request.id);

    if (error) {
      console.error("REJECT ERROR:", error);
      showDiperaPopup(
        `Der Antrag konnte nicht abgelehnt werden. ${error.message ?? ""}`
      );
      setActionLoadingId(null);
      return;
    }

    await notifyEmployee(
      request,
      "Korrekturantrag abgelehnt",
      `Dein Korrekturantrag für den ${formatDate(
        request.correction_date
      )} wurde abgelehnt.`
    );

    await loadCorrectionRequests();
    window.dispatchEvent(new Event("correctionRequestsChanged"));
    setActionLoadingId(null);
    showDiperaPopup("Der Antrag wurde erfolgreich abgelehnt.");
  }

  async function handleApproveRequest(request: CorrectionRequest) {
    if (!request.requested_start_time || !request.requested_end_time) {
      showDiperaPopup(
        "Der Antrag kann nicht genehmigt werden, weil Beginn oder Ende fehlt."
      );
      return;
    }

    setActionLoadingId(request.id);

    const startDateTime = `${request.correction_date}T${request.requested_start_time}`;
    const endDateTime = `${request.correction_date}T${request.requested_end_time}`;

    const startDate = new Date(startDateTime);
    const endDate = new Date(endDateTime);

    if (endDate <= startDate) {
      endDate.setDate(endDate.getDate() + 1);
    }

    const { error: insertError } = await supabase.from("time_entries").insert([
      {
        business_id: request.business_id,
        employee_id: request.employee_id,
        employee_name: request.employee_name,
        action: "check_in",
        created_at: startDate.toISOString(),
      },
      {
        business_id: request.business_id,
        employee_id: request.employee_id,
        employee_name: request.employee_name,
        action: "check_out",
        created_at: endDate.toISOString(),
      },
    ]);

    if (insertError) {
      console.error("TIME ENTRY INSERT ERROR:", insertError);
      showDiperaPopup(
        `Die Arbeitszeit konnte nicht erstellt werden. ${insertError.message ?? ""}`
      );
      setActionLoadingId(null);
      return;
    }

    const { error: updateError } = await supabase
      .from("time_correction_requests")
      .update({
        status: "approved",
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", request.id);

    if (updateError) {
      console.error("REQUEST UPDATE ERROR:", updateError);
      showDiperaPopup(
        `Die Arbeitszeit wurde erstellt, aber der Antrag konnte nicht als genehmigt markiert werden. ${updateError.message ?? ""}`
      );
      setActionLoadingId(null);
      return;
    }

    await notifyEmployee(
      request,
      "Korrekturantrag genehmigt",
      `Dein Korrekturantrag für den ${formatDate(
        request.correction_date
      )} wurde genehmigt.`
    );

    await loadCorrectionRequests();
    window.dispatchEvent(new Event("correctionRequestsChanged"));
    setActionLoadingId(null);
    showDiperaPopup("Der Antrag wurde erfolgreich genehmigt.");
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Korrekturanträge"
        description="Prüfe beantragte Korrekturen für vergessene oder fehlerhafte Stempelzeiten."
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Offen"
          value={pendingCount}
          badge="Prüfen"
          badgeVariant="warning"
        />

        <StatCard
          title="Genehmigt"
          value={approvedCount}
          badge="Erledigt"
          badgeVariant="success"
        />

        <StatCard
          title="Abgelehnt"
          value={rejectedCount}
          badge="Archiv"
          badgeVariant="danger"
        />

        <StatCard
          title="Gesamt"
          value={requests.length}
          badge="Alle"
          badgeVariant="muted"
        />
      </div>

      <Section
        title="Anträge"
        description="Offene Anträge kannst du genehmigen oder ablehnen. Genehmigte Anträge erstellen automatisch Arbeitszeiten."
        action={
          <div className="flex flex-wrap gap-2">
            {statusOptions.map((status) => (
              <button
                key={status.value}
                type="button"
                onClick={() => setSelectedStatus(status.value)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  selectedStatus === status.value
                    ? "bg-[#2563EB] text-white"
                    : "bg-[#F8FAFC] text-[#6B7280] hover:bg-[#EFF6FF] hover:text-[#2563EB]"
                }`}
              >
                {status.label}
              </button>
            ))}
          </div>
        }
      >
        {loading ? (
          <div className="rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] px-4 py-5 text-sm text-[#6B7280]">
            Korrekturanträge werden geladen...
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-6 py-10 text-center">
            <p className="text-base font-medium text-[#111827]">
              Keine Korrekturanträge vorhanden
            </p>
            <p className="mt-2 text-sm text-[#6B7280]">
              Sobald Mitarbeiter eine Stempelzeit korrigieren möchten, erscheinen die Anträge hier.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((request) => (
              <div
                key={request.id}
                className="rounded-3xl border border-[#E5E7EB] bg-white p-5 shadow-[0_10px_24px_rgba(17,24,39,0.04)]"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-xl font-light tracking-[-0.02em] text-[#111827]">
                        {request.employee_name}
                      </h2>

                      <Badge variant={getStatusVariant(request.status)}>
                        {formatStatus(request.status)}
                      </Badge>
                    </div>

                    <p className="mt-1 text-sm text-[#6B7280]">
                      Antrag vom {formatDate(request.created_at)}
                    </p>
                  </div>

                  {request.status === "pending" && (
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        loading={actionLoadingId === request.id}
                        onClick={() => handleApproveRequest(request)}
                      >
                        Genehmigen
                      </Button>

                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        disabled={actionLoadingId === request.id}
                        onClick={() => handleRejectRequest(request)}
                      >
                        Ablehnen
                      </Button>
                    </div>
                  )}
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] p-4">
                    <p className="text-xs text-[#6B7280]">Datum</p>
                    <p className="mt-1 text-sm font-medium text-[#111827]">
                      {formatDate(request.correction_date)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] p-4">
                    <p className="text-xs text-[#6B7280]">Arbeitsbeginn</p>
                    <p className="mt-1 text-sm font-medium text-[#111827]">
                      {formatTime(request.requested_start_time)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] p-4">
                    <p className="text-xs text-[#6B7280]">Arbeitsende</p>
                    <p className="mt-1 text-sm font-medium text-[#111827]">
                      {formatTime(request.requested_end_time)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] p-4">
                  <p className="text-xs text-[#6B7280]">Begründung</p>
                  <p className="mt-1 text-sm leading-6 text-[#111827]">
                    {request.reason || "Keine Begründung angegeben."}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <DiperaPopup
        open={showPopup}
        message={popupMessage}
        onClose={() => setShowPopup(false)}
      />
    </div>
  );
}
