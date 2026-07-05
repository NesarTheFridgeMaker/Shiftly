"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getBusinessId } from "@/lib/getBusinessId";

import PageHeader from "@/components/ui/PageHeader";
import Section from "@/components/ui/Section";
import StatCard from "@/components/ui/StatCard";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/ToastProvider";
import StatsSkeleton from "@/components/skeletons/StatsSkeleton";
import TableSkeleton from "@/components/skeletons/TableSkeleton";

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
  if (!time) return "—";
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
  const { showToast } = useToast();

  const [requests, setRequests] = useState<CorrectionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState("pending");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  async function loadCorrectionRequests() {
    setLoading(true);

    try {
      const businessId = await getBusinessId();

      if (!businessId) {
        showToast({
          type: "error",
          title: "Betrieb nicht gefunden",
          description: "Die Korrekturanträge konnten nicht geladen werden.",
        });
        return;
      }

      const { data, error } = await supabase
        .from("time_correction_requests")
        .select("*")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("LOAD CORRECTION REQUESTS ERROR:", error);
        showToast({
          type: "error",
          title: "Korrekturanträge konnten nicht geladen werden",
          description: error.message,
        });
        return;
      }

      setRequests((data || []) as CorrectionRequest[]);
    } finally {
      setLoading(false);
    }
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
    if (actionLoadingId) return;

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
      showToast({
        type: "error",
        title: "Antrag konnte nicht abgelehnt werden",
        description: error.message,
      });
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

    showToast({
      type: "success",
      title: "Antrag abgelehnt",
      description: `Der Antrag von ${request.employee_name} wurde abgelehnt.`,
    });
  }

  async function handleApproveRequest(request: CorrectionRequest) {
    if (actionLoadingId) return;

    if (!request.requested_start_time || !request.requested_end_time) {
      showToast({
        type: "warning",
        title: "Angaben fehlen",
        description:
          "Der Antrag kann nicht genehmigt werden, weil Beginn oder Ende fehlt.",
      });
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
      showToast({
        type: "error",
        title: "Arbeitszeit konnte nicht erstellt werden",
        description: insertError.message,
      });
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
      showToast({
        type: "warning",
        title: "Arbeitszeit erstellt, Status nicht aktualisiert",
        description: updateError.message,
      });
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

    showToast({
      type: "success",
      title: "Antrag genehmigt",
      description: `Die Arbeitszeit von ${request.employee_name} wurde erstellt.`,
    });
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Korrekturanträge"
          description="Prüfe beantragte Korrekturen für vergessene oder fehlerhafte Stempelzeiten."
        />

        <StatsSkeleton />

        <Section
          title="Anträge"
          description="Offene Anträge kannst du genehmigen oder ablehnen."
        >
          <TableSkeleton rows={5} columns={5} />
        </Section>
      </div>
    );
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
                className={[
                  "rounded-full px-3 py-1 text-xs font-medium transition-all duration-200",
                  selectedStatus === status.value
                    ? "bg-[#2563EB] text-white shadow-[0_8px_18px_rgba(37,99,235,0.18)]"
                    : "bg-[#F8FAFC] text-[#64748B] hover:bg-[#EFF6FF] hover:text-[#2563EB]",
                ].join(" ")}
              >
                {status.label}
              </button>
            ))}
          </div>
        }
      >
        {filteredRequests.length === 0 ? (
          <EmptyState
            title="Keine Korrekturanträge vorhanden"
            description="Sobald Mitarbeiter eine Stempelzeit korrigieren möchten, erscheinen die Anträge hier."
            compact
          />
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((request) => (
              <div
                key={request.id}
                className="rounded-3xl border border-[#E2E8F0] bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#CBD5E1] hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)]"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-xl font-semibold tracking-[-0.02em] text-[#0F172A]">
                        {request.employee_name}
                      </h2>

                      <Badge variant={getStatusVariant(request.status)} dot>
                        {formatStatus(request.status)}
                      </Badge>
                    </div>

                    <p className="mt-1 text-sm text-[#64748B]">
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
                  <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                    <p className="text-xs font-medium text-[#64748B]">Datum</p>
                    <p className="mt-1 text-sm font-semibold text-[#0F172A]">
                      {formatDate(request.correction_date)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                    <p className="text-xs font-medium text-[#64748B]">
                      Arbeitsbeginn
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#0F172A]">
                      {formatTime(request.requested_start_time)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                    <p className="text-xs font-medium text-[#64748B]">
                      Arbeitsende
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#0F172A]">
                      {formatTime(request.requested_end_time)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                  <p className="text-xs font-medium text-[#64748B]">
                    Begründung
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[#0F172A]">
                    {request.reason || "Keine Begründung angegeben."}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
