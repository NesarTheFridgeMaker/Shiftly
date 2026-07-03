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
      (endDate.getTime() - startDate.getTime()) /
        (1000 * 60 * 60 * 24)
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
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);

  const [employeeId, setEmployeeId] = useState("");
  const [type, setType] = useState("vacation");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const [showPopup, setShowPopup] = useState(false);
  const [absenceToDelete, setAbsenceToDelete] = useState<string | null>(null);

  function showDiperaPopup(message: string) {
    setPopupMessage(message);
    setShowPopup(true);
  }

  async function loadEmployees() {
    const businessId = await getBusinessId();

    if (!businessId) {
      console.error("Keine Business-ID gefunden.");
      return;
    }

    const { data, error } = await supabase
      .from("employees")
      .select("id,name,account_status,vacation_days_per_year,work_days_per_week")
      .eq("business_id", businessId)
      .eq("account_status", "active")
      .order("name", { ascending: true });

    if (error) {
      console.error(error);
      return;
    }

    setEmployees(data || []);
  }

  async function loadAbsences() {
    const businessId = await getBusinessId();

    if (!businessId) {
      console.error("Keine Business-ID gefunden.");
      return;
    }

    const { data, error } = await supabase
      .from("absences")
      .select("*")
      .eq("business_id", businessId)
      .order("start_date", { ascending: true });

    if (error) {
      console.error(error);
      return;
    }

    setAbsences(data || []);
  }

  useEffect(() => {
    loadEmployees();
    loadAbsences();
  }, []);

  async function handleAddAbsence() {
    if (!employeeId || !startDate || !endDate) {
      showDiperaPopup("Bitte Mitarbeiter, Startdatum und Enddatum ausfüllen.");
      return;
    }

    if (startDate > endDate) {
      showDiperaPopup("Das Startdatum darf nicht nach dem Enddatum liegen.");
      return;
    }

    const businessId = await getBusinessId();

    if (!businessId) {
      showDiperaPopup("Keine Business-ID gefunden.");
      return;
    }

    const selectedEmployee = employees.find(
      (employee) => employee.id === employeeId
    );

    if (!selectedEmployee) return;

    const overlappingAbsence = absences.find(
      (absence) =>
        absence.employee_id === employeeId &&
        absence.request_status !== "rejected" &&
        startDate <= absence.end_date &&
        endDate >= absence.start_date
    );

    if (overlappingAbsence) {
      showDiperaPopup(
        `Für diesen Mitarbeiter existiert bereits eine Abwesenheit vom ${formatDate(
          overlappingAbsence.start_date
        )} bis ${formatDate(overlappingAbsence.end_date)}.`
      );

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
        showDiperaPopup(
          `${selectedEmployee.name} hat nur noch ${remainingVacationDays} Urlaubstage verfügbar. Diese Abwesenheit umfasst ${requestedVacationDays} Tage.`
        );
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
      showDiperaPopup(
        `Abwesenheit konnte nicht gespeichert werden. ${error.message ?? ""}`
      );
      return;
    }

    setEmployeeId("");
    setType("vacation");
    setStartDate("");
    setEndDate("");

    loadAbsences();

    showDiperaPopup("Abwesenheit wurde erfolgreich gespeichert.");
  }

  async function handleUpdateRequestStatus(id: string, newStatus: string) {
    const businessId = await getBusinessId();

    if (!businessId) {
      showDiperaPopup("Keine Business-ID gefunden.");
      return;
    }

    const selectedAbsence = absences.find((absence) => absence.id === id);

    if (!selectedAbsence) {
      showDiperaPopup("Antrag wurde nicht gefunden.");
      return;
    }

    const { error } = await supabase
      .from("absences")
      .update({ request_status: newStatus })
      .eq("id", id)
      .eq("business_id", businessId);

    if (error) {
      console.error("Absence status update error:", error);
      showDiperaPopup(
        `Antrag konnte nicht aktualisiert werden. ${error.message ?? ""}`
      );
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
    }

    loadAbsences();

    showDiperaPopup(
      newStatus === "approved"
        ? "Der Antrag wurde genehmigt."
        : "Der Antrag wurde abgelehnt."
    );
  }

  async function handleDeleteAbsence(id: string) {
    const businessId = await getBusinessId();

    if (!businessId) {
      showDiperaPopup("Keine Business-ID gefunden.");
      return;
    }

    const { error } = await supabase
      .from("absences")
      .delete()
      .eq("id", id)
      .eq("business_id", businessId);

    if (error) {
      console.error("Absence delete error:", error);
      showDiperaPopup(
        `Abwesenheit konnte nicht gelöscht werden. ${error.message ?? ""}`
      );
      return;
    }

    loadAbsences();

    showDiperaPopup("Die Abwesenheit wurde gelöscht.");
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
          <Button
            type="button"
            onClick={handleAddAbsence}
            loading={isSaving}
          >
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
                  className="rounded-3xl border border-[#E5E7EB] bg-[#F8FAFC] p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-base font-medium text-[#111827]">
                        {absence.employee_name}
                      </p>
                      <p className="mt-1 text-sm text-[#6B7280]">
                        {formatDate(absence.start_date)} bis {formatDate(absence.end_date)}
                      </p>
                    </div>

                    <Badge variant={getTypeBadgeVariant(absence.type)}>
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

            <div className="hidden overflow-x-auto xl:block">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[#E5E7EB] text-xs font-medium uppercase tracking-[0.08em] text-[#6B7280]">
                    <th className="px-4 py-3">Mitarbeiter</th>
                    <th className="px-4 py-3">Art</th>
                    <th className="px-4 py-3">Von</th>
                    <th className="px-4 py-3">Bis</th>
                    <th className="px-4 py-3 text-right">Aktionen</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#E5E7EB]">
                  {pendingAbsences.map((absence) => (
                    <tr key={absence.id} className="hover:bg-[#F8FAFC]">
                      <td className="px-4 py-4 font-medium text-[#111827]">
                        {absence.employee_name}
                      </td>

                      <td className="px-4 py-4">
                        <Badge variant={getTypeBadgeVariant(absence.type)}>
                          {formatType(absence.type)}
                        </Badge>
                      </td>

                      <td className="px-4 py-4 text-[#6B7280]">
                        {formatDate(absence.start_date)}
                      </td>

                      <td className="px-4 py-4 text-[#6B7280]">
                        {formatDate(absence.end_date)}
                      </td>

                      <td className="px-4 py-4">
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="rounded-3xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-8 text-center">
            <p className="text-sm text-[#6B7280]">
              Keine offenen Anträge vorhanden.
            </p>
          </div>
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
                  className="rounded-3xl border border-[#E5E7EB] bg-[#F8FAFC] p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-base font-medium text-[#111827]">
                        {absence.employee_name}
                      </p>
                      <p className="mt-1 text-sm text-[#6B7280]">
                        {formatDate(absence.start_date)} bis {formatDate(absence.end_date)}
                      </p>
                    </div>

                    <Badge variant={getTypeBadgeVariant(absence.type)}>
                      {formatType(absence.type)}
                    </Badge>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-white p-3">
                      <p className="text-xs text-[#6B7280]">Status</p>
                      <div className="mt-2">
                        <Badge variant={getStatusBadgeVariant(absence.request_status)}>
                          {formatRequestStatus(absence.request_status)}
                        </Badge>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-white p-3">
                      <p className="text-xs text-[#6B7280]">Zeitraum</p>
                      <p className="mt-2 text-sm font-medium text-[#111827]">
                        {formatDate(absence.start_date)} – {formatDate(absence.end_date)}
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

            <div className="hidden overflow-x-auto xl:block">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[#E5E7EB] text-xs font-medium uppercase tracking-[0.08em] text-[#6B7280]">
                    <th className="px-4 py-3">Mitarbeiter</th>
                    <th className="px-4 py-3">Art</th>
                    <th className="px-4 py-3">Von</th>
                    <th className="px-4 py-3">Bis</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Aktionen</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#E5E7EB]">
                  {otherAbsences.map((absence) => (
                    <tr key={absence.id} className="hover:bg-[#F8FAFC]">
                      <td className="px-4 py-4 font-medium text-[#111827]">
                        {absence.employee_name}
                      </td>

                      <td className="px-4 py-4">
                        <Badge variant={getTypeBadgeVariant(absence.type)}>
                          {formatType(absence.type)}
                        </Badge>
                      </td>

                      <td className="px-4 py-4 text-[#6B7280]">
                        {formatDate(absence.start_date)}
                      </td>

                      <td className="px-4 py-4 text-[#6B7280]">
                        {formatDate(absence.end_date)}
                      </td>

                      <td className="px-4 py-4">
                        <Badge variant={getStatusBadgeVariant(absence.request_status)}>
                          {formatRequestStatus(absence.request_status)}
                        </Badge>
                      </td>

                      <td className="px-4 py-4">
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="rounded-3xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-8 text-center">
            <p className="text-sm text-[#6B7280]">
              Noch keine Abwesenheiten vorhanden.
            </p>
          </div>
        )}
      </Section>

      <DiperaPopup
        open={showPopup}
        message={popupMessage}
        onClose={() => setShowPopup(false)}
      />

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
