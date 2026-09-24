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
import { useToast } from "@/components/ui/ToastProvider";
import StatsSkeleton from "@/components/skeletons/StatsSkeleton";
import PageSkeleton from "@/components/skeletons/PageSkeleton";
import TimeInput from "@/components/ui/TimeInput";

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
  planned_break_minutes: number;
  work_type_id?: string;
  work_type_name?: string;
  is_published: boolean;
  absence_conflict_override?: boolean;
  absence_conflict_override_by?: string | null;
  absence_conflict_override_at?: string | null;
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
  planned_break_minutes: number;
};

type WorkType = {
  id: string;
  name: string;
  color?: string | null;
};

type WorkTypeColorStyle = {
  card: string;
  time: string;
  label: string;
  deleteButton: string;
  draftBadge: string;
};

const WORK_TYPE_COLOR_STYLES: Record<string, WorkTypeColorStyle> = {
  blue: {
    card: "border-[#BFDBFE] bg-[#DBEAFE] hover:bg-[#D2E7FD]",
    time: "text-[#0758C9]",
    label: "text-[#1265D6]",
    deleteButton: "bg-[#2563EB]/10 text-[#2563EB] hover:bg-[#2563EB]/20",
    draftBadge: "bg-[#2563EB]/10 text-[#1D4ED8]",
  },
  green: {
    card: "border-[#BBF7D0] bg-[#DCFCE7] hover:bg-[#D2F8DF]",
    time: "text-[#087A45]",
    label: "text-[#0F8A50]",
    deleteButton: "bg-[#16A34A]/10 text-[#15803D] hover:bg-[#16A34A]/20",
    draftBadge: "bg-[#16A34A]/10 text-[#15803D]",
  },
  purple: {
    card: "border-[#DDD6FE] bg-[#EDE9FE] hover:bg-[#E7E1FD]",
    time: "text-[#5B21D1]",
    label: "text-[#6D28D9]",
    deleteButton: "bg-[#7C3AED]/10 text-[#6D28D9] hover:bg-[#7C3AED]/20",
    draftBadge: "bg-[#7C3AED]/10 text-[#6D28D9]",
  },
  amber: {
    card: "border-[#FDE68A] bg-[#FEF3C7] hover:bg-[#FDEEB9]",
    time: "text-[#9A5A00]",
    label: "text-[#B36B00]",
    deleteButton: "bg-[#D97706]/10 text-[#B45309] hover:bg-[#D97706]/20",
    draftBadge: "bg-[#D97706]/10 text-[#B45309]",
  },
  red: {
    card: "border-[#FECACA] bg-[#FEE2E2] hover:bg-[#FDD8D8]",
    time: "text-[#C81E1E]",
    label: "text-[#DC2626]",
    deleteButton: "bg-[#DC2626]/10 text-[#DC2626] hover:bg-[#DC2626]/20",
    draftBadge: "bg-[#DC2626]/10 text-[#DC2626]",
  },
  cyan: {
    card: "border-[#A5F3FC] bg-[#CFFAFE] hover:bg-[#C2F6FB]",
    time: "text-[#0E7490]",
    label: "text-[#0891B2]",
    deleteButton: "bg-[#0891B2]/10 text-[#0E7490] hover:bg-[#0891B2]/20",
    draftBadge: "bg-[#0891B2]/10 text-[#0E7490]",
  },
  pink: {
    card: "border-[#FBCFE8] bg-[#FCE7F3] hover:bg-[#FADDEC]",
    time: "text-[#BE185D]",
    label: "text-[#DB2777]",
    deleteButton: "bg-[#DB2777]/10 text-[#BE185D] hover:bg-[#DB2777]/20",
    draftBadge: "bg-[#DB2777]/10 text-[#BE185D]",
  },
  indigo: {
    card: "border-[#C7D2FE] bg-[#E0E7FF] hover:bg-[#D7DFFD]",
    time: "text-[#4338CA]",
    label: "text-[#4F46E5]",
    deleteButton: "bg-[#4F46E5]/10 text-[#4338CA] hover:bg-[#4F46E5]/20",
    draftBadge: "bg-[#4F46E5]/10 text-[#4338CA]",
  },
};

const DEFAULT_WORK_TYPE_COLOR_STYLE = WORK_TYPE_COLOR_STYLES.blue;

type EmployeeNote = {
  employee_id: string;
  note: string;
};

type DragPayload =
  | { type: "employee"; employeeId: string }
  | { type: "shift"; shiftId: string };

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
  const difference =
    copiedDate.getDate() - day + (day === 0 ? -6 : 1);

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
      displayDate: formatDateForDisplay(
        formatDateForDatabase(date),
      ),
    };
  });
}

function formatAbsenceType(type: string) {
  switch (type) {
    case "vacation":
      return "Urlaub";
    case "sick":
      return "Krankheit";
    case "sick_child":
      return "Kind krank";
    case "work_accident":
      return "Arbeitsunfall";
    case "paid_leave":
      return "Bezahlte Freistellung";
    case "unpaid_leave":
      return "Unbezahlte Freistellung";
    case "other":
      return "Sonstige Abwesenheit";
    default:
      return type;
  }
}

function isOvernightShift(
  startTime: string,
  endTime: string,
) {
  if (!startTime || !endTime) return false;

  return endTime <= startTime;
}

function formatShiftTime(
  startTime: string,
  endTime: string,
) {
  const startText = startTime.slice(0, 5);
  const endText = endTime.slice(0, 5);

  if (isOvernightShift(startText, endText)) {
    return `${startText} - ${endText} (+1 Tag)`;
  }

  return `${startText} - ${endText}`;
}

function timeToMinutes(time: string) {
  const [hours, minutes] = time
    .slice(0, 5)
    .split(":")
    .map(Number);

  return hours * 60 + minutes;
}

function getShiftDurationMinutes(
  startTime: string,
  endTime: string,
) {
  let startMinutes = timeToMinutes(startTime);
  let endMinutes = timeToMinutes(endTime);

  if (endMinutes <= startMinutes) {
    endMinutes += 24 * 60;
  }

  return Math.max(endMinutes - startMinutes, 30);
}

function getPlannedNetMinutes(
  startTime: string,
  endTime: string,
  plannedBreakMinutes: number,
) {
  return Math.max(
    0,
    getShiftDurationMinutes(startTime, endTime) -
      Math.max(0, plannedBreakMinutes || 0),
  );
}

function formatMinutesAsHours(minutes: number) {
  return Math.round((minutes / 60) * 100) / 100;
}

export default function SchedulePage() {
  const { showToast } = useToast();

  const [isLoading, setIsLoading] = useState(true);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [shiftTemplates, setShiftTemplates] =
    useState<ShiftTemplate[]>([]);
  const [workTypes, setWorkTypes] = useState<WorkType[]>([]);

  const [draggedPayload, setDraggedPayload] =
    useState<DragPayload | null>(null);

  const [dragOverDay, setDragOverDay] =
    useState<string | null>(null);

  const [showShiftDialog, setShowShiftDialog] =
    useState(false);

  const [employeeId, setEmployeeId] = useState("");
  const [date, setDate] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] =
    useState("");

  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const [
    plannedBreakMinutes,
    setPlannedBreakMinutes,
  ] = useState("0");

  const [selectedWorkType, setSelectedWorkType] =
    useState("");

  const [warning, setWarning] = useState("");

  const [editingShiftId, setEditingShiftId] =
    useState<string | null>(null);

  const [selectedWeekStart, setSelectedWeekStart] =
    useState(getMonday(new Date()));

  const [confirmMessage, setConfirmMessage] =
    useState("");

  const [showConfirmPopup, setShowConfirmPopup] =
    useState(false);

  const [confirmAction, setConfirmAction] = useState<
    (() => void | Promise<void>) | null
  >(null);

  const [
    skipOvernightConfirm,
    setSkipOvernightConfirm,
  ] = useState(false);

  async function loadEmployees() {
    const businessId = await getBusinessId();

    if (!businessId) {
      console.error("Keine Business-ID gefunden.");
      return;
    }

    const {
      data: employeeData,
      error: employeeError,
    } = await supabase
      .from("employees")
      .select("id,name,account_status")
      .eq("business_id", businessId)
      .eq("account_status", "active")
      .order("name", { ascending: true });

    if (employeeError) {
      console.error(employeeError);
      return;
    }

    const employeeIds =
      employeeData?.map(
        (employee) => employee.id,
      ) || [];

    let notes: EmployeeNote[] = [];

    if (employeeIds.length > 0) {
      const { data: notesData } = await supabase
        .from("employee_notes")
        .select("employee_id,note")
        .in("employee_id", employeeIds);

      notes = (notesData || []) as EmployeeNote[];
    }

    const employeesWithNotes =
      (employeeData || []).map((employee) => {
        const latestNote = notes.find(
          (note) =>
            note.employee_id === employee.id,
        );

        return {
          ...employee,
          note: latestNote?.note || "",
        };
      });

    setEmployees(
      employeesWithNotes as Employee[],
    );
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
      .order("shift_date", {
        ascending: true,
      })
      .order("start_time", {
        ascending: true,
      });

    if (error) {
      console.error(error);
      return;
    }

    const normalizedShifts = (data || []).map(
      (shift) => ({
        ...shift,
        planned_break_minutes:
          shift.planned_break_minutes ?? 0,
      }),
    );

    setShifts(normalizedShifts as Shift[]);
  }

  async function loadAbsences() {
    const businessId = await getBusinessId();

    if (!businessId) {
      console.error("Keine Business-ID gefunden.");
      return;
    }

    const { data, error } = await supabase
      .from("absences")
      .select(
        "id, employee_id, type, start_date, end_date, request_status",
      )
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
  .select(
    "id, name, start_time, end_time, planned_break_minutes",
  )
  .eq("business_id", businessId)
  .order("name", {
    ascending: true,
  });

    if (error) {
      console.error(error);
      return;
    }

    setShiftTemplates(
      (data || []) as ShiftTemplate[],
    );
  }

  async function loadWorkTypes() {
    const businessId = await getBusinessId();

    if (!businessId) return;

    const { data, error } = await supabase
      .from("work_types")
      .select("id,name,color")
      .eq("business_id", businessId)
      .order("name");

    if (error) {
      console.error(error);
      return;
    }

    setWorkTypes(
      (data || []) as WorkType[],
    );
  }

  useEffect(() => {
    async function loadInitialData() {
      setIsLoading(true);

      try {
        await Promise.all([
          loadEmployees(),
          loadShifts(),
          loadAbsences(),
          loadShiftTemplates(),
          loadWorkTypes(),
        ]);
      } finally {
        setIsLoading(false);
      }
    }

    void loadInitialData();
  }, []);

  function resetForm() {
    setEmployeeId("");
    setDate("");
    setSelectedTemplateId("");
    setStart("");
    setEnd("");
    setPlannedBreakMinutes("0");
    setEditingShiftId(null);
    setSelectedWorkType("");
    setSkipOvernightConfirm(false);
    setWarning("");
    setShowShiftDialog(false);
  }

  function getSelectedEmployee() {
    return employees.find(
      (employee) =>
        employee.id === employeeId,
    );
  }

  function handleSelectTemplate(
    templateId: string,
  ) {
    setSelectedTemplateId(templateId);

    if (!templateId) return;

    const selectedTemplate =
      shiftTemplates.find(
        (template) =>
          template.id === templateId,
      );

    if (!selectedTemplate) return;

    setStart(
  selectedTemplate.start_time.slice(0, 5),
);

setEnd(
  selectedTemplate.end_time.slice(0, 5),
);

setPlannedBreakMinutes(
  String(selectedTemplate.planned_break_minutes ?? 0),
);
  }

  function showSuccess(
    title: string,
    description?: string,
  ) {
    showToast({
      type: "success",
      title,
      description,
    });
  }

  function showInfo(
    title: string,
    description?: string,
  ) {
    showToast({
      type: "info",
      title,
      description,
    });
  }

  function showWarning(
    title: string,
    description?: string,
  ) {
    showToast({
      type: "warning",
      title,
      description,
    });
  }

  function showError(
    title: string,
    description?: string,
  ) {
    showToast({
      type: "error",
      title,
      description,
    });
  }

  async function sendPushNotification(
    employeeId: string,
    title: string,
    body: string,
    data: Record<string, string> = {},
  ) {
    try {
      const { data: result, error } =
        await supabase.functions.invoke(
          "send-push",
          {
            body: {
              employeeId,
              title,
              body,
              data,
            },
          },
        );

      console.log("PUSH DATA:", result);
      console.log("PUSH ERROR:", error);

      if (error) {
        console.error(
          "PUSH INVOKE ERROR:",
          error,
        );

        return false;
      }

      if (!result?.success) {
        console.error(
          "PUSH FUNCTION ERROR:",
          result,
        );

        return false;
      }

      return true;
    } catch (error) {
      console.error(
        "PUSH ERROR:",
        error,
      );

      return false;
    }
  }

  function showConfirm(
    text: string,
    action: () => void | Promise<void>,
  ) {
    setConfirmMessage(text);
    setConfirmAction(() => action);
    setShowConfirmPopup(true);
  }

  async function handleSaveShift(
    forceOvernight = false,
    forceAbsence = false,
  ) {
    if (
      !employeeId ||
      !date ||
      !start ||
      !end
    ) {
      showWarning(
        "Angaben fehlen",
        "Bitte Mitarbeiter, Datum, Schichtbeginn und Schichtende ausfüllen.",
      );
      return;
    }

    if (!selectedWorkType) {
      showWarning(
        "Arbeitstyp fehlt",
        "Bitte wähle einen Arbeitstyp aus, bevor du die Schicht speicherst.",
      );
      return;
    }

    if (start === end) {
      showWarning(
        "Ungültige Uhrzeit",
        "Beginn und Ende dürfen nicht identisch sein.",
      );
      return;
    }

    const parsedPlannedBreakMinutes =
      Number(plannedBreakMinutes);

    if (
      !Number.isInteger(
        parsedPlannedBreakMinutes,
      ) ||
      parsedPlannedBreakMinutes < 0
    ) {
      showWarning(
        "Ungültige Pause",
        "Bitte gib die geplante Pause in ganzen Minuten an.",
      );
      return;
    }

    const shiftDurationMinutes =
      getShiftDurationMinutes(
        start,
        end,
      );

    if (
      parsedPlannedBreakMinutes >=
      shiftDurationMinutes
    ) {
      showWarning(
        "Ungültige Pause",
        "Die geplante Pause muss kürzer als die gesamte Schicht sein.",
      );
      return;
    }

    const endsOnMidnight =
      end === "00:00";

    const needsOvernightConfirm =
      end < start && !endsOnMidnight;

    if (
      needsOvernightConfirm &&
      !forceOvernight &&
      !skipOvernightConfirm
    ) {
      showConfirm(
        "Das Schichtende liegt vor dem Beginn. Soll diese Schicht als Nachtschicht gespeichert werden?",
        () => {
          void handleSaveShift(
            true,
            forceAbsence,
          );
        },
      );

      return;
    }

    const businessId =
      await getBusinessId();

    if (!businessId) {
      showError(
        "Betrieb nicht gefunden",
        "Bitte lade die Seite neu und versuche es erneut.",
      );
      return;
    }

    const selectedEmployee =
      getSelectedEmployee();

    if (!selectedEmployee) return;

    const existingShift = shifts.find(
      (shift) =>
        shift.employee_id ===
          selectedEmployee.id &&
        shift.shift_date === date &&
        shift.start_time.slice(0, 5) ===
          start &&
        shift.end_time.slice(0, 5) ===
          end &&
        shift.id !== editingShiftId,
    );

    if (existingShift) {
      showWarning(
        "Doppelte Schicht",
        "Diese Schicht existiert für diesen Mitarbeiter bereits.",
      );
      return;
    }

    const absenceForShift =
      findAbsenceForShift(
        selectedEmployee.id,
        date,
      );

    const editingShift =
      editingShiftId
        ? shifts.find(
            (shift) =>
              shift.id ===
              editingShiftId,
          )
        : null;

    const canReuseExistingAbsenceOverride =
      Boolean(
        absenceForShift &&
          editingShift &&
          editingShift.employee_id ===
            selectedEmployee.id &&
          editingShift.shift_date ===
            date &&
          editingShift.absence_conflict_override,
      );

    if (
      absenceForShift &&
      !forceAbsence &&
      !canReuseExistingAbsenceOverride
    ) {
      showConfirm(
        `${selectedEmployee.name} hat am ${formatDateForDisplay(
          date,
        )} eine genehmigte Abwesenheit (${formatAbsenceType(
          absenceForShift.type,
        )}). Möchtest du die Schicht trotzdem speichern?`,
        () => {
          void handleSaveShift(
            forceOvernight,
            true,
          );
        },
      );

      return;
    }

    setWarning("");

    const shiftPayload = {
      employee_id:
        selectedEmployee.id,

      employee_name:
        selectedEmployee.name,

      shift_date: date,

      start_time: start,

      end_time: end,

      planned_break_minutes:
        parsedPlannedBreakMinutes,

      business_id: businessId,

      work_type_id:
        selectedWorkType,

      work_type_name:
        workTypes.find(
          (type) =>
            type.id === selectedWorkType,
        )?.name || null,

      is_published: false,

      absence_conflict_override:
        Boolean(
          absenceForShift &&
            (
              forceAbsence ||
              canReuseExistingAbsenceOverride
            ),
        ),
    };

    if (editingShiftId) {
      const { error } = await supabase
        .from("shifts")
        .update(shiftPayload)
        .eq("id", editingShiftId)
        .eq("business_id", businessId);

      if (error) {
        console.error(
          "SHIFT UPDATE ERROR",
          error,
        );

        showError(
          "Schicht konnte nicht aktualisiert werden",
          error.message ||
            "Bitte versuche es erneut.",
        );
        return;
      }
    } else {
      const { error } = await supabase
        .from("shifts")
        .insert([shiftPayload]);

      if (error) {
        console.error(
          "SHIFT INSERT ERROR",
          error,
        );

        showError(
          "Schicht konnte nicht gespeichert werden",
          error.message ||
            "Bitte versuche es erneut.",
        );
        return;
      }
    }

    const wasEditing =
      Boolean(editingShiftId);

    resetForm();

    await loadShifts();

    showSuccess(
      wasEditing
        ? "Schicht aktualisiert"
        : "Schicht angelegt",

      absenceForShift
        ? `Die Schicht wurde trotz bestätigter Abwesenheit (${formatAbsenceType(
            absenceForShift.type,
          )}) gespeichert.`
        : wasEditing
          ? "Die Änderungen wurden gespeichert."
          : "Die Schicht wurde dem Wochenplan hinzugefügt.",
    );
  }

  function handleEditShift(
    shift: Shift,
  ) {
    setEditingShiftId(shift.id);

    setEmployeeId(
      shift.employee_id,
    );

    setDate(
      shift.shift_date,
    );

    setSelectedTemplateId("");

    setStart(
      shift.start_time.slice(0, 5),
    );

    setEnd(
      shift.end_time.slice(0, 5),
    );

    setPlannedBreakMinutes(
      String(
        shift.planned_break_minutes ??
          0,
      ),
    );

    setWarning("");

    setSelectedWorkType(
      shift.work_type_id || "",
    );

    setShowShiftDialog(true);
  }

  async function handleDeleteShift(
    id: string,
  ) {
    const businessId =
      await getBusinessId();

    if (!businessId) {
      showError(
        "Betrieb nicht gefunden",
        "Bitte lade die Seite neu und versuche es erneut.",
      );
      return;
    }

    const shiftToDelete =
      shifts.find(
        (shift) => shift.id === id,
      );

    if (!shiftToDelete) {
      showError(
        "Schicht nicht gefunden",
        "Bitte lade die Seite neu und versuche es erneut.",
      );
      return;
    }

    const { error } = await supabase
      .from("shifts")
      .delete()
      .eq("id", id)
      .eq("business_id", businessId);

    if (error) {
      console.error(
        "SHIFT DELETE ERROR:",
        error,
      );

      showError(
        "Schicht konnte nicht gelöscht werden",
        error.message ||
          "Bitte versuche es erneut.",
      );

      return;
    }

    if (
      shiftToDelete.is_published
    ) {
      const pushWasSuccessful =
        await sendPushNotification(
          shiftToDelete.employee_id,
          "Schicht entfernt",
          `Deine Schicht am ${formatDateForDisplay(
            shiftToDelete.shift_date,
          )} von ${formatShiftTime(
            shiftToDelete.start_time,
            shiftToDelete.end_time,
          )} wurde aus dem Dienstplan entfernt.`,
          {
            type: "shift_deleted",
            shiftId:
              shiftToDelete.id,
            shiftDate:
              shiftToDelete.shift_date,
          },
        );

      if (!pushWasSuccessful) {
        console.warn(
          `PUSH: Benachrichtigung über gelöschte Schicht ${shiftToDelete.id} konnte nicht zugestellt werden.`,
        );
      }
    }

    await loadShifts();

    showSuccess(
      "Schicht gelöscht",
      shiftToDelete.is_published
        ? "Die Schicht wurde entfernt und der Mitarbeiter benachrichtigt."
        : "Die Schicht wurde aus dem Entwurf entfernt.",
    );
  }

  function findAbsenceForShift(
    selectedEmployeeId: string,
    shiftDate: string,
  ) {
    return absences.find(
      (absence) =>
        absence.employee_id ===
          selectedEmployeeId &&
        shiftDate >=
          absence.start_date &&
        shiftDate <=
          absence.end_date,
    );
  }

  function goToPreviousWeek() {
    setSelectedWeekStart(
      (currentWeekStart) =>
        addDays(
          currentWeekStart,
          -7,
        ),
    );
  }

  function goToNextWeek() {
    setSelectedWeekStart(
      (currentWeekStart) =>
        addDays(
          currentWeekStart,
          7,
        ),
    );
  }

  function goToCurrentWeek() {
    setSelectedWeekStart(
      getMonday(new Date()),
    );
  }

  async function handleCopyWeekToNext() {
    const businessId =
      await getBusinessId();

    if (!businessId) {
      showError(
        "Betrieb nicht gefunden",
        "Bitte lade die Seite neu und versuche es erneut.",
      );
      return;
    }

    const currentWeekDays =
      getWeekDays(
        selectedWeekStart,
      );

    const weekDates =
      currentWeekDays.map(
        (day) => day.date,
      );

    const shiftsToCopy =
      shifts.filter((shift) =>
        weekDates.includes(
          shift.shift_date,
        ),
      );

    if (
      shiftsToCopy.length === 0
    ) {
      showWarning(
        "Keine Schichten vorhanden",
        "In dieser Woche gibt es keine Schichten zum Kopieren.",
      );
      return;
    }

    const copiedShifts =
      shiftsToCopy.map((shift) => {
        const oldDate =
          new Date(
            shift.shift_date,
          );

        const newDate =
          addDays(
            oldDate,
            7,
          );

        return {
          employee_id:
            shift.employee_id,

          employee_name:
            shift.employee_name,

          shift_date:
            formatDateForDatabase(
              newDate,
            ),

          start_time:
            shift.start_time,

          end_time:
            shift.end_time,

          planned_break_minutes:
            shift.planned_break_minutes ??
            0,

          business_id:
            businessId,

          work_type_id:
            shift.work_type_id ||
            null,

          work_type_name:
            shift.work_type_name ||
            null,

          is_published: false,

          absence_conflict_override:
            false,
        };
      });

    const copiedAbsenceConflicts =
      copiedShifts.filter(
        (shift) =>
          Boolean(
            findAbsenceForShift(
              shift.employee_id,
              shift.shift_date,
            ),
          ),
      );

    const targetDates =
      copiedShifts.map(
        (shift) =>
          shift.shift_date,
      );

    const {
      data: existingShifts,
      error: existingError,
    } = await supabase
      .from("shifts")
      .select("id")
      .eq(
        "business_id",
        businessId,
      )
      .in(
        "shift_date",
        targetDates,
      );

    if (existingError) {
      console.error(
        existingError,
      );
      return;
    }

    if (
      existingShifts &&
      existingShifts.length > 0
    ) {
      showWarning(
        "Zielwoche nicht leer",
        "In der Zielwoche existieren bereits Schichten. Kopieren wurde abgebrochen.",
      );
      return;
    }

    showConfirm(
      copiedAbsenceConflicts.length > 0
        ? `${copiedShifts.length} Schichten in die nächste Woche kopieren? ${copiedAbsenceConflicts.length} Schicht(en) treffen dort auf eine genehmigte Abwesenheit. Diese Konflikte bleiben im Plan sichtbar.`
        : `${copiedShifts.length} Schichten in nächste Woche kopieren?`,
      async () => {
        const { error } =
          await supabase
            .from("shifts")
            .insert(
              copiedShifts,
            );

        if (error) {
          console.error(
            error,
          );

          showError(
            "Woche konnte nicht kopiert werden",
            error.message,
          );
          return;
        }

        await loadShifts();

        showSuccess(
          "Woche kopiert",
          "Die Schichten wurden in die nächste Woche übernommen.",
        );
      },
    );
  }

  async function handlePublishSelectedWeek() {
    const businessId =
      await getBusinessId();

    if (!businessId) {
      showError(
        "Betrieb nicht gefunden",
        "Bitte lade die Seite neu und versuche es erneut.",
      );
      return;
    }

    const weekDates =
      getWeekDays(
        selectedWeekStart,
      ).map(
        (day) => day.date,
      );

    const shiftsToPublish =
      shifts.filter((shift) =>
        weekDates.includes(
          shift.shift_date,
        ),
      );

    if (
      shiftsToPublish.length ===
      0
    ) {
      showWarning(
        "Keine Schichten vorhanden",
        "In dieser Woche gibt es keine Schichten zum Veröffentlichen.",
      );
      return;
    }

    const unpublishedShifts =
      shiftsToPublish.filter(
        (shift) =>
          !shift.is_published,
      );

    if (
      unpublishedShifts.length ===
      0
    ) {
      showInfo(
        "Bereits veröffentlicht",
        "Alle Schichten dieser Woche sind bereits veröffentlicht.",
      );
      return;
    }

    showConfirm(
      `${unpublishedShifts.length} noch nicht veröffentlichte Schichten dieser Woche veröffentlichen?`,
      async () => {
        const { error } =
          await supabase
            .from("shifts")
            .update({
              is_published: true,
            })
            .eq(
              "business_id",
              businessId,
            )
            .in(
              "shift_date",
              weekDates,
            )
            .eq(
              "is_published",
              false,
            );

        if (error) {
          console.error(
            "PUBLISH SCHEDULE ERROR:",
            error,
          );

          showError(
            "Dienstplan konnte nicht veröffentlicht werden",
            error.message,
          );

          return;
        }

        const affectedEmployeeIds = [
          ...new Set(
            unpublishedShifts.map(
              (shift) =>
                shift.employee_id,
            ),
          ),
        ];

        const weekStart =
          weekDates[0];

        const weekEnd =
          weekDates[6];

        let successfulPushes = 0;
        let failedPushes = 0;

        for (
          const affectedEmployeeId
          of affectedEmployeeIds
        ) {
          const pushWasSuccessful =
            await sendPushNotification(
              affectedEmployeeId,

              "Dienstplan aktualisiert",

              `Dein Dienstplan für den Zeitraum ${formatDateForDisplay(
                weekStart,
              )} bis ${formatDateForDisplay(
                weekEnd,
              )} ist jetzt verfügbar.`,

              {
                type:
                  "schedule_published",

                weekStart,

                weekEnd,
              },
            );

          if (
            pushWasSuccessful
          ) {
            successfulPushes++;
          } else {
            failedPushes++;
          }
        }

        await loadShifts();

        showSuccess(
          "Dienstplan veröffentlicht",

          affectedEmployeeIds.length ===
            1
            ? "Der Dienstplan wurde veröffentlicht und der Mitarbeiter benachrichtigt."
            : `Der Dienstplan wurde veröffentlicht. ${successfulPushes} von ${affectedEmployeeIds.length} Mitarbeitern wurden per Push benachrichtigt.`,
        );

        if (
          failedPushes > 0
        ) {
          console.warn(
            `PUSH: ${failedPushes} Benachrichtigung(en) konnten nicht zugestellt werden.`,
          );
        }
      },
    );
  }

  function prefillNewShift(
    selectedDate: string,
    selectedEmployeeId = "",
  ) {
    setEmployeeId(
      selectedEmployeeId,
    );

    setDate(
      selectedDate,
    );

    setSelectedTemplateId("");

    setStart("15:00");

    setEnd("23:00");

    setPlannedBreakMinutes("0");

    setSelectedWorkType(
      workTypes.length === 1
        ? workTypes[0].id
        : "",
    );

    setEditingShiftId(null);

    setWarning("");

    setShowShiftDialog(true);
  }

  function handleDragStart(
    event: DragEvent<HTMLElement>,
    payload: DragPayload,
  ) {
    setDraggedPayload(payload);

    event.dataTransfer.effectAllowed =
      "move";

    event.dataTransfer.setData(
      "application/json",
      JSON.stringify(payload),
    );
  }

  function readDragPayload(
    event: DragEvent<HTMLElement>,
  ) {
    if (draggedPayload) {
      return draggedPayload;
    }

    const rawPayload =
      event.dataTransfer.getData(
        "application/json",
      );

    if (!rawPayload) {
      return null;
    }

    try {
      return JSON.parse(
        rawPayload,
      ) as DragPayload;
    } catch {
      return null;
    }
  }

  async function moveShiftToCell(
    shiftToMove: Shift,
    targetEmployee: Employee,
    selectedDate: string,
    forceAbsence = false,
  ) {
    const businessId =
      await getBusinessId();

    if (!businessId) {
      showError(
        "Betrieb nicht gefunden",
        "Bitte lade die Seite neu und versuche es erneut.",
      );
      return;
    }

    const absenceForTarget =
      findAbsenceForShift(
        targetEmployee.id,
        selectedDate,
      );

    if (
      absenceForTarget &&
      !forceAbsence
    ) {
      showConfirm(
        `${targetEmployee.name} hat am ${formatDateForDisplay(
          selectedDate,
        )} eine genehmigte Abwesenheit (${formatAbsenceType(
          absenceForTarget.type,
        )}). Möchtest du die Schicht trotzdem dorthin verschieben?`,
        () => {
          void moveShiftToCell(
            shiftToMove,
            targetEmployee,
            selectedDate,
            true,
          );
        },
      );

      return;
    }

    const { error } =
      await supabase
        .from("shifts")
        .update({
          employee_id:
            targetEmployee.id,
          employee_name:
            targetEmployee.name,
          shift_date:
            selectedDate,
          is_published:
            false,
          absence_conflict_override:
            Boolean(
              absenceForTarget &&
                forceAbsence,
            ),
        })
        .eq(
          "id",
          shiftToMove.id,
        )
        .eq(
          "business_id",
          businessId,
        );

    if (error) {
      console.error(error);

      showError(
        "Schicht konnte nicht verschoben werden",
        error.message ||
          "Bitte versuche es erneut.",
      );

      return;
    }

    await loadShifts();

    showSuccess(
      "Schicht verschoben",
      absenceForTarget
        ? `Die Schicht wurde trotz bestätigter Abwesenheit (${formatAbsenceType(
            absenceForTarget.type,
          )}) verschoben.`
        : "Die Schicht wurde auf den neuen Mitarbeiter bzw. Tag gesetzt.",
    );
  }

  async function handleDropOnScheduleCell(
    event: DragEvent<HTMLDivElement>,
    targetEmployee: Employee,
    selectedDate: string,
  ) {
    event.preventDefault();

    const payload =
      readDragPayload(event);

    setDraggedPayload(null);
    setDragOverDay(null);

    if (!payload) return;

    if (
      payload.type === "employee"
    ) {
      prefillNewShift(
        selectedDate,
        targetEmployee.id,
      );

      return;
    }

    const shiftToMove =
      shifts.find(
        (shift) =>
          shift.id ===
          payload.shiftId,
      );

    if (!shiftToMove) return;

    if (
      shiftToMove.employee_id ===
        targetEmployee.id &&
      shiftToMove.shift_date ===
        selectedDate
    ) {
      return;
    }

    await moveShiftToCell(
      shiftToMove,
      targetEmployee,
      selectedDate,
    );
  }

  function getDaySummary(
    dayDate: string,
  ) {
    const dayShifts =
      shifts.filter(
        (shift) =>
          shift.shift_date ===
          dayDate,
      );

    const totalMinutes =
      dayShifts.reduce(
        (sum, shift) =>
          sum +
          getPlannedNetMinutes(
            shift.start_time,
            shift.end_time,
            shift.planned_break_minutes ??
              0,
          ),
        0,
      );

    return {
      count: dayShifts.length,

      hours:
        Math.round(
          (totalMinutes / 60) * 10,
        ) / 10,
    };
  }

  const todayDate =
    formatDateForDatabase(
      new Date(),
    );

  const todaysShifts =
    shifts.filter(
      (shift) =>
        shift.shift_date ===
        todayDate,
    );

  const weekDays =
    getWeekDays(
      selectedWeekStart,
    );

  const weekStartText =
    formatDateForDisplay(
      weekDays[0].date,
    );

  const weekEndText =
    formatDateForDisplay(
      weekDays[6].date,
    );

  const weekDates =
    weekDays.map(
      (day) => day.date,
    );

  const shiftsInSelectedWeek =
    shifts.filter((shift) =>
      weekDates.includes(
        shift.shift_date,
      ),
    );

  const isSelectedWeekPublished =
    shiftsInSelectedWeek.length > 0 &&
    shiftsInSelectedWeek.every(
      (shift) =>
        shift.is_published,
    );

  const selectedEmployee =
    getSelectedEmployee();

  const employeeOptions = [
    {
      value: "",
      label:
        "Mitarbeiter auswählen",
    },

    ...employees.map(
      (employee) => ({
        value: employee.id,

        label: `${employee.name}${
          employee.note
            ? ` (${employee.note.slice(
                0,
                40,
              )})`
            : ""
        }`,
      }),
    ),
  ];

  const workTypeOptions = [
    {
      value: "",
      label:
        "Arbeitstyp auswählen",
    },

    ...workTypes.map(
      (type) => ({
        value: type.id,
        label: type.name,
      }),
    ),
  ];

  const templateOptions = [
    {
      value: "",
      label: "Manuell",
    },

    ...shiftTemplates.map(
      (template) => ({
        value: template.id,

        label: `${template.name} (${formatShiftTime(
        template.start_time,
        template.end_time,
      )}${
        template.planned_break_minutes > 0
          ? ` · ${template.planned_break_minutes} Min. Pause`
          : ""
      })`,
      }),
    ),
  ];

  const currentGrossMinutes =
    start && end
      ? getShiftDurationMinutes(
          start,
          end,
        )
      : 0;

  const currentBreakMinutes =
    Number.isFinite(
      Number(plannedBreakMinutes),
    )
      ? Math.max(
          0,
          Number(
            plannedBreakMinutes,
          ),
        )
      : 0;

  const currentNetMinutes =
    Math.max(
      0,
      currentGrossMinutes -
        currentBreakMinutes,
    );

  if (isLoading) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Schichtplanung"
          description="Plane alle Mitarbeiter und Wochentage in einer kompakten Wochenmatrix. Klicke in eine Zelle oder verschiebe bestehende Schichten per Drag & Drop."
        />

        <StatsSkeleton />

        <PageSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Schichtplanung"
        description="Plane alle Mitarbeiter und Wochentage in einer kompakten Wochenmatrix. Klicke in eine Zelle oder verschiebe bestehende Schichten per Drag & Drop."
      />

      <div className="rounded-3xl border border-[#D7DEE8] bg-[#EEF2F6] p-4 shadow-[0_6px_18px_rgba(15,23,42,0.08)] md:p-5">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Mitarbeiter"
            value={employees.length}
          />

          <StatCard
            title="Schichten diese Woche"
            value={
              shiftsInSelectedWeek.length
            }
          />

          <StatCard
            title="Schichten heute"
            value={
              todaysShifts.length
            }
          />

          <StatCard
            title="Status"
            value={
              isSelectedWeekPublished
                ? "Live"
                : "Entwurf"
            }
            badge={
              isSelectedWeekPublished
                ? "Veröffentlicht"
                : "Entwurf"
            }
            badgeVariant={
              isSelectedWeekPublished
                ? "success"
                : "warning"
            }
          />
        </div>
      </div>

      <Section
        title="Wochenplanung"
        description={`${weekStartText} bis ${weekEndText} · Eine Zeile pro Mitarbeiter, eine Spalte pro Wochentag.`}
        action={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={goToPreviousWeek}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-[#CBD5E1] bg-white px-3 text-xs font-semibold text-[#334155] shadow-[0_3px_9px_rgba(15,23,42,0.09)] transition hover:bg-[#EEF2F6] hover:shadow-[0_5px_12px_rgba(15,23,42,0.12)]"
            >
              ← Vorherige
            </button>

            <button
              type="button"
              onClick={goToCurrentWeek}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-[#CBD5E1] bg-white px-3 text-xs font-semibold text-[#334155] shadow-[0_3px_9px_rgba(15,23,42,0.09)] transition hover:bg-[#EEF2F6] hover:shadow-[0_5px_12px_rgba(15,23,42,0.12)]"
            >
              Aktuelle Woche
            </button>

            <button
              type="button"
              onClick={goToNextWeek}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-[#CBD5E1] bg-white px-3 text-xs font-semibold text-[#334155] shadow-[0_3px_9px_rgba(15,23,42,0.09)] transition hover:bg-[#EEF2F6] hover:shadow-[0_5px_12px_rgba(15,23,42,0.12)]"
            >
              Nächste →
            </button>

            <div className="mx-1 hidden h-6 w-px bg-[#D7DEE8] xl:block" />

            <button
              type="button"
              onClick={handleCopyWeekToNext}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-[#CBD5E1] bg-white px-3 text-xs font-semibold text-[#334155] shadow-[0_3px_9px_rgba(15,23,42,0.09)] transition hover:bg-[#EEF2F6] hover:shadow-[0_5px_12px_rgba(15,23,42,0.12)]"
            >
              Woche kopieren
            </button>

            <button
              type="button"
              onClick={handlePublishSelectedWeek}
              className="inline-flex h-9 items-center justify-center rounded-lg bg-[#2563EB] px-3.5 text-xs font-semibold text-white shadow-[0_6px_14px_rgba(37,99,235,0.24)] transition hover:bg-[#1D4ED8] hover:shadow-[0_8px_18px_rgba(37,99,235,0.28)]"
            >
              Veröffentlichen
            </button>
          </div>
        }
        bodyClassName="p-0"
      >
        <div className="border-b border-[#CBD5E1] bg-[#E9EEF4] px-5 py-3 shadow-[0_3px_10px_rgba(15,23,42,0.05)]">
          <div className="flex flex-wrap items-center gap-3">
            <Badge
              variant={
                isSelectedWeekPublished
                  ? "success"
                  : "warning"
              }
            >
              {isSelectedWeekPublished
                ? "Veröffentlicht"
                : "Entwurf"}
            </Badge>

            <span className="text-sm text-[#64748B]">
              Klicke in eine Zelle, um eine Schicht anzulegen.
              Bestehende Schichten kannst du per Drag & Drop auf
              einen anderen Mitarbeiter oder Wochentag verschieben.
            </span>
          </div>
        </div>

        <div className="max-h-[72vh] overflow-y-auto">
          <div className="sticky top-0 z-30 grid grid-cols-[minmax(190px,1.35fr)_repeat(7,minmax(0,1fr))] border-b border-[#CBD5E1] bg-[#EEF2F6] shadow-[0_4px_12px_rgba(15,23,42,0.10)]">
            <div className="flex min-h-[82px] items-center border-r border-[#CBD5E1] px-4">
              <div>
                <p className="text-sm font-semibold text-[#0F172A]">
                  Mitarbeiter
                </p>
                <p className="mt-1 text-xs text-[#64748B]">
                  {employees.length} aktiv
                </p>
              </div>
            </div>

            {weekDays.map(
              (day) => {
                const daySummary =
                  getDaySummary(
                    day.date,
                  );

                return (
                  <div
                    key={
                      day.date
                    }
                    className={`min-w-0 border-r border-[#CBD5E1] px-2 py-3 text-center last:border-r-0 ${
                      day.date ===
                      todayDate
                        ? "bg-[#DBEAFE]"
                        : ""
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <p className="truncate text-sm font-semibold text-[#0F172A]">
                        {
                          day.label
                        }
                      </p>

                      {day.date ===
                        todayDate && (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-[#2563EB]" />
                      )}
                    </div>

                    <p className="mt-1 text-[11px] text-[#64748B]">
                      {
                        day.displayDate
                      }
                    </p>

                    <p className="mt-1 truncate text-[10px] font-medium text-[#475569]">
                      {
                        daySummary.count
                      }{" "}
                      Schicht
                      {daySummary.count ===
                      1
                        ? ""
                        : "en"}{" "}
                      ·{" "}
                      {
                        daySummary.hours
                      }{" "}
                      h
                    </p>
                  </div>
                );
              },
            )}
          </div>

          {employees.length > 0 ? (
            employees.map(
              (employee) => (
                <div
                  key={
                    employee.id
                  }
                  className="grid grid-cols-[minmax(190px,1.35fr)_repeat(7,minmax(0,1fr))] border-b border-[#DCE3EC] last:border-b-0"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setEmployeeId(
                        employee.id,
                      )
                    }
                    className={`min-w-0 border-r border-[#CBD5E1] px-3 py-2 text-left transition ${
                      employeeId ===
                      employee.id
                        ? "bg-[#E8F2FB]"
                        : "bg-[#F8FAFC] hover:bg-[#EEF2F6]"
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#2563EB] text-[11px] font-semibold text-white shadow-[0_4px_10px_rgba(37,99,235,0.18)]">
                        {employee.name
                          .slice(
                            0,
                            1,
                          )
                          .toUpperCase()}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#0F172A]">
                          {
                            employee.name
                          }
                        </p>

                        <p className="mt-0.5 truncate text-[11px] text-[#64748B]">
                          {employee.note ||
                            "Bereit für die Planung"}
                        </p>
                      </div>
                    </div>
                  </button>

                  {weekDays.map(
                    (day) => {
                      const cellKey =
                        `${employee.id}:${day.date}`;

                      const cellShifts =
                        shiftsInSelectedWeek
                          .filter(
                            (shift) =>
                              shift.employee_id ===
                                employee.id &&
                              shift.shift_date ===
                                day.date,
                          )
                          .sort(
                            (
                              first,
                              second,
                            ) =>
                              first.start_time.localeCompare(
                                second.start_time,
                              ),
                          );

                      const absenceForCell =
                        findAbsenceForShift(
                          employee.id,
                          day.date,
                        );

                      return (
                        <div
                          key={
                            cellKey
                          }
                          onDragOver={(
                            event,
                          ) => {
                            event.preventDefault();

                            event.dataTransfer.dropEffect =
                              "move";

                            setDragOverDay(
                              cellKey,
                            );
                          }}
                          onDragLeave={() =>
                            setDragOverDay(
                              null,
                            )
                          }
                          onDrop={(
                            event,
                          ) =>
                            handleDropOnScheduleCell(
                              event,
                              employee,
                              day.date,
                            )
                          }
                          className={`group relative min-h-[66px] min-w-0 border-r border-[#CBD5E1] p-1 last:border-r-0 transition ${
                            day.date ===
                            todayDate
                              ? "bg-[#EAF2FF]"
                              : "bg-[#F8FAFC]"
                          } ${
                            absenceForCell
                              ? "bg-[#FFF8E8]"
                              : ""
                          } ${
                            dragOverDay ===
                            cellKey
                              ? "bg-[#DBEAFE] ring-2 ring-inset ring-[#60A5FA]"
                              : ""
                          }`}
                        >
                          <button
                            type="button"
                            aria-label={`Schicht für ${employee.name} am ${day.displayDate} anlegen`}
                            onClick={() =>
                              prefillNewShift(
                                day.date,
                                employee.id,
                              )
                            }
                            className="absolute inset-0 z-0 cursor-pointer"
                          />

                          <div className="pointer-events-none relative z-10">
                            {absenceForCell && (
                              <div className="mb-1.5">
                                <span className="inline-flex max-w-full items-center gap-1 rounded-md border border-[#F6D58B] bg-[#FFF3CD] px-1.5 py-1 text-[10px] font-semibold text-[#92400E]">
                                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#F59E0B]" />
                                  <span className="truncate">
                                    {formatAbsenceType(
                                      absenceForCell.type,
                                    )}
                                  </span>
                                </span>
                              </div>
                            )}

                            <div className="space-y-1.5">
                              {cellShifts.map(
                                (shift) => {
                                  const workType = workTypes.find(
                                    (type) => type.id === shift.work_type_id,
                                  );

                                  const colorStyle =
                                    WORK_TYPE_COLOR_STYLES[workType?.color || ""] ??
                                    DEFAULT_WORK_TYPE_COLOR_STYLE;

                                  return (
                                    <div
                                      key={
                                        shift.id
                                      }
                                      draggable
                                      onDragStart={(
                                        event,
                                      ) => {
                                        event.stopPropagation();

                                        handleDragStart(
                                          event,
                                          {
                                            type:
                                              "shift",
                                            shiftId:
                                              shift.id,
                                          },
                                        );
                                      }}
                                      onDragEnd={() => {
                                        setDraggedPayload(
                                          null,
                                        );

                                        setDragOverDay(
                                          null,
                                        );
                                      }}
                                      onClick={(
                                        event,
                                      ) => {
                                        event.stopPropagation();

                                        handleEditShift(
                                          shift,
                                        );
                                      }}
                                      className={`pointer-events-auto relative cursor-grab rounded-md border px-2 py-1 shadow-[0_2px_6px_rgba(15,23,42,0.08)] transition hover:-translate-y-px hover:shadow-[0_4px_10px_rgba(15,23,42,0.11)] active:cursor-grabbing ${colorStyle.card}`}
                                    >
                                      <button
                                        type="button"
                                        title="Schicht löschen"
                                        onClick={(
                                          event,
                                        ) => {
                                          event.stopPropagation();

                                          showConfirm(
                                            "Möchtest du diese Schicht wirklich löschen?",
                                            () =>
                                              handleDeleteShift(
                                                shift.id,
                                              ),
                                          );
                                        }}
                                        className={`absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full text-[11px] leading-none transition ${colorStyle.deleteButton}`}
                                      >
                                        ×
                                      </button>

                                      <p className={`truncate pr-4 text-[11px] font-bold leading-4 ${colorStyle.time}`}>
                                        {shift.start_time.slice(
                                          0,
                                          5,
                                        )}
                                        {" – "}
                                        {shift.end_time.slice(
                                          0,
                                          5,
                                        )}
                                      </p>

                                      {shift.work_type_name && (
                                        <p className={`truncate text-[10px] font-medium leading-3 ${colorStyle.label}`}>
                                          {
                                            shift.work_type_name
                                          }
                                        </p>
                                      )}

                                      {!shift.is_published && (
                                        <span
                                          className={`absolute bottom-1 right-1 rounded px-1 py-0.5 text-[8px] font-semibold leading-none ${colorStyle.draftBadge}`}
                                        >
                                          Entwurf
                                        </span>
                                      )}
                                    </div>
                                  );
                                },
                              )}
                            </div>
                          </div>

                          {cellShifts.length ===
                            0 &&
                            !absenceForCell && (
                            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center opacity-0 transition group-hover:opacity-100">
                              <span className="rounded-lg border border-dashed border-[#93C5FD] bg-[#EFF6FF] px-2 py-1 text-[10px] font-medium text-[#2563EB]">
                                + Schicht
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    },
                  )}
                </div>
              ),
            )
          ) : (
            <div className="px-6 py-12 text-center">
              <p className="text-sm font-medium text-[#475569]">
                Keine aktiven Mitarbeiter gefunden.
              </p>
            </div>
          )}
        </div>

        <div className="border-t border-[#CBD5E1] bg-[#E9EEF4] px-5 py-3 text-xs text-[#64748B]">
          Genehmigte Abwesenheiten werden direkt in der Matrix markiert.
          Beim Anlegen oder Verschieben einer Schicht auf einen solchen Tag
          verlangt Dipera eine ausdrückliche Bestätigung.
        </div>
      </Section>

      <Section
        title="Heute"
        description="Schneller Überblick über alle heutigen Schichten."
      >
        {todaysShifts.length >
        0 ? (
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {todaysShifts.map(
              (shift) => {
                const netMinutes =
                  getPlannedNetMinutes(
                    shift.start_time,
                    shift.end_time,
                    shift.planned_break_minutes ??
                      0,
                  );

                return (
                  <div
                    key={
                      shift.id
                    }
                    className="flex flex-col gap-4 rounded-2xl border border-[#CBD5E1] bg-[#EEF2F6] px-4 py-4 shadow-[0_6px_16px_rgba(15,23,42,0.08)] transition hover:shadow-[0_9px_22px_rgba(15,23,42,0.11)] md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium text-[#0F172A]">
                        {
                          shift.employee_name
                        }
                      </p>

                      <p className="mt-1 text-sm text-[#64748B]">
                        {formatShiftTime(
                          shift.start_time,
                          shift.end_time,
                        )}
                      </p>

                      <p className="mt-1 text-xs text-[#64748B]">
                        Geplant
                        netto:{" "}
                        {formatMinutesAsHours(
                          netMinutes,
                        )}{" "}
                        Std.
                        {shift.planned_break_minutes >
                          0 &&
                          ` · Pause ${shift.planned_break_minutes} Min.`}
                      </p>

                      {shift.work_type_name && (
                        <div className="mt-2">
                          <Badge variant="primary">
                            {
                              shift.work_type_name
                            }
                          </Badge>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          handleEditShift(
                            shift,
                          )
                        }
                      >
                        Bearbeiten
                      </Button>

                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() =>
                          showConfirm(
                            "Möchtest du diese Schicht wirklich löschen?",
                            () =>
                              handleDeleteShift(
                                shift.id,
                              ),
                          )
                        }
                      >
                        Löschen
                      </Button>
                    </div>
                  </div>
                );
              },
            )}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-[#B8C4D1] bg-[#EEF2F6] px-6 py-10 text-center shadow-[0_4px_14px_rgba(15,23,42,0.05)]">
            <h3 className="text-lg font-semibold text-[#0F172A]">
              Heute keine
              Schichten
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#64748B]">
              Für heute sind
              keine Einsätze
              geplant. Du kannst
              Mitarbeiter oben in
              der Wochenplanung
              einteilen.
            </p>
          </div>
        )}
      </Section>

      {showShiftDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/45 p-6 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-[28px] border border-[#CBD5E1] bg-white shadow-[0_28px_90px_rgba(15,23,42,0.28)]">
            <div className="border-b border-[#CBD5E1] bg-[#F8FAFC] px-6 py-5">
              <p className="text-sm text-[#2563EB]">
                {editingShiftId
                  ? "Schicht bearbeiten"
                  : "Neue Schicht"}
              </p>

              <h2 className="mt-1 text-2xl font-light tracking-[-0.03em] text-[#0F172A]">
                {selectedEmployee?.name ||
                  "Schicht planen"}
              </h2>

              <p className="mt-1 text-sm text-[#64748B]">
                Lege Arbeitstyp,
                Beginn, Ende und
                geplante Pause fest.
              </p>
            </div>

            <div className="space-y-5 bg-[#EEF2F6] px-6 py-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Select
                  label="Mitarbeiter"
                  value={
                    employeeId
                  }
                  onChange={(
                    event,
                  ) =>
                    setEmployeeId(
                      event.target
                        .value,
                    )
                  }
                  options={
                    employeeOptions
                  }
                />

                <Input
                  label="Datum"
                  type="date"
                  value={date}
                  onChange={(
                    event,
                  ) =>
                    setDate(
                      event.target
                        .value,
                    )
                  }
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Select
                  label="Arbeitstyp"
                  value={
                    selectedWorkType
                  }
                  onChange={(
                    event,
                  ) =>
                    setSelectedWorkType(
                      event.target
                        .value,
                    )
                  }
                  options={
                    workTypeOptions
                  }
                />

                <Select
                  label="Schichtvorlage"
                  value={
                    selectedTemplateId
                  }
                  onChange={(
                    event,
                  ) =>
                    handleSelectTemplate(
                      event.target
                        .value,
                    )
                  }
                  options={
                    templateOptions
                  }
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <TimeInput
                  label="Beginn"
                  value={start}
                  onChange={
                    setStart
                  }
                />

                <TimeInput
                  label="Ende"
                  value={end}
                  onChange={
                    setEnd
                  }
                />

                <Input
                  label="Geplante Pause (Min.)"
                  type="number"
                  min="0"
                  step="5"
                  placeholder="z. B. 30"
                  value={
                    plannedBreakMinutes
                  }
                  onChange={(
                    event,
                  ) =>
                    setPlannedBreakMinutes(
                      event.target
                        .value,
                    )
                  }
                />
              </div>

              {start && end && (
                <div className="rounded-2xl border border-[#CBD5E1] bg-white px-4 py-4 shadow-[0_4px_12px_rgba(15,23,42,0.06)]">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.06em] text-[#64748B]">
                        Brutto
                      </p>

                      <p className="mt-1 text-sm font-semibold text-[#0F172A]">
                        {formatMinutesAsHours(
                          currentGrossMinutes,
                        )}{" "}
                        Std.
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.06em] text-[#64748B]">
                        Pause
                      </p>

                      <p className="mt-1 text-sm font-semibold text-[#0F172A]">
                        {
                          currentBreakMinutes
                        }{" "}
                        Min.
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.06em] text-[#64748B]">
                        Geplant
                        netto
                      </p>

                      <p className="mt-1 text-sm font-semibold text-[#0F172A]">
                        {formatMinutesAsHours(
                          currentNetMinutes,
                        )}{" "}
                        Std.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {start &&
                  end &&
                  isOvernightShift(
                    start,
                    end,
                  ) && (
                    <Badge variant="primary">
                      Endet am
                      Folgetag
                    </Badge>
                  )}

                {date &&
                  employeeId &&
                  findAbsenceForShift(
                    employeeId,
                    date,
                  ) && (
                    <Badge variant="warning">
                      Abwesenheit:{" "}
                      {formatAbsenceType(
                        findAbsenceForShift(
                          employeeId,
                          date,
                        )?.type ||
                          "",
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

            <div className="flex flex-col-reverse gap-3 border-t border-[#CBD5E1] bg-[#F8FAFC] px-6 py-5 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={
                  resetForm
                }
              >
                Abbrechen
              </Button>

              <Button
                type="button"
                onClick={() =>
                  void handleSaveShift()
                }
              >
                {editingShiftId
                  ? "Änderungen speichern"
                  : "Schicht speichern"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <DiperaPopup
        open={
          showConfirmPopup
        }
        message={
          confirmMessage
        }
        onClose={() => {
          setShowConfirmPopup(
            false,
          );

          setConfirmAction(
            null,
          );
        }}
        onConfirm={() => {
          void confirmAction?.();

          setShowConfirmPopup(
            false,
          );

          setConfirmAction(
            null,
          );
        }}
        confirmText="Bestätigen"
      />
    </div>
  );
}