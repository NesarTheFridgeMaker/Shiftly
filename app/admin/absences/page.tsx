"use client";

import { useEffect, useMemo, useState } from "react";

import { supabase } from "@/lib/supabaseClient";
import { getBusinessId } from "@/lib/getBusinessId";

import DiperaPopup from "@/components/DiperaPopup";
import PageHeader from "@/components/ui/PageHeader";
import Section from "@/components/ui/Section";
import StatCard from "@/components/ui/StatCard";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import EmptyState from "@/components/ui/EmptyState";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/Table";
import { useToast } from "@/components/ui/ToastProvider";

import StatsSkeleton from "@/components/skeletons/StatsSkeleton";
import TableSkeleton from "@/components/skeletons/TableSkeleton";
import FormSkeleton from "@/components/skeletons/FormSkeleton";

type Employee = {
  id: string;
  name: string;
  account_status: string;
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
};

function formatType(type: string) {
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

function getStatusBadgeVariant(status: string) {
  if (status === "pending") return "warning" as const;
  if (status === "approved") return "success" as const;
  if (status === "rejected") return "danger" as const;
  return "muted" as const;
}

function getTypeBadgeVariant(type: string) {
  if (type === "vacation") return "primary" as const;
  if (type === "sick") return "danger" as const;
  return "muted" as const;
}

function formatDate(dateString: string) {
  if (!dateString) return "—";

  return new Date(dateString).toLocaleDateString("de-DE", {
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

function getApprovedVacationDaysForEmployee(
  employeeId: string,
  absences: Absence[],
  workDaysPerWeek: number
) {
  return absences
    .filter(
      (absence) =>
        absence.employee_id === employeeId &&
        absence.type === "vacation" &&
        absence.request_status === "approved"
    )
    .reduce((total, absence) => {
      return (
        total +
        calculateVacationDays(
          absence.start_date,
          absence.end_date,
          workDaysPerWeek
        )
      );
    }, 0);
}

export default function AbsencesPage() {
  const { showToast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);

  const [employeeId, setEmployeeId] = useState("");
  const [type, setType] = useState("vacation");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [absenceToDelete, setAbsenceToDelete] = useState<string | null>(null);

  async function loadEmployees(businessId: string) {
    const { data, error } = await supabase
      .from("employees")
      .select("id,name,account_status,vacation_days_per_year,work_days_per_week")
      .eq("business_id", businessId)
      .eq("account_status", "active")
      .order("name", { ascending: true });

    if (error) {
      console.error(error);
      showToast({
        type: "error",
        title: "Mitarbeiter konnten nicht geladen werden",
        description: error.message,
      });
      return;
    }

    setEmployees(data || []);
  }

  async function loadAbsences(businessId: string) {
    const { data, error } = await supabase
      .from("absences")
      .select("*")
      .eq("business_id", businessId)
      .order("start_date", { ascending: true });

    if (error) {
      console.error(error);
      showToast({
        type: "error",
        title: "Abwesenheiten konnten nicht geladen werden",
        description: error.message,
      });
      return;
    }

    setAbsences(data || []);
  }

  async function loadPageData() {
    setIsLoading(true);

    try {
      const businessId = await getBusinessId();

      if (!businessId) {
        showToast({
          type: "error",
          title: "Betrieb nicht gefunden",
          description: "Die Abwesenheiten konnten nicht geladen werden.",
        });
        return;
      }

      await Promise.all([loadEmployees(businessId), loadAbsences(businessId)]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadPageData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAddAbsence() {
    if (isSaving) return;

    if (!employeeId || !startDate || !endDate) {
      showToast({
        type: "warning",
        title: "Angaben fehlen",
        description: "Bitte wähle Mitarbeiter, Startdatum und Enddatum aus.",
      });
      return;
    }

    if (startDate > endDate) {
      showToast({
        type: "warning",
        title: "Ungültiger Zeitraum",
        description: "Das Startdatum darf nicht nach dem Enddatum liegen.",
      });
      return;
    }

    const businessId = await getBusinessId();

    if (!businessId) {
      showToast({
        type: "error",
        title: "Betrieb nicht gefunden",
        description: "Die Abwesenheit konnte nicht gespeichert werden.",
      });
      return;
    }

    const selectedEmployee = employees.find(
      (employee) => employee.id === employeeId
    );

    if (!selectedEmployee) {
      showToast({
        type: "error",
        title: "Mitarbeiter nicht gefunden",
        description: "Bitte wähle einen gültigen Mitarbeiter aus.",
      });
      return;
    }

    const overlappingAbsence = absences.find(
      (absence) =>
        absence.employee_id === employeeId &&
        absence.request_status !== "rejected" &&
        startDate <= absence.end_date &&
        endDate >= absence.start_date
    );

    if (overlappingAbsence) {
      showToast({
        type: "warning",
        title: "Abwesenheit überschneidet sich",
        description: `Es existiert bereits eine Abwesenheit vom ${formatDate(
          overlappingAbsence.start_date
        )} bis ${formatDate(overlappingAbsence.end_date)}.`,
      });
      return;
    }

    if (type === "vacation") {
      const requestedVacationDays = calculateVacationDays(
        startDate,
        endDate,
        selectedEmployee.work_days_per_week ?? 5
      );

      const approvedVacationDays = getApprovedVacationDaysForEmployee(
        selectedEmployee.id,
        absences,
        selectedEmployee.work_days_per_week ?? 5
      );

      const remainingVacationDays =
        (selectedEmployee.vacation_days_per_year ?? 24) - approvedVacationDays;

      if (requestedVacationDays > remainingVacationDays) {
        showToast({
          type: "warning",
          title: "Nicht genügend Urlaubstage",
          description: `${selectedEmployee.name} hat nur noch ${remainingVacationDays} Urlaubstage verfügbar. Diese Abwesenheit umfasst ${requestedVacationDays} Tage.`,
        });
        return;
      }
    }

    setIsSaving(true);

    const { error } = await supabase.from("absences").insert([
      {
        employee_id: selectedEmployee.id,
        employee_name: selectedEmployee.name,
        type,
        start_date: startDate,
        end_date: endDate,
        request_status: "approved",
        business_id: businessId,
      },
    ]);

    setIsSaving(false);

    if (error) {
      console.error("Absence insert error:", error);
      showToast({
        type: "error",
        title: "Abwesenheit konnte nicht gespeichert werden",
        description: error.message,
      });
      return;
    }

    setEmployeeId("");
    setType("vacation");
    setStartDate("");
    setEndDate("");

    await loadAbsences(businessId);

    showToast({
      type: "success",
      title: "Abwesenheit gespeichert",
      description: `${selectedEmployee.name} wurde vom ${formatDate(
        startDate
      )} bis ${formatDate(endDate)} eingetragen.`,
    });
  }

  async function handleUpdateRequestStatus(id: string, newStatus: string) {
    const businessId = await getBusinessId();

    if (!businessId) {
      showToast({
        type: "error",
        title: "Betrieb nicht gefunden",
        description: "Der Antrag konnte nicht aktualisiert werden.",
      });
      return;
    }

    const selectedAbsence = absences.find((absence) => absence.id === id);

    if (!selectedAbsence) {
      showToast({
        type: "error",
        title: "Antrag nicht gefunden",
        description: "Bitte lade die Seite neu und versuche es erneut.",
      });
      return;
    }

    const { error } = await supabase
      .from("absences")
      .update({ request_status: newStatus })
      .eq("id", id)
      .eq("business_id", businessId);

    if (error) {
      console.error("Absence status update error:", error);
      showToast({
        type: "error",
        title: "Antrag konnte nicht aktualisiert werden",
        description: error.message,
      });
      return;
    }

    const statusText = newStatus === "approved" ? "genehmigt" : "abgelehnt";

    const { error: notificationError } = await supabase
      .from("notifications")
      .insert([
        {
          business_id: businessId,
          employee_id: selectedAbsence.employee_id,
          title: "Urlaubsantrag beantwortet",
          message: `Dein Urlaubsantrag vom ${selectedAbsence.start_date} bis ${selectedAbsence.end_date} wurde ${statusText}.`,
          type: "vacation_response",
          is_read: false,
        },
      ]);

    if (notificationError) {
      console.error(notificationError);
      showToast({
        type: "warning",
        title: "Benachrichtigung konnte nicht erstellt werden",
        description: "Der Antrag wurde trotzdem aktualisiert.",
      });
    }

    await loadAbsences(businessId);

    showToast({
      type: "success",
      title:
        newStatus === "approved" ? "Antrag genehmigt" : "Antrag abgelehnt",
      description: `Der Antrag von ${selectedAbsence.employee_name} wurde ${statusText}.`,
    });
  }

  async function handleDeleteAbsence(id: string) {
    const businessId = await getBusinessId();

    if (!businessId) {
      showToast({
        type: "error",
        title: "Betrieb nicht gefunden",
        description: "Die Abwesenheit konnte nicht gelöscht werden.",
      });
      return;
    }

    const absence = absences.find((absence) => absence.id === id);

    const { error } = await supabase
      .from("absences")
      .delete()
      .eq("id", id)
      .eq("business_id", businessId);

    if (error) {
      console.error("Absence delete error:", error);
      showToast({
        type: "error",
        title: "Abwesenheit konnte nicht gelöscht werden",
        description: error.message,
      });
      return;
    }

    await loadAbsences(businessId);

    showToast({
      type: "success",
      title: "Abwesenheit gelöscht",
      description: absence
        ? `${absence.employee_name}: ${formatDate(absence.start_date)} bis ${formatDate(absence.end_date)} wurde entfernt.`
        : "Die Abwesenheit wurde entfernt.",
    });
  }

  const pendingAbsences = absences.filter(
    (absence) => absence.request_status === "pending"
  );

  const approvedAbsences = absences.filter(
    (absence) => absence.request_status === "approved"
  );

  const rejectedAbsences = absences.filter(
    (absence) => absence.request_status === "rejected"
  );

  const sickAbsences = absences.filter((absence) => absence.type === "sick");

  const otherAbsences = absences.filter(
    (absence) => absence.request_status !== "pending"
  );

  const employeeOptions = useMemo(
    () => [
      { value: "", label: "Mitarbeiter auswählen" },
      ...employees.map((employee) => ({
        value: employee.id,
        label: employee.name,
      })),
    ],
    [employees]
  );

  const typeOptions = [
    { value: "vacation", label: "Urlaub" },
    { value: "sick", label: "Krankheit" },
  ];

  if (isLoading) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Abwesenheiten"
          description="Verwalte Urlaub, Krankheit und offene Abwesenheitsanträge."
        />

        <StatsSkeleton />

        <FormSkeleton />

        <Section
          title="Offene Anträge"
          description="Anträge, die noch genehmigt oder abgelehnt werden müssen."
        >
          <TableSkeleton rows={3} columns={5} />
        </Section>

        <Section
          title="Abwesenheitsübersicht"
          description="Alle genehmigten und abgelehnten Abwesenheiten."
        >
          <TableSkeleton rows={6} columns={6} />
        </Section>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Abwesenheiten"
        description="Verwalte Urlaub, Krankheit und offene Abwesenheitsanträge."
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Offene Anträge"
          value={pendingAbsences.length}
          badge="Prüfen"
          badgeVariant="warning"
        />

        <StatCard
          title="Genehmigt"
          value={approvedAbsences.length}
          badge="Aktiv"
          badgeVariant="success"
        />

        <StatCard
          title="Abgelehnt"
          value={rejectedAbsences.length}
          badge="Archiv"
          badgeVariant="muted"
        />

        <StatCard
          title="Krankmeldungen"
          value={sickAbsences.length}
          badge="Info"
          badgeVariant="danger"
        />
      </div>

      <Section
        title="Abwesenheit eintragen"
        description="Trage Urlaub oder Krankheit direkt für einen Mitarbeiter ein."
      >
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
          <Select
            label="Mitarbeiter"
            value={employeeId}
            onChange={(event) => setEmployeeId(event.target.value)}
            options={employeeOptions}
          />

          <Select
            label="Art"
            value={type}
            onChange={(event) => setType(event.target.value)}
            options={typeOptions}
          />

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

        <div className="mt-6 flex justify-end">
          <Button type="button" onClick={handleAddAbsence} loading={isSaving}>
            Abwesenheit speichern
          </Button>
        </div>
      </Section>

      <Section
        title="Offene Anträge"
        description="Anträge, die noch genehmigt oder abgelehnt werden müssen."
      >
        {pendingAbsences.length > 0 ? (
          <>
            <div className="grid grid-cols-1 gap-4 xl:hidden">
              {pendingAbsences.map((absence) => (
                <div
                  key={absence.id}
                  className="rounded-3xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 transition hover:-translate-y-0.5 hover:border-[#CBD5E1] hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-base font-semibold text-[#0F172A]">
                        {absence.employee_name}
                      </p>
                      <p className="mt-1 text-sm text-[#64748B]">
                        {formatDate(absence.start_date)} bis{" "}
                        {formatDate(absence.end_date)}
                      </p>
                    </div>

                    <Badge variant={getTypeBadgeVariant(absence.type)} dot>
                      {formatType(absence.type)}
                    </Badge>
                  </div>

                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <Button
                      type="button"
                      variant="primary"
                      fullWidth
                      onClick={() =>
                        handleUpdateRequestStatus(absence.id, "approved")
                      }
                    >
                      Genehmigen
                    </Button>

                    <Button
                      type="button"
                      variant="danger"
                      fullWidth
                      onClick={() =>
                        handleUpdateRequestStatus(absence.id, "rejected")
                      }
                    >
                      Ablehnen
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden xl:block">
              <Table>
                <TableHead>
                  <tr>
                    <TableHeaderCell>Mitarbeiter</TableHeaderCell>
                    <TableHeaderCell>Art</TableHeaderCell>
                    <TableHeaderCell>Von</TableHeaderCell>
                    <TableHeaderCell>Bis</TableHeaderCell>
                    <TableHeaderCell>Aktionen</TableHeaderCell>
                  </tr>
                </TableHead>

                <TableBody>
                  {pendingAbsences.map((absence) => (
                    <TableRow key={absence.id}>
                      <TableCell>
                        <span className="font-semibold">
                          {absence.employee_name}
                        </span>
                      </TableCell>

                      <TableCell>
                        <Badge variant={getTypeBadgeVariant(absence.type)} dot>
                          {formatType(absence.type)}
                        </Badge>
                      </TableCell>

                      <TableCell>{formatDate(absence.start_date)}</TableCell>

                      <TableCell>{formatDate(absence.end_date)}</TableCell>

                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="primary"
                            onClick={() =>
                              handleUpdateRequestStatus(absence.id, "approved")
                            }
                          >
                            Genehmigen
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            variant="danger"
                            onClick={() =>
                              handleUpdateRequestStatus(absence.id, "rejected")
                            }
                          >
                            Ablehnen
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        ) : (
          <EmptyState
            compact
            title="Keine offenen Anträge"
            description="Sobald Mitarbeiter Urlaub oder Abwesenheiten beantragen, erscheinen sie hier."
          />
        )}
      </Section>

      <Section
        title="Abwesenheitsübersicht"
        description="Alle genehmigten und abgelehnten Abwesenheiten."
      >
        {otherAbsences.length > 0 ? (
          <>
            <div className="grid grid-cols-1 gap-4 xl:hidden">
              {otherAbsences.map((absence) => (
                <div
                  key={absence.id}
                  className="rounded-3xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 transition hover:-translate-y-0.5 hover:border-[#CBD5E1] hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-base font-semibold text-[#0F172A]">
                        {absence.employee_name}
                      </p>
                      <p className="mt-1 text-sm text-[#64748B]">
                        {formatDate(absence.start_date)} bis{" "}
                        {formatDate(absence.end_date)}
                      </p>
                    </div>

                    <Badge variant={getTypeBadgeVariant(absence.type)} dot>
                      {formatType(absence.type)}
                    </Badge>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-white p-3">
                      <p className="text-xs text-[#64748B]">Status</p>
                      <div className="mt-2">
                        <Badge
                          variant={getStatusBadgeVariant(absence.request_status)}
                          dot
                        >
                          {formatRequestStatus(absence.request_status)}
                        </Badge>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-white p-3">
                      <p className="text-xs text-[#64748B]">Zeitraum</p>
                      <p className="mt-2 text-sm font-semibold text-[#0F172A]">
                        {formatDate(absence.start_date)} –{" "}
                        {formatDate(absence.end_date)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <Button
                      type="button"
                      variant="danger"
                      fullWidth
                      onClick={() => setAbsenceToDelete(absence.id)}
                    >
                      Löschen
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden xl:block">
              <Table>
                <TableHead>
                  <tr>
                    <TableHeaderCell>Mitarbeiter</TableHeaderCell>
                    <TableHeaderCell>Art</TableHeaderCell>
                    <TableHeaderCell>Von</TableHeaderCell>
                    <TableHeaderCell>Bis</TableHeaderCell>
                    <TableHeaderCell>Status</TableHeaderCell>
                    <TableHeaderCell>Aktionen</TableHeaderCell>
                  </tr>
                </TableHead>

                <TableBody>
                  {otherAbsences.map((absence) => (
                    <TableRow key={absence.id}>
                      <TableCell>
                        <span className="font-semibold">
                          {absence.employee_name}
                        </span>
                      </TableCell>

                      <TableCell>
                        <Badge variant={getTypeBadgeVariant(absence.type)} dot>
                          {formatType(absence.type)}
                        </Badge>
                      </TableCell>

                      <TableCell>{formatDate(absence.start_date)}</TableCell>

                      <TableCell>{formatDate(absence.end_date)}</TableCell>

                      <TableCell>
                        <Badge
                          variant={getStatusBadgeVariant(absence.request_status)}
                          dot
                        >
                          {formatRequestStatus(absence.request_status)}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <div className="flex justify-end">
                          <Button
                            type="button"
                            size="sm"
                            variant="danger"
                            onClick={() => setAbsenceToDelete(absence.id)}
                          >
                            Löschen
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        ) : (
          <EmptyState
            compact
            title="Noch keine Abwesenheiten"
            description="Genehmigte oder abgelehnte Abwesenheiten erscheinen später in dieser Übersicht."
          />
        )}
      </Section>

      <DiperaPopup
        open={Boolean(absenceToDelete)}
        message="Möchtest du diese Abwesenheit wirklich löschen?"
        onClose={() => setAbsenceToDelete(null)}
        onConfirm={() => {
          if (!absenceToDelete) return;

          handleDeleteAbsence(absenceToDelete);
          setAbsenceToDelete(null);
        }}
        confirmText="Löschen"
        cancelText="Abbrechen"
      />
    </div>
  );
}
