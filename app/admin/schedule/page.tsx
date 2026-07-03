"use client";

import { DragEvent, useEffect, useState } from "react";
import DiperaPopup from "@/components/DiperaPopup";
import { supabase } from "@/lib/supabaseClient";
import { getBusinessId } from "@/lib/getBusinessId";
import PageHeader from "@/components/ui/PageHeader";
import PageActions from "@/components/ui/PageActions";
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
  note?: string;
};

type Shift = {
  id: string;
  employee_id: string;
  employee_name: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  work_type_id?: string;
  work_type_name?: string;
  is_published: boolean;
};

type Absence = {
  id: string;
  employee_id: string;
  type: string;
  start_date: string;
  end_date: string;
  request_status: string;
};

type ShiftTemplate = {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
};

type WorkType = {
  id: string;
  name: string;
};

type EmployeeNote = {
  employee_id: string;
  note: string;
};

type DragPayload =
  { type: "employee"; employeeId: string } | { type: "shift"; shiftId: string };

function formatDateForDatabase(date: Date) {
  return date.toLocaleDateString("en-CA");
}

function formatDateForDisplay(dateString: string) {
  return new Date(dateString).toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

function getMonday(date: Date) {
  const copiedDate = new Date(date);
  const day = copiedDate.getDay();
  const difference = copiedDate.getDate() - day + (day === 0 ? -6 : 1);

  copiedDate.setDate(difference);
  copiedDate.setHours(0, 0, 0, 0);

  return copiedDate;
}

function addDays(date: Date, days: number) {
  const copiedDate = new Date(date);
  copiedDate.setDate(copiedDate.getDate() + days);
  return copiedDate;
}

function getWeekDays(weekStart: Date) {
  const labels = [
    "Montag",
    "Dienstag",
    "Mittwoch",
    "Donnerstag",
    "Freitag",
    "Samstag",
    "Sonntag",
  ];

  return labels.map((label, index) => {
    const date = addDays(weekStart, index);

    return {
      label,
      date: formatDateForDatabase(date),
      displayDate: formatDateForDisplay(formatDateForDatabase(date)),
    };
  });
}

function formatAbsenceType(type: string) {
  if (type === "vacation") return "Urlaub";
  if (type === "sick") return "Krankheit";
  return type;
}

function isOvernightShift(startTime: string, endTime: string) {
  if (!startTime || !endTime) return false;

  return endTime <= startTime;
}

function formatShiftTime(startTime: string, endTime: string) {
  const startText = startTime.slice(0, 5);
  const endText = endTime.slice(0, 5);

  if (isOvernightShift(startText, endText)) {
    return `${startText} - ${endText} (+1 Tag)`;
  }

  return `${startText} - ${endText}`;
}

function timeToMinutes(time: string) {
  const [hours, minutes] = time.slice(0, 5).split(":").map(Number);
  return hours * 60 + minutes;
}

function getShiftDurationMinutes(startTime: string, endTime: string) {
  let startMinutes = timeToMinutes(startTime);
  let endMinutes = timeToMinutes(endTime);

  if (endMinutes <= startMinutes) {
    endMinutes += 24 * 60;
  }

  return Math.max(endMinutes - startMinutes, 30);
}

function minutesToTime(totalMinutes: number) {
  const normalizedMinutes = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours = Math.floor(normalizedMinutes / 60);
  const minutes = normalizedMinutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function addMinutesToTime(time: string, minutesToAdd: number) {
  return minutesToTime(timeToMinutes(time) + minutesToAdd);
}

export default function SchedulePage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [shiftTemplates, setShiftTemplates] = useState<ShiftTemplate[]>([]);
  const [workTypes, setWorkTypes] = useState<WorkType[]>([]);
  const [draggedPayload, setDraggedPayload] = useState<DragPayload | null>(
    null,
  );
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);
  const [showShiftDialog, setShowShiftDialog] = useState(false);

  const [employeeId, setEmployeeId] = useState("");
  const [date, setDate] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [selectedWorkType, setSelectedWorkType] = useState("");
  const [warning, setWarning] = useState("");
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [selectedWeekStart, setSelectedWeekStart] = useState(
    getMonday(new Date()),
  );

  const [successMessage, setSuccessMessage] = useState("");
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [showConfirmPopup, setShowConfirmPopup] = useState(false);
  const [confirmAction, setConfirmAction] = useState<
    (() => void | Promise<void>) | null
  >(null);
  const [skipOvernightConfirm, setSkipOvernightConfirm] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const [showPopup, setShowPopup] = useState(false);

  function showDiperaPopup(text: string) {
    setPopupMessage(text);
    setShowPopup(true);
  }

  async function loadEmployees() {
    const businessId = await getBusinessId();

    if (!businessId) {
      console.error("Keine Business-ID gefunden.");
      return;
    }

    const { data: employeeData, error: employeeError } = await supabase
      .from("employees")
      .select("id,name,account_status")
      .eq("business_id", businessId)
      .eq("account_status", "active")
      .order("name", { ascending: true });

    if (employeeError) {
      console.error(employeeError);
      return;
    }

    const employeeIds = employeeData?.map((employee) => employee.id) || [];

    const { data: notesData } = await supabase
      .from("employee_notes")
      .select("employee_id,note")
      .in("employee_id", employeeIds);

    const notes = (notesData || []) as EmployeeNote[];

    const employeesWithNotes = (employeeData || []).map((employee) => {
      const latestNote = notes.find((note) => note.employee_id === employee.id);

      return {
        ...employee,
        note: latestNote?.note || "",
      };
    });

    setEmployees(employeesWithNotes as Employee[]);
  }

  async function loadShifts() {
    const businessId = await getBusinessId();

    if (!businessId) {
      console.error("Keine Business-ID gefunden.");
      return;
    }

    const { data, error } = await supabase
      .from("shifts")
      .select("*")
      .eq("business_id", businessId)
      .order("shift_date", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) {
      console.error(error);
      return;
    }

    setShifts(data || []);
  }

  async function loadAbsences() {
    const businessId = await getBusinessId();

    if (!businessId) {
      console.error("Keine Business-ID gefunden.");
      return;
    }

    const { data, error } = await supabase
      .from("absences")
      .select("id, employee_id, type, start_date, end_date, request_status")
      .eq("business_id", businessId)
      .eq("request_status", "approved");

    if (error) {
      console.error(error);
      return;
    }

    setAbsences(data || []);
  }

  async function loadShiftTemplates() {
    const businessId = await getBusinessId();

    if (!businessId) {
      console.error("Keine Business-ID gefunden.");
      return;
    }

    const { data, error } = await supabase
      .from("shift_templates")
      .select("id, name, start_time, end_time")
      .eq("business_id", businessId)
      .order("name", { ascending: true });

    if (error) {
      console.error(error);
      return;
    }

    setShiftTemplates((data || []) as ShiftTemplate[]);
  }

  async function loadWorkTypes() {
    const businessId = await getBusinessId();

    if (!businessId) return;

    const { data, error } = await supabase
      .from("work_types")
      .select("id,name")
      .eq("business_id", businessId)
      .order("name");

    if (error) {
      console.error(error);
      return;
    }

    setWorkTypes((data || []) as WorkType[]);
  }

  useEffect(() => {
    loadEmployees();
    loadShifts();
    loadAbsences();
    loadShiftTemplates();
    loadWorkTypes();
  }, []);

  function resetForm() {
    setEmployeeId("");
    setDate("");
    setSelectedTemplateId("");
    setStart("");
    setEnd("");
    setEditingShiftId(null);
    setSelectedWorkType("");
    setSkipOvernightConfirm(false);
    setWarning("");
    setShowShiftDialog(false);
  }

  function getSelectedEmployee() {
    return employees.find((employee) => employee.id === employeeId);
  }

  function handleSelectTemplate(templateId: string) {
    setSelectedTemplateId(templateId);

    if (!templateId) return;

    const selectedTemplate = shiftTemplates.find(
      (template) => template.id === templateId,
    );

    if (!selectedTemplate) return;

    setStart(selectedTemplate.start_time.slice(0, 5));
    setEnd(selectedTemplate.end_time.slice(0, 5));
  }

  function showSuccess(text: string) {
    setSuccessMessage(text);
    setShowSuccessPopup(true);
  }

  function showInfo(text: string) {
    setSuccessMessage(text);
    setShowSuccessPopup(true);
  }

  function showConfirm(text: string, action: () => void | Promise<void>) {
    setConfirmMessage(text);
    setConfirmAction(() => action);
    setShowConfirmPopup(true);
  }

  async function handleSaveShift(forceOvernight = false) {
    if (!employeeId || !date || !start || !end) {
      showInfo(
        "Bitte Mitarbeiter, Datum, Schichtbeginn und Schichtende ausfüllen.",
      );
      return;
    }

    if (!selectedWorkType) {
      showDiperaPopup(
        "Bitte wähle einen Arbeitstyp aus, bevor du die Schicht speicherst.",
      );
      return;
    }

    if (start === end) {
      showInfo("Beginn und Ende dürfen nicht identisch sein.");
      return;
    }

    const endsOnMidnight = end === "00:00";
    const needsOvernightConfirm = end < start && !endsOnMidnight;

    if (needsOvernightConfirm && !forceOvernight && !skipOvernightConfirm) {
      showConfirm(
        "Das Schichtende liegt vor dem Beginn. Soll diese Schicht als Nachtschicht gespeichert werden?",
        () => {
          void handleSaveShift(true);
        },
      );

      return;
    }

    const businessId = await getBusinessId();

    if (!businessId) {
      showInfo("Keine Business-ID gefunden.");
      return;
    }

    const selectedEmployee = getSelectedEmployee();

    if (!selectedEmployee) return;

    const existingShift = shifts.find(
      (shift) =>
        shift.employee_id === selectedEmployee.id &&
        shift.shift_date === date &&
        shift.start_time.slice(0, 5) === start &&
        shift.end_time.slice(0, 5) === end &&
        shift.id !== editingShiftId,
    );

    if (existingShift) {
      showInfo("Diese Schicht existiert für diesen Mitarbeiter bereits.");
      return;
    }

    const absenceForShift = findAbsenceForShift(selectedEmployee.id, date);

    if (absenceForShift) {
      setWarning(
        `Achtung: ${selectedEmployee.name} ist an diesem Tag als ${formatAbsenceType(
          absenceForShift.type,
        )} eingetragen. Die Schicht wurde trotzdem gespeichert.`,
      );
    } else {
      setWarning("");
    }

    const shiftPayload = {
      employee_id: selectedEmployee.id,
      employee_name: selectedEmployee.name,
      shift_date: date,
      start_time: start,
      end_time: end,
      business_id: businessId,
      work_type_id: selectedWorkType,
      work_type_name:
        workTypes.find((type) => type.id === selectedWorkType)?.name || null,
      is_published: false,
    };

    if (editingShiftId) {
      const { error } = await supabase
        .from("shifts")
        .update(shiftPayload)
        .eq("id", editingShiftId)
        .eq("business_id", businessId);

      if (error) {
        console.error("SHIFT UPDATE ERROR", error);
        showDiperaPopup(
          `Schicht konnte nicht aktualisiert werden. ${error.message ?? ""} Code: ${error.code ?? ""}`,
        );
        return;
      }
    } else {
      const { error } = await supabase.from("shifts").insert([shiftPayload]);

      if (error) {
        console.error("SHIFT INSERT ERROR", error);
        showDiperaPopup(
          `Schicht konnte nicht gespeichert werden. ${error.message ?? ""} Code: ${error.code ?? ""}`,
        );
        return;
      }
    }

    const wasEditing = Boolean(editingShiftId);

    resetForm();
    await loadShifts();

    showSuccess(
      wasEditing
        ? "Die Schicht wurde erfolgreich aktualisiert."
        : "Die Schicht wurde erfolgreich angelegt.",
    );
  }

  function handleEditShift(shift: Shift) {
    setEditingShiftId(shift.id);
    setEmployeeId(shift.employee_id);
    setDate(shift.shift_date);
    setSelectedTemplateId("");
    setStart(shift.start_time.slice(0, 5));
    setEnd(shift.end_time.slice(0, 5));
    setWarning("");
    setSelectedWorkType(shift.work_type_id || "");
    setShowShiftDialog(true);
  }

  async function handleDeleteShift(id: string) {
    const businessId = await getBusinessId();

    if (!businessId) {
      showInfo("Keine Business-ID gefunden.");
      return;
    }

    const { error } = await supabase
      .from("shifts")
      .delete()
      .eq("id", id)
      .eq("business_id", businessId);

    if (error) {
      console.error(error);
      showDiperaPopup("Es ist ein Fehler aufgetreten.");
      return;
    }

    await loadShifts();
    showSuccess("Schicht wurde gelöscht.");
  }

  function findAbsenceForShift(selectedEmployeeId: string, shiftDate: string) {
    return absences.find(
      (absence) =>
        absence.employee_id === selectedEmployeeId &&
        shiftDate >= absence.start_date &&
        shiftDate <= absence.end_date,
    );
  }

  function goToPreviousWeek() {
    setSelectedWeekStart((currentWeekStart) => addDays(currentWeekStart, -7));
  }

  function goToNextWeek() {
    setSelectedWeekStart((currentWeekStart) => addDays(currentWeekStart, 7));
  }

  function goToCurrentWeek() {
    setSelectedWeekStart(getMonday(new Date()));
  }

  async function handleCopyWeekToNext() {
    const businessId = await getBusinessId();

    if (!businessId) {
      showInfo("Keine Business-ID gefunden.");
      return;
    }

    const currentWeekDays = getWeekDays(selectedWeekStart);
    const weekDates = currentWeekDays.map((day) => day.date);
    const shiftsToCopy = shifts.filter((shift) =>
      weekDates.includes(shift.shift_date),
    );

    if (shiftsToCopy.length === 0) {
      showInfo("In dieser Woche gibt es keine Schichten.");
      return;
    }

    const copiedShifts = shiftsToCopy.map((shift) => {
      const oldDate = new Date(shift.shift_date);
      const newDate = addDays(oldDate, 7);

      return {
        employee_id: shift.employee_id,
        employee_name: shift.employee_name,
        shift_date: formatDateForDatabase(newDate),
        start_time: shift.start_time,
        end_time: shift.end_time,
        business_id: businessId,
        work_type_id: shift.work_type_id || null,
        work_type_name: shift.work_type_name || null,
        is_published: false,
      };
    });

    const targetDates = copiedShifts.map((shift) => shift.shift_date);

    const { data: existingShifts, error: existingError } = await supabase
      .from("shifts")
      .select("id")
      .eq("business_id", businessId)
      .in("shift_date", targetDates);

    if (existingError) {
      console.error(existingError);
      return;
    }

    if (existingShifts && existingShifts.length > 0) {
      showInfo(
        "In der Zielwoche existieren bereits Schichten. Kopieren abgebrochen.",
      );
      return;
    }

    showConfirm(
      `${copiedShifts.length} Schichten in nächste Woche kopieren?`,
      async () => {
        const { error } = await supabase.from("shifts").insert(copiedShifts);

        if (error) {
          console.error(error);
          showInfo("Woche konnte nicht kopiert werden.");
          return;
        }

        await loadShifts();
        showSuccess("Woche erfolgreich kopiert.");
      },
    );
  }

  async function handlePublishSelectedWeek() {
    const businessId = await getBusinessId();

    if (!businessId) {
      showInfo("Keine Business-ID gefunden.");
      return;
    }

    const weekDates = getWeekDays(selectedWeekStart).map((day) => day.date);
    const shiftsToPublish = shifts.filter((shift) =>
      weekDates.includes(shift.shift_date),
    );

    if (shiftsToPublish.length === 0) {
      showInfo("In dieser Woche gibt es keine Schichten zum Veröffentlichen.");
      return;
    }

    showConfirm(
      `${shiftsToPublish.length} Schichten dieser Woche veröffentlichen?`,
      async () => {
        const { error } = await supabase
          .from("shifts")
          .update({ is_published: true })
          .eq("business_id", businessId)
          .in("shift_date", weekDates);

        if (error) {
          console.error(error);
          showInfo("Dienstplan konnte nicht veröffentlicht werden.");
          return;
        }

        await loadShifts();
        showSuccess("Dienstplan wurde veröffentlicht.");
      },
    );
  }

  function prefillNewShift(selectedDate: string, selectedEmployeeId = "") {
    setEmployeeId(selectedEmployeeId);
    setDate(selectedDate);
    setSelectedTemplateId("");
    setStart("15:00");
    setEnd("23:00");
    setSelectedWorkType(workTypes.length === 1 ? workTypes[0].id : "");
    setEditingShiftId(null);
    setWarning("");
    setShowShiftDialog(true);
  }

  function handleDragStart(
    event: DragEvent<HTMLElement>,
    payload: DragPayload,
  ) {
    setDraggedPayload(payload);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("application/json", JSON.stringify(payload));
  }

  function readDragPayload(event: DragEvent<HTMLElement>) {
    if (draggedPayload) return draggedPayload;

    const rawPayload = event.dataTransfer.getData("application/json");

    if (!rawPayload) return null;

    try {
      return JSON.parse(rawPayload) as DragPayload;
    } catch {
      return null;
    }
  }

  async function handleDropOnDay(
    event: DragEvent<HTMLDivElement>,
    selectedDate: string,
  ) {
    event.preventDefault();

    const payload = readDragPayload(event);
    setDraggedPayload(null);
    setDragOverDay(null);

    if (!payload) return;

    if (payload.type === "employee") {
      prefillNewShift(selectedDate, payload.employeeId);
      return;
    }

    const shiftToMove = shifts.find((shift) => shift.id === payload.shiftId);

    if (!shiftToMove) return;

    const businessId = await getBusinessId();

    if (!businessId) {
      showInfo("Keine Business-ID gefunden.");
      return;
    }

    const { error } = await supabase
      .from("shifts")
      .update({
        shift_date: selectedDate,
        is_published: false,
      })
      .eq("id", shiftToMove.id)
      .eq("business_id", businessId);

    if (error) {
      console.error(error);
      showDiperaPopup(
        error.message || "Die Schicht konnte nicht verschoben werden.",
      );
      return;
    }

    await loadShifts();
    showSuccess("Schicht wurde verschoben.");
  }

  function getDaySummary(dayDate: string) {
    const dayShifts = shifts.filter((shift) => shift.shift_date === dayDate);
    const totalMinutes = dayShifts.reduce(
      (sum, shift) =>
        sum + getShiftDurationMinutes(shift.start_time, shift.end_time),
      0,
    );

    return {
      count: dayShifts.length,
      hours: Math.round((totalMinutes / 60) * 10) / 10,
    };
  }

  const todayDate = formatDateForDatabase(new Date());
  const todaysShifts = shifts.filter((shift) => shift.shift_date === todayDate);

  const weekDays = getWeekDays(selectedWeekStart);
  const weekStartText = formatDateForDisplay(weekDays[0].date);
  const weekEndText = formatDateForDisplay(weekDays[6].date);
  const weekDates = weekDays.map((day) => day.date);

  const shiftsInSelectedWeek = shifts.filter((shift) =>
    weekDates.includes(shift.shift_date),
  );

  const isSelectedWeekPublished =
    shiftsInSelectedWeek.length > 0 &&
    shiftsInSelectedWeek.every((shift) => shift.is_published);

  const selectedEmployee = getSelectedEmployee();

  const employeeOptions = [
    { value: "", label: "Mitarbeiter auswählen" },
    ...employees.map((employee) => ({
      value: employee.id,
      label: `${employee.name}${employee.note ? ` (${employee.note.slice(0, 40)})` : ""}`,
    })),
  ];

  const workTypeOptions = [
    { value: "", label: "Arbeitstyp auswählen" },
    ...workTypes.map((type) => ({ value: type.id, label: type.name })),
  ];

  const templateOptions = [
    { value: "", label: "Manuell" },
    ...shiftTemplates.map((template) => ({
      value: template.id,
      label: `${template.name} (${formatShiftTime(template.start_time, template.end_time)})`,
    })),
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Schichtplanung"
        description="Plane die Woche mit klaren Tages-Spalten. Ziehe Mitarbeiter auf einen Tag und lege die Details im Dialog fest."
        action={
          <PageActions>
            <Button variant="secondary" onClick={goToPreviousWeek}>
              Vorherige Woche
            </Button>
            <Button variant="secondary" onClick={goToCurrentWeek}>
              Aktuelle Woche
            </Button>
            <Button variant="secondary" onClick={goToNextWeek}>
              Nächste Woche
            </Button>
          </PageActions>
        }
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Mitarbeiter" value={employees.length} />
        <StatCard
          title="Schichten diese Woche"
          value={shiftsInSelectedWeek.length}
        />
        <StatCard title="Schichten heute" value={todaysShifts.length} />
        <StatCard
          title="Status"
          value={isSelectedWeekPublished ? "Live" : "Entwurf"}
          badge={isSelectedWeekPublished ? "Veröffentlicht" : "Entwurf"}
          badgeVariant={isSelectedWeekPublished ? "success" : "warning"}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="order-2 space-y-6 xl:order-1">
          <Section
            title="Mitarbeiter"
            description="Ziehe Mitarbeiter auf den gewünschten Tag. Danach wählst du Uhrzeit und Arbeitstyp im Dialog."
            bodyClassName="max-h-[520px] space-y-3 overflow-y-auto"
          >
            {employees.length > 0 ? (
              employees.map((employee) => (
                <button
                  key={employee.id}
                  type="button"
                  draggable
                  onClick={() => setEmployeeId(employee.id)}
                  onDragStart={(event) =>
                    handleDragStart(event, {
                      type: "employee",
                      employeeId: employee.id,
                    })
                  }
                  onDragEnd={() => {
                    setDraggedPayload(null);
                    setDragOverDay(null);
                  }}
                  className={`w-full cursor-grab rounded-2xl border px-4 py-4 text-left transition active:cursor-grabbing ${
                    employeeId === employee.id
                      ? "border-[#2563EB] bg-[#EFF6FF] shadow-[0_10px_24px_rgba(37,99,235,0.12)]"
                      : "border-[#E5E7EB] bg-white hover:border-[#BFDBFE] hover:bg-[#F8FAFC]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#2563EB] text-sm font-medium text-white">
                      {employee.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[#111827]">
                        {employee.name}
                      </p>
                      <p className="truncate text-xs text-[#6B7280]">
                        {employee.note || "Bereit für die Planung"}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <p className="text-sm text-[#6B7280]">
                Keine aktiven Mitarbeiter gefunden.
              </p>
            )}
          </Section>

          <Section
            title="Planungslogik"
            description="Keine komplizierten Zeit-Slots: Der Tag ist die Arbeitsfläche, die Details kommen in den Dialog."
          >
            <div className="space-y-3 text-sm text-[#6B7280]">
              <p>
                Diese Ansicht ist absichtlich robuster als ein enger
                Zeitkalender. Auch kurze und überlappende Schichten bleiben gut
                bedienbar.
              </p>
              <p>
                Bestehende Schichten kannst du auf andere Tage ziehen oder per
                Klick bearbeiten.
              </p>
            </div>
          </Section>
        </div>

        <Section
          className="order-1 xl:order-2"
          title="Wochenplanung"
          description={`${weekStartText} bis ${weekEndText}`}
          action={
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button variant="secondary" onClick={handleCopyWeekToNext}>
                Woche kopieren
              </Button>
              <Button onClick={handlePublishSelectedWeek}>
                Veröffentlichen
              </Button>
            </div>
          }
          bodyClassName="p-0"
        >
          <div className="border-b border-[#E5E7EB] px-6 py-4">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant={isSelectedWeekPublished ? "success" : "warning"}>
                {isSelectedWeekPublished ? "Veröffentlicht" : "Entwurf"}
              </Badge>
              <span className="text-sm text-[#6B7280]">
                Mitarbeiter auf einen Tag ziehen. Zeiten und Arbeitstyp werden
                danach im Dialog festgelegt.
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="grid min-w-[1540px] grid-cols-7 divide-x divide-[#E5E7EB]">
              {weekDays.map((day) => {
                const dayShifts = shiftsInSelectedWeek
                  .filter((shift) => shift.shift_date === day.date)
                  .sort((first, second) =>
                    first.start_time.localeCompare(second.start_time),
                  );
                const daySummary = getDaySummary(day.date);

                return (
                  <div
                    key={day.date}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                      setDragOverDay(day.date);
                    }}
                    onDragLeave={() => setDragOverDay(null)}
                    onDrop={(event) => handleDropOnDay(event, day.date)}
                    className={`min-h-[500px] bg-white transition ${
                      day.date === todayDate ? "bg-[#EFF6FF]/35" : ""
                    } ${dragOverDay === day.date ? "bg-[#DBEAFE]" : ""}`}
                  >
                    <button
                      type="button"
                      onClick={() => prefillNewShift(day.date)}
                      className="sticky top-0 z-10 w-full border-b border-[#E5E7EB] bg-white/95 px-4 py-4 text-left backdrop-blur transition hover:bg-[#F8FAFC]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-[#111827]">
                            {day.label}
                          </p>
                          <p className="mt-1 text-xs text-[#6B7280]">
                            {day.displayDate}
                          </p>
                        </div>
                        {day.date === todayDate && (
                          <Badge variant="primary">Heute</Badge>
                        )}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant="muted">
                          {daySummary.count} Schichten
                        </Badge>
                        <Badge variant="muted">{daySummary.hours} h</Badge>
                      </div>
                    </button>

                    <div className="space-y-2 px-3 py-4">
                      {dayShifts.map((shift) => {
                        const absenceForShift = findAbsenceForShift(
                          shift.employee_id,
                          shift.shift_date,
                        );

                        return (
                          <div
                            key={shift.id}
                            draggable
                            onDragStart={(event) =>
                              handleDragStart(event, {
                                type: "shift",
                                shiftId: shift.id,
                              })
                            }
                            onDragEnd={() => {
                              setDraggedPayload(null);
                              setDragOverDay(null);
                            }}
                            className="cursor-grab rounded-2xl border border-[#1D4ED8] bg-[#2563EB] p-3 text-white shadow-[0_12px_26px_rgba(37,99,235,0.22)] transition hover:-translate-y-0.5 hover:bg-[#1D4ED8] hover:shadow-[0_16px_34px_rgba(37,99,235,0.26)] active:cursor-grabbing"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-white">
                                  {formatShiftTime(
                                    shift.start_time,
                                    shift.end_time,
                                  )}
                                </p>
                                <p className="mt-1 truncate text-sm font-medium text-white">
                                  {shift.employee_name}
                                </p>
                              </div>
                              {!shift.is_published && (
                                <span className="shrink-0 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-medium text-[#B45309]">
                                  Entwurf
                                </span>
                              )}
                            </div>

                            <div className="mt-2 flex flex-wrap gap-2">
                              {shift.work_type_name && (
                                <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium text-white ring-1 ring-white/20">
                                  {shift.work_type_name}
                                </span>
                              )}
                              {absenceForShift && (
                                <span className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-[#B45309]">
                                  {formatAbsenceType(absenceForShift.type)}
                                </span>
                              )}
                            </div>

                            <div className="mt-3 grid grid-cols-2 gap-2">
                              <Button
                                size="sm"
                                variant="secondary"
                                className="h-8 px-2 text-xs"
                                onClick={() => handleEditShift(shift)}
                              >
                                Bearbeiten
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                className="h-8 px-2 text-xs text-[#EF4444] hover:text-[#DC2626]"
                                onClick={() =>
                                  showConfirm(
                                    "Möchtest du diese Schicht wirklich löschen?",
                                    () => handleDeleteShift(shift.id),
                                  )
                                }
                              >
                                Löschen
                              </Button>
                            </div>
                          </div>
                        );
                      })}

                      <button
                        type="button"
                        onClick={() => prefillNewShift(day.date)}
                        className={`flex min-h-[116px] w-full flex-col items-center justify-center rounded-2xl border border-dashed px-4 py-5 text-center text-sm transition ${
                          dragOverDay === day.date
                            ? "border-[#2563EB] bg-[#EFF6FF] text-[#2563EB]"
                            : "border-[#CBD5E1] bg-[#F8FAFC] text-[#6B7280] hover:border-[#2563EB] hover:bg-[#EFF6FF] hover:text-[#2563EB]"
                        }`}
                      >
                        <span className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-white text-lg font-light shadow-[0_8px_18px_rgba(17,24,39,0.08)]">
                          +
                        </span>
                        <span className="font-medium">Neue Schicht</span>
                        <span className="mt-1 text-xs">
                          Mitarbeiter hier ablegen oder klicken
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Section>
      </div>

      <Section
        title="Heute"
        description="Schneller Überblick über alle heutigen Schichten."
      >
        {todaysShifts.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {todaysShifts.map((shift) => (
              <div
                key={shift.id}
                className="flex flex-col gap-4 rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] px-4 py-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-[#111827]">
                    {shift.employee_name}
                  </p>
                  <p className="mt-1 text-sm text-[#6B7280]">
                    {formatShiftTime(shift.start_time, shift.end_time)}
                  </p>
                  {shift.work_type_name && (
                    <div className="mt-2">
                      <Badge variant="primary">{shift.work_type_name}</Badge>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleEditShift(shift)}
                  >
                    Bearbeiten
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() =>
                      showConfirm(
                        "Möchtest du diese Schicht wirklich löschen?",
                        () => handleDeleteShift(shift.id),
                      )
                    }
                  >
                    Löschen
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#6B7280]">
            Für heute sind keine Schichten eingetragen.
          </p>
        )}
      </Section>

      {showShiftDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111827]/35 p-6 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[28px] border border-[#E5E7EB] bg-white shadow-[0_24px_70px_rgba(17,24,39,0.18)]">
            <div className="border-b border-[#E5E7EB] px-6 py-5">
              <p className="text-sm text-[#2563EB]">
                {editingShiftId ? "Schicht bearbeiten" : "Neue Schicht"}
              </p>
              <h2 className="mt-1 text-2xl font-light tracking-[-0.03em] text-[#111827]">
                {selectedEmployee?.name || "Schicht planen"}
              </h2>
              <p className="mt-1 text-sm text-[#6B7280]">
                Lege Arbeitstyp, Beginn und Ende fest. Erst danach wird die
                Schicht gespeichert.
              </p>
            </div>

            <div className="space-y-5 px-6 py-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Select
                  label="Mitarbeiter"
                  value={employeeId}
                  onChange={(event) => setEmployeeId(event.target.value)}
                  options={employeeOptions}
                />

                <Input
                  label="Datum"
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Select
                  label="Arbeitstyp"
                  value={selectedWorkType}
                  onChange={(event) => setSelectedWorkType(event.target.value)}
                  options={workTypeOptions}
                />

                <Select
                  label="Schichtvorlage"
                  value={selectedTemplateId}
                  onChange={(event) => handleSelectTemplate(event.target.value)}
                  options={templateOptions}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label="Beginn"
                  type="time"
                  value={start}
                  onChange={(event) => setStart(event.target.value)}
                />

                <Input
                  label="Ende"
                  type="time"
                  value={end}
                  onChange={(event) => setEnd(event.target.value)}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {start && end && isOvernightShift(start, end) && (
                  <Badge variant="primary">Endet am Folgetag</Badge>
                )}

                {date &&
                  employeeId &&
                  findAbsenceForShift(employeeId, date) && (
                    <Badge variant="warning">
                      Abwesenheit:{" "}
                      {formatAbsenceType(
                        findAbsenceForShift(employeeId, date)?.type || "",
                      )}
                    </Badge>
                  )}
              </div>

              {warning && (
                <div className="rounded-2xl border border-[#FEF3C7] bg-[#FFFBEB] px-4 py-3 text-sm text-[#92400E]">
                  {warning}
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-[#E5E7EB] px-6 py-5 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" onClick={resetForm}>
                Abbrechen
              </Button>

              <Button type="button" onClick={() => void handleSaveShift()}>
                {editingShiftId ? "Änderungen speichern" : "Schicht speichern"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <DiperaPopup
        open={showSuccessPopup}
        message={successMessage}
        onClose={() => setShowSuccessPopup(false)}
      />

      <DiperaPopup
        open={showConfirmPopup}
        message={confirmMessage}
        onClose={() => {
          setShowConfirmPopup(false);
          setConfirmAction(null);
        }}
        onConfirm={() => {
          void confirmAction?.();
          setShowConfirmPopup(false);
          setConfirmAction(null);
        }}
        confirmText="Bestätigen"
      />

      <DiperaPopup
        open={showPopup}
        message={popupMessage}
        onClose={() => setShowPopup(false)}
      />
    </div>
  );
}
