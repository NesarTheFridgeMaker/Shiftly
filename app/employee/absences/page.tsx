"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getBusinessId } from "@/lib/getBusinessId";

import PageHeader from "@/components/ui/PageHeader";
import Section from "@/components/ui/Section";
import StatCard from "@/components/ui/StatCard";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";
import EmptyState from "@/components/ui/EmptyState";
import PageSkeleton from "@/components/skeletons/PageSkeleton";
import { useToast } from "@/components/ui/ToastProvider";

type Employee = {
  id: string;
  name: string;
  vacation_days_per_year: number;
  work_days_per_week: number;
};

type Absence = {
  id: string;
  employee_id: string;
  employee_name: string;
  type: string;
  start_date: string;
  end_date: string;
  request_status: string;
  hidden_by_employee?: boolean;
};

function formatAbsenceType(type: string) {
  if (type === "vacation") return "Urlaub";
  if (type === "sick") return "Krankheit";
  return type;
}

function formatRequestStatus(status: string) {
  if (status === "pending") return "Offen";
  if (status === "approved") return "Genehmigt";
  if (status === "rejected") return "Abgelehnt";
  return status;
}

function getRequestBadgeVariant(status: string) {
  if (status === "approved") return "success";
  if (status === "rejected") return "danger";
  if (status === "pending") return "warning";
  return "muted";
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function calculateVacationDays(
  start: string,
  end: string,
  workDaysPerWeek: number
) {
  const startDate = new Date(start);
  const endDate = new Date(end);

  const totalDays =
    Math.floor(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;

  const weeks = totalDays / 7;

  return Math.round(weeks * workDaysPerWeek);
}

export default function EmployeeAbsencesPage() {
  const { showToast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [employeeId, setEmployeeId] = useState("");
  const [absences, setAbsences] = useState<Absence[]>([]);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  async function loadEmployeeProfile() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      showToast({
        type: "error",
        title: "Nicht angemeldet",
        description: "Bitte melde dich erneut an.",
      });
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("employee_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.employee_id) {
      console.error(profileError);
      showToast({
        type: "error",
        title: "Profil nicht gefunden",
        description: "Dein Mitarbeiterprofil konnte nicht geladen werden.",
      });
      return;
    }

    setEmployeeId(profile.employee_id);

    const { data: employeeData, error: employeeError } = await supabase
      .from("employees")
      .select("id, name, vacation_days_per_year, work_days_per_week")
      .eq("id", profile.employee_id)
      .single();

    if (employeeError || !employeeData) {
      console.error(employeeError);
      showToast({
        type: "error",
        title: "Mitarbeiter nicht gefunden",
        description: "Deine Mitarbeiterdaten konnten nicht geladen werden.",
      });
      return;
    }

    setEmployee(employeeData as Employee);
    await loadAbsences(profile.employee_id);
  }

  async function loadAbsences(selectedEmployeeId: string) {
    const businessId = await getBusinessId();

    if (!businessId) {
      showToast({
        type: "error",
        title: "Betrieb nicht gefunden",
        description: "Abwesenheiten konnten nicht geladen werden.",
      });
      return;
    }

    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const sixtyDaysAgoString = sixtyDaysAgo.toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("absences")
      .select(
        "id, employee_id, employee_name, type, start_date, end_date, request_status, hidden_by_employee"
      )
      .eq("business_id", businessId)
      .eq("employee_id", selectedEmployeeId)
      .eq("hidden_by_employee", false)
      .or(`request_status.eq.pending,start_date.gte.${sixtyDaysAgoString}`)
      .order("start_date", { ascending: false });

    if (error) {
      console.error(error);
      showToast({
        type: "error",
        title: "Abwesenheiten konnten nicht geladen werden",
        description: error.message,
      });
      return;
    }

    setAbsences((data || []) as Absence[]);
  }

  async function handleVacationRequest() {
    if (!employee || !employeeId || !startDate || !endDate) {
      showToast({
        type: "warning",
        title: "Datum fehlt",
        description: "Bitte wähle Von- und Bis-Datum aus.",
      });
      return;
    }

    if (startDate > endDate) {
      showToast({
        type: "warning",
        title: "Ungültiger Zeitraum",
        description: "Das Enddatum darf nicht vor dem Startdatum liegen.",
      });
      return;
    }

    const requestedVacationDays = calculateVacationDays(
      startDate,
      endDate,
      employee.work_days_per_week ?? 5
    );

    if (requestedVacationDays > remainingVacationDays) {
      showToast({
        type: "warning",
        title: "Nicht genug Resturlaub",
        description: `Du hast noch ${remainingVacationDays} Urlaubstage. Der Antrag umfasst ${requestedVacationDays} Tage.`,
      });
      return;
    }

    const businessId = await getBusinessId();

    if (!businessId) {
      showToast({
        type: "error",
        title: "Betrieb nicht gefunden",
        description: "Der Urlaubsantrag konnte nicht gesendet werden.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("absences").insert([
        {
          employee_id: employee.id,
          employee_name: employee.name,
          type: "vacation",
          start_date: startDate,
          end_date: endDate,
          request_status: "pending",
          business_id: businessId,
        },
      ]);

      if (error) {
        console.error(error);
        showToast({
          type: "error",
          title: "Urlaubsantrag konnte nicht gesendet werden",
          description: error.message,
        });
        return;
      }

      const { error: notificationError } = await supabase.rpc(
        "create_admin_notification_for_business",
        {
          p_business_id: businessId,
          p_title: "Neuer Urlaubsantrag",
          p_message: `${employee.name} hat Urlaub vom ${startDate} bis ${endDate} beantragt.`,
          p_type: "vacation_request",
        }
      );

      if (notificationError) {
        console.error(notificationError);
      }

      setStartDate("");
      setEndDate("");

      await loadAbsences(employeeId);

      showToast({
        type: "success",
        title: "Urlaubsantrag gesendet",
        description: "Dein Antrag wurde an die Verwaltung übermittelt.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleHideAbsence(absenceId: string) {
    const { error } = await supabase
      .from("absences")
      .update({ hidden_by_employee: true })
      .eq("id", absenceId);

    if (error) {
      console.error(error);
      showToast({
        type: "error",
        title: "Abwesenheit konnte nicht ausgeblendet werden",
        description: error.message,
      });
      return;
    }

    setAbsences((current) =>
      current.filter((absence) => absence.id !== absenceId)
    );

    showToast({
      type: "success",
      title: "Abwesenheit ausgeblendet",
      description: "Der Eintrag wurde aus deiner Übersicht entfernt.",
    });
  }

  useEffect(() => {
    async function loadPage() {
      setIsLoading(true);
      try {
        await loadEmployeeProfile();
      } finally {
        setIsLoading(false);
      }
    }

    loadPage();
  }, []);

  const approvedVacationDays = useMemo(() => {
    if (!employee) return 0;

    return absences
      .filter(
        (absence) =>
          absence.type === "vacation" && absence.request_status === "approved"
      )
      .reduce((sum, absence) => {
        return (
          sum +
          calculateVacationDays(
            absence.start_date,
            absence.end_date,
            employee.work_days_per_week ?? 5
          )
        );
      }, 0);
  }, [absences, employee]);

  const pendingAbsencesCount = absences.filter(
    (absence) => absence.request_status === "pending"
  ).length;

  const approvedAbsencesCount = absences.filter(
    (absence) => absence.request_status === "approved"
  ).length;

  const rejectedAbsencesCount = absences.filter(
    (absence) => absence.request_status === "rejected"
  ).length;

  const remainingVacationDays =
    (employee?.vacation_days_per_year ?? 24) - approvedVacationDays;

  if (isLoading) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Abwesenheiten"
        description="Beantrage Urlaub und behalte deine Anträge im Blick."
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Urlaub/Jahr"
          value={employee?.vacation_days_per_year ?? 24}
          badge="Anspruch"
          badgeVariant="primary"
        />

        <StatCard
          title="Genehmigt"
          value={approvedVacationDays}
          badge="Tage"
          badgeVariant="success"
        />

        <StatCard
          title="Resturlaub"
          value={remainingVacationDays}
          badge="Verfügbar"
          badgeVariant="primary"
        />

        <StatCard
          title="Offene Anträge"
          value={pendingAbsencesCount}
          badge="Prüfung"
          badgeVariant="warning"
        />
      </div>

      <Section
        title="Urlaub beantragen"
        description="Sende einen neuen Urlaubsantrag an deine Verwaltung."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Von"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
          />

          <Input
            label="Bis"
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
          />
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button
            type="button"
            variant="primary"
            loading={isSubmitting}
            onClick={handleVacationRequest}
          >
            Urlaubsantrag senden
          </Button>
        </div>
      </Section>

      <Section
        title="Meine Anträge"
        description="Offene, genehmigte und abgelehnte Abwesenheiten."
      >
        <div className="mb-5 flex flex-wrap gap-2">
          <Badge variant="warning" dot>
            {pendingAbsencesCount} offen
          </Badge>
          <Badge variant="success" dot>
            {approvedAbsencesCount} genehmigt
          </Badge>
          <Badge variant="danger" dot>
            {rejectedAbsencesCount} abgelehnt
          </Badge>
        </div>

        {absences.length === 0 ? (
          <EmptyState
            title="Keine Abwesenheiten vorhanden"
            description="Sobald du Urlaub beantragst oder eine Abwesenheit erfasst wird, erscheint sie hier."
          />
        ) : (
          <div className="flex flex-col gap-3">
            {absences.map((absence) => (
              <div
                key={absence.id}
                className="rounded-3xl border border-[#E2E8F0] bg-white p-5 transition hover:-translate-y-0.5 hover:border-[#CBD5E1] hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)]"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-[#0F172A]">
                        {formatAbsenceType(absence.type)}
                      </h3>

                      <Badge
                        variant={
                          getRequestBadgeVariant(absence.request_status) as
                            | "default"
                            | "primary"
                            | "success"
                            | "warning"
                            | "danger"
                            | "muted"
                        }
                        dot
                      >
                        {formatRequestStatus(absence.request_status)}
                      </Badge>
                    </div>

                    <p className="mt-2 text-sm leading-6 text-[#64748B]">
                      {formatDate(absence.start_date)} bis{" "}
                      {formatDate(absence.end_date)}
                    </p>
                  </div>

                  {absence.request_status !== "pending" && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => handleHideAbsence(absence.id)}
                    >
                      Ausblenden
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
