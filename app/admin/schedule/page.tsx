"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getBusinessId } from "@/lib/getBusinessId";

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

export default function SchedulePage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [shiftTemplates, setShiftTemplates] = useState<ShiftTemplate[]>([]);
  const [workTypes,setWorkTypes] = useState<WorkType[]>([]);
  const [selectedWorkType,setSelectedWorkType] = useState("");
  const [warning, setWarning] = useState("");

  const [employeeId, setEmployeeId] = useState("");
  const [date, setDate] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [selectedWeekStart, setSelectedWeekStart] = useState(getMonday(new Date()));
  const [successMessage, setSuccessMessage] = useState("");
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [showConfirmPopup, setShowConfirmPopup] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
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

  const { data: employeeData, error: employeeError } =
    await supabase
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
    employeeData?.map((employee) => employee.id) || [];

  const { data: notesData } = await supabase
    .from("employee_notes")
    .select("employee_id,note")
    .in("employee_id", employeeIds);

  const notes = (notesData || []) as EmployeeNote[];

  const employeesWithNotes = (employeeData || []).map(
    (employee) => {
      const latestNote = notes.find(
        (note) =>
          note.employee_id === employee.id
      );

      return {
        ...employee,
        note: latestNote?.note || "",
      };
    }
  );

  setEmployees(
    employeesWithNotes as Employee[]
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
      .order("shift_date", { ascending: true });

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

  const { data,error } = await supabase
    .from("work_types")
    .select("id,name")
    .eq("business_id",businessId)
    .order("name");

  if(error){
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
  }

  function getSelectedEmployee() {
    return employees.find((employee) => employee.id === employeeId);
  }

  function handleSelectTemplate(templateId: string) {
    setSelectedTemplateId(templateId);

    if (!templateId) {
      return;
    }

    const selectedTemplate = shiftTemplates.find(
      (template) => template.id === templateId
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

function showConfirm(text: string, action: () => void) {
  setConfirmMessage(text);
  setConfirmAction(() => action);
  setShowConfirmPopup(true);
}

  async function handleSaveShift() {
    if (!employeeId || !date || !start || !end) {
      showInfo("Bitte Mitarbeiter, Datum, Schichtbeginn und Schichtende ausfüllen.");
      return;
    }

if (isOvernightShift(start, end) && !skipOvernightConfirm) {
  showConfirm(
    "Das Schichtende liegt vor oder genau auf dem Beginn. Soll diese Schicht als Nachtschicht gespeichert werden?",
    () => {
      setSkipOvernightConfirm(true);
      setTimeout(() => {
        handleSaveShift();
      }, 0);
    }
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
    shift.id !== editingShiftId
);

if (existingShift) {
  showInfo("Diese Schicht existiert für diesen Mitarbeiter bereits.");
  return;
}

    const absenceForShift = findAbsenceForShift(selectedEmployee.id, date);

    if (absenceForShift) {
      setWarning(
        `Achtung: ${selectedEmployee.name} ist an diesem Tag als ${formatAbsenceType(
          absenceForShift.type
        )} eingetragen. Die Schicht wurde trotzdem gespeichert.`
      );
    } else {
      setWarning("");
    }

    if (editingShiftId) {
      const { error } = await supabase
        .from("shifts")
        .update({
          employee_id: selectedEmployee.id,
          employee_name: selectedEmployee.name,
          shift_date: date,
          start_time: start,
          end_time: end,
          business_id: businessId,
          work_type_id:selectedWorkType,
          work_type_name:
          workTypes.find(
          (type)=>type.id===selectedWorkType
          )?.name || null
        })
        .eq("id", editingShiftId)
        .eq("business_id", businessId);

      if (error) {
        console.error("SHIFT INSERT ERROR", error);

        showDiperaPopup(
          error.message || "Es ist ein Fehler aufgetreten."
        );
        return;
      }
    } else {
      if (!selectedWorkType) {
    showDiperaPopup(
    "Bitte wähle einen Arbeitstyp aus, bevor du die Schicht speicherst."
    );
    return;
}
      const { error } = await supabase.from("shifts").insert([
        {
          employee_id: selectedEmployee.id,
          employee_name: selectedEmployee.name,
          shift_date: date,
          start_time: start,
          end_time: end,
          business_id: businessId,

          work_type_id:selectedWorkType,

          work_type_name:
          workTypes.find(
          (type)=>type.id===selectedWorkType
          )?.name || null
        },
      ]);

      if (error) {
        console.error(error);
        showDiperaPopup(
"Es ist ein Fehler aufgetreten."
);
        return;
      }
    }

const wasEditing = Boolean(editingShiftId);

resetForm();
loadShifts();
setSkipOvernightConfirm(false);

showSuccess(
  wasEditing
    ? "Die Schicht wurde erfolgreich aktualisiert."
    : "Die Schicht wurde erfolgreich angelegt."
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
    setSelectedWorkType(
    shift.work_type_id || ""
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
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
      showDiperaPopup(
"Es ist ein Fehler aufgetreten."
);
      return;
    }

    loadShifts();
  }

  function findAbsenceForShift(employeeId: string, shiftDate: string) {
    return absences.find(
      (absence) =>
        absence.employee_id === employeeId &&
        shiftDate >= absence.start_date &&
        shiftDate <= absence.end_date
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
    weekDates.includes(shift.shift_date)
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

  const targetDates = copiedShifts.map(
  (shift) => shift.shift_date
);

const { data: existingShifts, error: existingError } =
  await supabase
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
    "In der Zielwoche existieren bereits Schichten. Kopieren abgebrochen."
  );
  return;
}

showConfirm(
  `${copiedShifts.length} Schichten in nächste Woche kopieren?`,
  async () => {
    const { error } = await supabase
      .from("shifts")
      .insert(copiedShifts);

    if (error) {
      console.error(error);
      showInfo("Woche konnte nicht kopiert werden.");
      return;
    }

    await loadShifts();
    showSuccess("Woche erfolgreich kopiert.");
  }
);

return;
}

async function handlePublishSelectedWeek() {
  const businessId = await getBusinessId();

  if (!businessId) {
    showInfo("Keine Business-ID gefunden.");
    return;
  }

  const weekDates = getWeekDays(selectedWeekStart).map(
    (day) => day.date
  );

  const shiftsToPublish = shifts.filter((shift) =>
    weekDates.includes(shift.shift_date)
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
        .update({
          is_published: true,
        })
        .eq("business_id", businessId)
        .in("shift_date", weekDates);

      if (error) {
        console.error(error);
        showInfo("Dienstplan konnte nicht veröffentlicht werden.");
        return;
      }

      await loadShifts();

      showSuccess("Dienstplan wurde veröffentlicht.");
    }
  );
}

  const todayDate = formatDateForDatabase(new Date());
  const todaysShifts = shifts.filter((shift) => shift.shift_date === todayDate);

  const weekDays = getWeekDays(selectedWeekStart);
  const weekStartText = formatDateForDisplay(weekDays[0].date);
  const weekEndText = formatDateForDisplay(weekDays[6].date);
  const weekDates = weekDays.map((day) => day.date);

const shiftsInSelectedWeek = shifts.filter((shift) =>
  weekDates.includes(shift.shift_date)
);

const isSelectedWeekPublished =
  shiftsInSelectedWeek.length > 0 &&
  shiftsInSelectedWeek.every(
    (shift) => shift.is_published
  );

  return (
    <div>
      <h1 className="text-4xl font-bold text-blue-950 mb-8">
        Dienstplan
      </h1>

      <div className="bg-white rounded-2xl shadow p-6 mb-8">
        <h2 className="text-2xl font-semibold text-blue-950 mb-4">
          {editingShiftId ? "Schicht bearbeiten" : "Neue Schicht eintragen"}
        </h2>

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
<div className="flex flex-col gap-1">
  <label className="text-sm font-semibold text-gray-600">
    Mitarbeiter
  </label>

  <select
    value={employeeId}
    onChange={(event) => setEmployeeId(event.target.value)}
    className="border p-3 rounded-lg bg-white text-black h-[50px]"
  >
    <option value="">Mitarbeiter auswählen</option>

    {employees.map((employee) => (
      <option key={employee.id} value={employee.id}>
        {employee.name}
        {employee.note
          ? ` (${employee.note.slice(0, 40)})`
          : ""}
      </option>
    ))}
  </select>
</div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-600">
              Datum
            </label>

            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="border p-3 rounded-lg bg-white text-black"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-600">
              Vorlage
            </label>

            <div className="flex flex-col gap-1">

<label className="text-sm font-semibold text-gray-600">
Arbeitstyp
</label>

<select
value={selectedWorkType}
onChange={(e)=>setSelectedWorkType(e.target.value)}
className="border p-3 rounded-lg bg-white text-black"
>

<option value="">
Auswählen
</option>

{workTypes.map(type=>(

<option
key={type.id}
value={type.id}
>

{type.name}

</option>

))}

</select>

<div className="flex flex-col gap-1">
  <label className="text-sm font-semibold text-gray-600">
    Schichtvorlage
  </label>
</div>

</div>

            <select
              value={selectedTemplateId}
              onChange={(event) => handleSelectTemplate(event.target.value)}
              className="border p-3 rounded-lg bg-white text-black"
            >
              <option value="">Manuell</option>

              {shiftTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name} ({formatShiftTime(template.start_time, template.end_time)})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-600">
              Schichtbeginn
            </label>

            <input
              type="time"
              value={start}
              onChange={(event) => setStart(event.target.value)}
              className="border p-3 rounded-lg bg-white text-black"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-600">
              Schichtende
            </label>

            <input
              type="time"
              value={end}
              onChange={(event) => setEnd(event.target.value)}
              className="border p-3 rounded-lg bg-white text-black"
            />

            {start && end && isOvernightShift(start, end) && (
              <p className="text-xs font-semibold text-blue-700 mt-1">
                Endet am Folgetag
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3 mt-5">
          <button
            onClick={handleSaveShift}
            className="bg-blue-950 text-white px-5 py-3 rounded-xl cursor-pointer hover:bg-blue-900 hover:scale-105 transition"
          >
            {editingShiftId ? "Änderungen speichern" : "Schicht speichern"}
          </button>

          {editingShiftId && (
            <button
              onClick={resetForm}
              className="bg-gray-500 text-white px-5 py-3 rounded-xl cursor-pointer hover:bg-gray-600 transition"
            >
              Bearbeiten abbrechen
            </button>
          )}
        </div>

        {warning && (
          <div className="mt-5 bg-yellow-100 text-yellow-800 p-4 rounded-xl font-semibold">
            {warning}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow p-6 mb-8">
        <h2 className="text-2xl font-semibold text-blue-950 mb-4">
          Wer arbeitet heute?
        </h2>

        {todaysShifts.length > 0 ? (
          <div className="flex flex-col gap-3">
            {todaysShifts.map((shift) => (
              <div
                key={shift.id}
                className="bg-blue-50 rounded-xl p-4 text-black flex flex-col md:flex-row md:justify-between gap-3"
              >
                <div>
                  <p className="font-semibold">{shift.employee_name}</p>
                  {shift.work_type_name && (
  <span className="bg-blue-950 text-white text-xs px-2 py-1 rounded-full w-fit mb-1 inline-block">
    {shift.work_type_name}
  </span>
)}

<p>{formatShiftTime(shift.start_time, shift.end_time)}</p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditShift(shift)}
                    className="bg-yellow-500 text-white px-3 py-2 rounded-lg hover:bg-yellow-600 transition"
                  >
                    Bearbeiten
                  </button>

                  <button
                    onClick={() =>
  showConfirm(
    "Möchtest du diese Schicht wirklich löschen?",
    () => handleDeleteShift(shift.id)
  )
}
                    className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition"
                  >
                    Löschen
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">
            Für heute sind keine Schichten eingetragen.
          </p>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-2xl font-semibold text-blue-950">
              Wochenübersicht
            </h2>

            <p className="text-gray-500 mt-1">
              {weekStartText} bis {weekEndText}
            </p>

            <p
            className={`mt-2 inline-flex px-3 py-1 rounded-full text-sm font-semibold ${
              isSelectedWeekPublished
                ? "bg-green-100 text-green-700"
                : "bg-yellow-100 text-yellow-700"
            }`}
          >
            {isSelectedWeekPublished ? "Veröffentlicht" : "Entwurf"}
          </p>
          </div>

          <div className="flex flex-col md:flex-row gap-2">
            <button
              onClick={goToPreviousWeek}
              className="bg-gray-200 text-blue-950 px-4 py-2 rounded-lg hover:bg-gray-300 transition"
            >
              Vorherige Woche
            </button>

            <button
              onClick={goToCurrentWeek}
              className="bg-blue-950 text-white px-4 py-2 rounded-lg hover:bg-blue-900 transition"
            >
              Aktuelle Woche
            </button>

            <button
              onClick={goToNextWeek}
              className="bg-gray-200 text-blue-950 px-4 py-2 rounded-lg hover:bg-gray-300 transition"
            >
              Nächste Woche
            </button>

            <button
              onClick={handleCopyWeekToNext}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
>
                Woche → nächste kopieren
            </button>

            <button
            onClick={handlePublishSelectedWeek}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Dienstplan veröffentlichen
          </button>
          </div>
        </div>

        <div className="overflow-x-auto max-w-full">
          <table className="min-w-[900px] w-full text-left border-collapse">
            <thead>
              <tr className="border-b text-gray-600">
                <th className="py-3 px-3">Mitarbeiter</th>

                {weekDays.map((day) => (
                  <th
                    key={day.date}
                    className={`py-3 px-3 ${
                      day.date === todayDate ? "bg-blue-50 text-blue-950" : ""
                    }`}
                  >
                    <div>{day.label}</div>
                    <div className="text-sm font-normal">{day.displayDate}</div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {employees.map((employee) => (
                <tr key={employee.id} className="border-b">
                  <td className="py-4 px-3 font-semibold text-black">
                    {employee.name}
                  </td>

                  {weekDays.map((day) => {
                    const shiftForDay = shifts.find(
                      (shift) =>
                        shift.employee_id === employee.id &&
                        shift.shift_date === day.date
                    );

                    return (
                      <td
                        key={day.date}
                        className={`py-4 px-3 text-black align-top ${
                          day.date === todayDate ? "bg-blue-50" : ""
                        }`}
                      >
                        {shiftForDay ? (
                          <div className="flex flex-col gap-2">
<div className="flex flex-col gap-1">

{shiftForDay.work_type_name && (
<div className="mb-1">
  <span
    className="
    inline-flex
    items-center
    bg-blue-950
    text-white
    text-xs
    font-semibold
    px-3
    py-1
    rounded-full
    "
  >
    {shiftForDay.work_type_name}
  </span>
</div>
)}

<span className="bg-blue-100 text-blue-950 px-3 py-2 rounded-lg inline-block">

{formatShiftTime(
shiftForDay.start_time,
shiftForDay.end_time
)}

</span>

</div>

                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEditShift(shiftForDay)}
                                className="bg-yellow-500 text-white px-2 py-1 rounded text-sm hover:bg-yellow-600 transition"
                              >
                                Bearbeiten
                              </button>

                              <button
                                onClick={() =>
  showConfirm(
    "Möchtest du diese Schicht wirklich löschen?",
    () => handleDeleteShift(shiftForDay.id)
  )
}
                                className="bg-red-600 text-white px-2 py-1 rounded text-sm hover:bg-red-700 transition"
                              >
                                Löschen
                              </button>
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">Frei</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {showSuccessPopup && (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50">
    <div className="max-w-lg w-full text-center rounded-3xl border border-white/10 bg-[#0B1220]/95 shadow-2xl p-8 md:p-10">
      <p className="text-2xl md:text-3xl font-bold text-white mb-8 leading-snug">
        {successMessage}
      </p>

      <button
        type="button"
        onClick={() => setShowSuccessPopup(false)}
        className="bg-gradient-to-r from-blue-700 to-blue-500 text-white px-12 py-4 rounded-2xl text-xl font-bold shadow-xl hover:scale-105 transition"
      >
        OK
      </button>
    </div>
  </div>
)}

{showConfirmPopup && (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50">
    <div className="max-w-lg w-full text-center rounded-3xl border border-white/10 bg-[#0B1220]/95 shadow-2xl p-8 md:p-10">
      <p className="text-2xl md:text-3xl font-bold text-white mb-8 leading-snug">
        {confirmMessage}
      </p>

      <div className="flex flex-col md:flex-row gap-4 justify-center">
        <button
          type="button"
          onClick={() => setShowConfirmPopup(false)}
          className="bg-gray-600 text-white px-8 py-4 rounded-2xl text-lg font-bold hover:bg-gray-700 transition"
        >
          Abbrechen
        </button>

        <button
          type="button"
          onClick={() => {
            confirmAction?.();
            setShowConfirmPopup(false);
            setConfirmAction(null);
          }}
          className="bg-red-600 text-white px-8 py-4 rounded-2xl text-lg font-bold hover:bg-red-700 transition"
        >
          Bestätigen
        </button>
      </div>
    </div>
  </div>
)}
{showPopup && (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50">

    <div className="max-w-lg w-full text-center rounded-3xl bg-[#0B1220]/95 p-8">

      <p className="text-2xl font-bold text-white mb-8">
        {popupMessage}
      </p>

      <button
        onClick={() => setShowPopup(false)}
        className="bg-blue-600 text-white px-10 py-4 rounded-2xl"
      >
        OK
      </button>

    </div>

  </div>
)}
    </div>
  );
}