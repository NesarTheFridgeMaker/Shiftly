"use client";

import { useEffect, useState } from "react";
import { ClipboardClock } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { getBusiness } from "@/lib/getBusiness";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import CardBody from "@/components/ui/CardBody";
import EmptyState from "@/components/ui/EmptyState";
import Input from "@/components/ui/Input";
import PageHeader from "@/components/ui/PageHeader";
import Section from "@/components/ui/Section";
import Textarea from "@/components/ui/Textarea";
import TimeInput from "@/components/ui/TimeInput";
import PageSkeleton from "@/components/skeletons/PageSkeleton";
import { useToast } from "@/components/ui/ToastProvider";

type Employee = {
  id: string;
  name: string;
};

type Profile = {
  role: string;
  business_id: string;
  employee_id: string | null;
};

type CorrectionRequest = {
  id: string;
  correction_date: string;
  requested_start_time: string | null;
  requested_end_time: string | null;
  reason: string | null;
  status: string;
};

function formatDate(dateString: string) {
  return new Date(`${dateString}T12:00:00`).toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatTime(time?: string | null) {
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
  return "warning" as const;
}

function getTodayString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function EmployeeCorrectionsPage() {
  const { showToast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [businessId, setBusinessId] = useState("");
  const [requests, setRequests] = useState<CorrectionRequest[]>([]);

  const [correctionDate, setCorrectionDate] = useState("");
  const [correctionStartTime, setCorrectionStartTime] = useState("");
  const [correctionEndTime, setCorrectionEndTime] = useState("");
  const [correctionReason, setCorrectionReason] = useState("");

  async function loadCorrectionRequests(
    selectedBusinessId: string,
    selectedEmployeeId: string
  ) {
    const { data, error } = await supabase
      .from("time_correction_requests")
      .select(
        "id, correction_date, requested_start_time, requested_end_time, reason, status"
      )
      .eq("business_id", selectedBusinessId)
      .eq("employee_id", selectedEmployeeId)
      .order("correction_date", { ascending: false });

    if (error) {
      console.error(error);
      showToast({
        type: "error",
        title: "Korrekturanträge konnten nicht geladen werden",
        description: error.message,
      });
      return;
    }

    setRequests((data || []) as CorrectionRequest[]);
  }

  async function loadPage() {
    setIsLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("role, business_id, employee_id")
        .eq("id", user.id)
        .single();

      if (profileError || !profileData) {
        console.error(profileError);
        showToast({
          type: "error",
          title: "Profil konnte nicht geladen werden",
          description: "Bitte melde dich erneut an.",
        });
        return;
      }

      const profile = profileData as Profile;

      if (profile.role !== "employee") {
        window.location.href = "/admin";
        return;
      }

      if (!profile.business_id || !profile.employee_id) {
        showToast({
          type: "error",
          title: "Mitarbeiterprofil fehlt",
          description:
            "Deinem Benutzerkonto ist kein Mitarbeiter zugeordnet.",
        });
        return;
      }

      const { data: employeeData, error: employeeError } = await supabase
        .from("employees")
        .select("id, name")
        .eq("id", profile.employee_id)
        .eq("business_id", profile.business_id)
        .single();

      if (employeeError || !employeeData) {
        console.error(employeeError);
        showToast({
          type: "error",
          title: "Mitarbeiter konnte nicht geladen werden",
          description: "Bitte melde dich erneut an.",
        });
        return;
      }

      const business = await getBusiness();

      if (!business) {
        await supabase.auth.signOut();
        window.location.href = "/login";
        return;
      }

      if (business.status === "suspended") {
        window.location.href = "/account-suspended";
        return;
      }

      setEmployee(employeeData as Employee);
      setBusinessId(profile.business_id);

      await loadCorrectionRequests(profile.business_id, profile.employee_id);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadPage();
  }, []);

  async function handleSubmitCorrectionRequest() {
    if (isSubmitting) return;

    if (!employee || !businessId) {
      showToast({
        type: "error",
        title: "Mitarbeiterdaten fehlen",
        description: "Bitte lade die Seite neu und versuche es erneut.",
      });
      return;
    }

    if (!correctionDate) {
      showToast({
        type: "warning",
        title: "Datum fehlt",
        description: "Bitte wähle den betroffenen Arbeitstag aus.",
      });
      return;
    }

    if (!correctionStartTime && !correctionEndTime) {
      showToast({
        type: "warning",
        title: "Uhrzeit fehlt",
        description:
          "Bitte gib mindestens einen Arbeitsbeginn oder ein Arbeitsende an.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("time_correction_requests")
        .insert([
          {
            business_id: businessId,
            employee_id: employee.id,
            employee_name: employee.name,
            correction_date: correctionDate,
            requested_start_time: correctionStartTime || null,
            requested_end_time: correctionEndTime || null,
            reason: correctionReason.trim() || null,
            status: "pending",
          },
        ]);

      if (error) {
        console.error(error);
        showToast({
          type: "error",
          title: "Korrekturantrag konnte nicht gesendet werden",
          description: error.message,
        });
        return;
      }

      setCorrectionDate("");
      setCorrectionStartTime("");
      setCorrectionEndTime("");
      setCorrectionReason("");

      await loadCorrectionRequests(businessId, employee.id);

      showToast({
        type: "success",
        title: "Korrekturantrag gesendet",
        description: "Dein Antrag wurde an die Verwaltung übermittelt.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <PageHeader
        title="Korrekturen"
        description="Beantrage eine Korrektur, wenn eine Stempelung fehlt oder falsch erfasst wurde."
      />

      <Section
        title="Stempelzeit korrigieren"
        description="Gib nur die Uhrzeit an, die ergänzt oder berichtigt werden soll."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Input
            label="Arbeitstag"
            type="date"
            max={getTodayString()}
            value={correctionDate}
            onChange={(event) => setCorrectionDate(event.target.value)}
          />

          <TimeInput
            label="Arbeitsbeginn"
            value={correctionStartTime}
            onChange={setCorrectionStartTime}
            helperText="Optional"
          />

          <TimeInput
            label="Arbeitsende"
            value={correctionEndTime}
            onChange={setCorrectionEndTime}
            helperText="Optional"
          />
        </div>

        <Textarea
          label="Begründung oder Hinweis"
          className="mt-4"
          value={correctionReason}
          onChange={(event) => setCorrectionReason(event.target.value)}
          placeholder="Zum Beispiel: Beim Arbeitsbeginn habe ich das Einstempeln vergessen."
        />

        <div className="mt-5 flex justify-end">
          <Button
            type="button"
            variant="primary"
            loading={isSubmitting}
            onClick={handleSubmitCorrectionRequest}
            fullWidth
            className="sm:w-auto"
          >
            Korrekturantrag senden
          </Button>
        </div>
      </Section>

      <Section
        title="Meine Korrekturanträge"
        description="Hier siehst du den Bearbeitungsstand deiner bisherigen Anträge."
      >
        {requests.length > 0 ? (
          <div className="space-y-3">
            {requests.map((request) => (
              <Card key={request.id} hover>
                <CardBody className="p-4 md:p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#2563EB]">
                          <ClipboardClock className="h-5 w-5" />
                        </div>

                        <div>
                          <p className="font-semibold text-[#0F172A]">
                            {formatDate(request.correction_date)}
                          </p>

                          <p className="mt-1 text-sm text-[#64748B]">
                            Beginn: {formatTime(request.requested_start_time)} · Ende: {formatTime(request.requested_end_time)}
                          </p>
                        </div>
                      </div>

                      {request.reason && (
                        <p className="mt-4 rounded-2xl bg-[#F8FAFC] px-4 py-3 text-sm leading-6 text-[#64748B]">
                          {request.reason}
                        </p>
                      )}
                    </div>

                    <Badge variant={getStatusVariant(request.status)} dot>
                      {formatStatus(request.status)}
                    </Badge>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Noch keine Korrekturanträge"
            description="Sobald du einen Antrag sendest, erscheint er hier mit seinem aktuellen Status."
            compact
          />
        )}
      </Section>
    </div>
  );
}
