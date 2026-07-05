"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getBusinessId } from "@/lib/getBusinessId";
import { getBusiness } from "@/lib/getBusiness";
import { Bell, CalendarDays, Clock, LogOut, Umbrella, Users } from "lucide-react";
import DiperaPopup from "@/components/DiperaPopup";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import CardBody from "@/components/ui/CardBody";
import CardHeader from "@/components/ui/CardHeader";
import Input from "@/components/ui/Input";
import Section from "@/components/ui/Section";
import StatCard from "@/components/ui/StatCard";
import Textarea from "@/components/ui/Textarea";
import { BUSINESS_TIME_ZONE } from "@/lib/config/businessTime";
import TimeInput from "@/components/ui/TimeInput";
import { useToast } from "@/components/ui/ToastProvider";

type Employee = {
  id: string;
  name: string;
  account_status: string;
  vacation_days_per_year: number;
  work_days_per_week: number;
};

type Shift = {
  id: string;
  employee_id: string;
  employee_name: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  work_type_name?: string;
};

type TimeEntry = {
  id: string;
  employee_id: string;
  employee_name: string;
  action: string;
  created_at: string;
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

type Profile = {
  id: string;
  role: string;
  business_id: string;
  employee_id: string;
};

type Notification = {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
};

type EmployeeTargetHour = {
  id: string;
  employee_id: string;
  weekly_hours: number;
  monthly_hours: number;
};

function formatShiftDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

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

function getRequestStatusColor(status: string) {
  if (status === "pending") return "text-yellow-600";
  if (status === "approved") return "text-green-600";
  if (status === "rejected") return "text-red-600";
  return "text-black";
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getShiftDurationText(startTime: string, endTime: string) {
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);

  let startTotal = startHour * 60 + startMinute;
  let endTotal = endHour * 60 + endMinute;

  if (endTotal <= startTotal) {
    endTotal += 24 * 60;
  }

  return formatMinutes(endTotal - startTotal);
}

function formatMinutes(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) {
    return `${minutes} Min.`;
  }

  return `${hours} Std. ${minutes} Min.`;
}

function isSameDay(dateA: Date, dateB: Date) {
  return dateA.toDateString() === dateB.toDateString();
}

function getWeekNumber(date: Date) {
  const copiedDate = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  const dayNumber = copiedDate.getUTCDay() || 7;

  copiedDate.setUTCDate(copiedDate.getUTCDate() + 4 - dayNumber);

  const yearStart = new Date(Date.UTC(copiedDate.getUTCFullYear(), 0, 1));

  return Math.ceil(
    ((copiedDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
}

function calculateWorkedMinutes(entries: TimeEntry[]) {
  const sortedEntries = [...entries].sort(
    (a, b) =>
      new Date(a.created_at).getTime() -
      new Date(b.created_at).getTime()
  );

  let totalMinutes = 0;
  let workStart: Date | null = null;
  let pauseStart: Date | null = null;

  sortedEntries.forEach((entry) => {
    const entryDate = new Date(
  new Date(entry.created_at)
    .toLocaleString(
      "en-US",
      {
        timeZone: BUSINESS_TIME_ZONE
      }
    )
);

    if (entry.action === "check_in") {
      workStart = entryDate;
      pauseStart = null;
    }

    if (entry.action === "break_start" && workStart) {
      totalMinutes +=
        (entryDate.getTime() - workStart.getTime()) / 60000;

      workStart = null;
      pauseStart = entryDate;
    }

    if (entry.action === "break_end" && pauseStart) {
      workStart = entryDate;
      pauseStart = null;
    }

    if (entry.action === "check_out" && workStart) {
      totalMinutes +=
        (entryDate.getTime() - workStart.getTime()) / 60000;

      workStart = null;
      pauseStart = null;
    }
  });

  return Math.round(totalMinutes);
}

function calculateSessionMinutesInRange(
  entries: TimeEntry[],
  rangeStart: Date,
  rangeEnd: Date
) {
  const sortedEntries = [...entries].sort(
    (a, b) =>
      new Date(a.created_at).getTime() -
      new Date(b.created_at).getTime()
  );

  let totalMinutes = 0;
  let workStart: Date | null = null;
  let pauseStart: Date | null = null;

  sortedEntries.forEach((entry) => {
    const entryDate = new Date(
  new Date(entry.created_at)
    .toLocaleString(
      "en-US",
      {
        timeZone: BUSINESS_TIME_ZONE
      }
    )
);

    if (entry.action === "check_in") {
      workStart = entryDate;
      pauseStart = null;
    }

    if (entry.action === "break_start" && workStart) {
      const start = Math.max(
        workStart.getTime(),
        rangeStart.getTime()
      );

      const end = Math.min(
        entryDate.getTime(),
        rangeEnd.getTime()
      );

      if (end > start) {
        totalMinutes += (end - start) / 60000;
      }

      workStart = null;
      pauseStart = entryDate;
    }

    if (entry.action === "break_end" && pauseStart) {
      workStart = entryDate;
      pauseStart = null;
    }

    if (entry.action === "check_out" && workStart) {
      const start = Math.max(
        workStart.getTime(),
        rangeStart.getTime()
      );

      const end = Math.min(
        entryDate.getTime(),
        rangeEnd.getTime()
      );

      if (end > start) {
        totalMinutes += (end - start) / 60000;
      }

      workStart = null;
      pauseStart = null;
    }
  });

  return Math.round(totalMinutes);
}

function formatNotificationDate(dateString: string) {
  return new Date(dateString).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateForDatabase(date: Date) {
  return date.toLocaleDateString("en-CA");
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
      displayDate: date.toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
    };
  });
}

export default function EmployeePage() {
  const { showToast } = useToast();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [employeeId, setEmployeeId] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [monthlyTargetHours, setMonthlyTargetHours] = useState(173);

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [teamShifts,setTeamShifts] = useState<Shift[]>([]);
  const [selectedWeekStart, setSelectedWeekStart] = useState(
  getMonday(new Date())
  );
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [popupMessage, setPopupMessage] = useState("");
  const [showPopup, setShowPopup] = useState(false);
  const [correctionDate, setCorrectionDate] = useState("");
  const [correctionStartTime, setCorrectionStartTime] = useState("");
  const [correctionEndTime, setCorrectionEndTime] = useState("");
  const [correctionReason, setCorrectionReason] = useState("");

  async function loadEmployeeProfile() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, role, business_id, employee_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      console.error(profileError);
      showDiperaPopup("Kein Profil gefunden.");
      window.location.href = "/login";
      return;
    }

    const typedProfile = profile as Profile;

    if (typedProfile.role !== "employee") {
      showDiperaPopup("Dieser Bereich ist nur für Mitarbeiter.");
      window.location.href = "/admin";
      return;
    }

    if (!typedProfile.employee_id) {
      showDiperaPopup("Diesem Benutzer ist kein Mitarbeiter zugeordnet.");
      window.location.href = "/login";
      return;
    }

    const { data: employeeData, error: employeeError } = await supabase
      .from("employees")
      .select(
"id,name,account_status,vacation_days_per_year,work_days_per_week"
)
      .eq("id", typedProfile.employee_id)
      .eq("business_id", typedProfile.business_id)
      .single();

    if (employeeError || !employeeData) {
      console.error(employeeError);
      showDiperaPopup("Mitarbeiter konnte nicht geladen werden.");
      window.location.href = "/login";
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

    const currentEmployeeId = typedProfile.employee_id;

    setBusinessName(business.name);
    setEmployee(employeeData as Employee);
    setEmployeeId(currentEmployeeId);

    await loadShifts(currentEmployeeId);
    await loadTeamShifts();
    await loadTimeEntries(currentEmployeeId);
    await loadAbsences(currentEmployeeId);
    await loadNotifications(currentEmployeeId);
    await loadMonthlyTargetHours(currentEmployeeId);

    setCheckingAuth(false);
  }

async function loadShifts(selectedEmployeeId: string) {
  if (!selectedEmployeeId) return;

  const businessId = await getBusinessId();

  if (!businessId) return;

  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("shifts")
    .select("*")
    .eq("business_id", businessId)
    .eq("employee_id", selectedEmployeeId)
    .eq("is_published", true)
    .gte("shift_date", today)
    .order("shift_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) {
    console.error(error);
    return;
  }

  const now = new Date();

  const upcomingShifts = (data || []).filter((shift) => {
    const startDateTime = new Date(
      `${shift.shift_date}T${shift.start_time}`
    );

    let endDateTime = new Date(
      `${shift.shift_date}T${shift.end_time}`
    );

    if (endDateTime <= startDateTime) {
      endDateTime.setDate(endDateTime.getDate() + 1);
    }

    return endDateTime >= now;
  });

  setShifts(upcomingShifts);
}

  async function handleSubmitCorrectionRequest() {
  if (!employee) {
    showDiperaPopup("Mitarbeiter konnte nicht gefunden werden.");
    return;
  }

  const businessId = await getBusinessId();

  if (!businessId) {
    showDiperaPopup("Keine Business-ID gefunden.");
    return;
  }

  if (!correctionDate) {
    showDiperaPopup("Bitte wähle ein Datum aus.");
    return;
  }

  if (!correctionStartTime && !correctionEndTime) {
    showDiperaPopup(
      "Bitte gib mindestens eine Start- oder Endzeit an."
    );
    return;
  }

  const { error } = await supabase
    .from("time_correction_requests")
    .insert([
      {
        business_id: businessId,
        employee_id: employee.id,
        employee_name: employee.name,
        correction_date: correctionDate,
        requested_start_time:
          correctionStartTime || null,
        requested_end_time:
          correctionEndTime || null,
        reason:
          correctionReason.trim() || null,
        status: "pending",
      },
    ]);

  if (error) {
  console.error("CORRECTION REQUEST ERROR:", error);

  showDiperaPopup(
    error.message || "Der Korrekturantrag konnte nicht gesendet werden."
  );

  return;
}

  setCorrectionDate("");
  setCorrectionStartTime("");
  setCorrectionEndTime("");
  setCorrectionReason("");

  showToast({
    type: "success",
    title: "Korrekturantrag gesendet",
    description: "Dein Antrag wurde an die Verwaltung übermittelt.",
  });
}

async function loadTeamShifts(weekStartDate = selectedWeekStart) {
  const businessId = await getBusinessId();

  if (!businessId) return;

  const weekDays = getWeekDays(weekStartDate);

  const start = weekDays[0].date;
  const end = weekDays[6].date;

  const { data, error } = await supabase
    .from("shifts")
    .select("id, employee_id, employee_name, shift_date, start_time, end_time, work_type_name")
    .eq("business_id", businessId)
    .gte("shift_date", start)
    .lte("shift_date", end)
    .order("shift_date", { ascending: true });

  if (error) {
    console.error(error);
    return;
  }

  setTeamShifts((data || []) as Shift[]);
}

  async function loadTimeEntries(selectedEmployeeId: string) {
    if (!selectedEmployeeId) return;

    const businessId = await getBusinessId();

    if (!businessId) return;

    const { data, error } = await supabase
      .from("time_entries")
      .select("*")
      .eq("business_id", businessId)
      .eq("employee_id", selectedEmployeeId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error(error);
      return;
    }

    setTimeEntries(data || []);
  }

  async function loadAbsences(selectedEmployeeId: string) {
    if (!selectedEmployeeId) return;

    const businessId = await getBusinessId();

    if (!businessId) return;

    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const sixtyDaysAgoString = sixtyDaysAgo.toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("absences")
      .select("*")
      .eq("business_id", businessId)
      .eq("employee_id", selectedEmployeeId)
      .eq("hidden_by_employee", false)
      .or(`request_status.eq.pending,start_date.gte.${sixtyDaysAgoString}`)
      .order("start_date", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    setAbsences(data || []);
  }

  async function handleHideAbsence(absenceId: string) {
  const { error } = await supabase
    .from("absences")
    .update({
      hidden_by_employee: true,
    })
    .eq("id", absenceId);

  if (error) {
    console.error(error);
    showToast({
      type: "error",
      title: "Antrag konnte nicht entfernt werden",
      description: "Bitte versuche es erneut.",
    });
    return;
  }

  setAbsences((currentAbsences) =>
    currentAbsences.filter((absence) => absence.id !== absenceId)
  );

  showToast({
    type: "success",
    title: "Antrag ausgeblendet",
    description: "Der Antrag wurde aus deiner Übersicht entfernt.",
  });
}

  async function loadNotifications(selectedEmployeeId: string) {
    if (!selectedEmployeeId) return;

    const businessId = await getBusinessId();

    if (!businessId) return;

    const { data, error } = await supabase
      .from("notifications")
      .select("id, title, message, type, is_read, created_at")
      .eq("business_id", businessId)
      .eq("employee_id", selectedEmployeeId)
      .eq("is_read", false)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error(error);
      return;
    }

    setNotifications((data || []) as Notification[]);
  }

  async function loadMonthlyTargetHours(selectedEmployeeId: string) {
    if (!selectedEmployeeId) return;

    const { data, error } = await supabase
      .from("employee_target_hours")
      .select("id, employee_id, weekly_hours, monthly_hours")
      .eq("employee_id", selectedEmployeeId)
      .maybeSingle();

    if (error) {
      console.error(error);
      return;
    }

    const target = data as EmployeeTargetHour | null;

    setMonthlyTargetHours(target?.monthly_hours ?? 173);
  }

  async function markAllNotificationsAsRead() {
    if (!employeeId) return;

    const businessId = await getBusinessId();

    if (!businessId) return;

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("business_id", businessId)
      .eq("employee_id", employeeId)
      .eq("is_read", false);

    if (error) {
      console.error(error);
      showToast({
        type: "error",
        title: "Benachrichtigungen konnten nicht aktualisiert werden",
        description: "Bitte versuche es erneut.",
      });
      return;
    }

    await loadNotifications(employeeId);

    showToast({
      type: "success",
      title: "Benachrichtigungen aktualisiert",
      description: "Alle Hinweise wurden als gelesen markiert.",
    });
  }

  useEffect(() => {
    loadEmployeeProfile();
  }, []);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel>;

    async function setupRealtime() {
      if (!employeeId) return;

      const businessId = await getBusinessId();

      if (!businessId) return;

      channel = supabase
        .channel(`employee-live-${employeeId}`)

        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `employee_id=eq.${employeeId}`,
          },
          async () => {
            await loadNotifications(employeeId);
          }
        )

        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "businesses",
            filter: `id=eq.${businessId}`,
          },
          async () => {
            const { data } = await supabase
              .from("businesses")
              .select("status")
              .eq("id", businessId)
              .single();

            if (data?.status === "suspended") {
              await supabase.auth.signOut();

              showDiperaPopup("Der Zugriff auf diesen Betrieb wurde gesperrt.");

              window.location.href = "/login";
            }
          }
        )

        .subscribe();
    }

    if (employeeId) {
      setupRealtime();
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [employeeId]);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

function calculateVacationDays(
start:string,
end:string
){

const startDate=
new Date(start);

const endDate=
new Date(end);

const totalDays=
Math.floor(
(
endDate.getTime()-
startDate.getTime()
)
/
(1000*60*60*24)
)+1;

const weeks=
totalDays/7;

const workDaysPerWeek=
employee?.work_days_per_week ?? 5;

return Math.round(
weeks*
workDaysPerWeek
);
}

function showDiperaPopup(message: string) {
  setPopupMessage(message);
  setShowPopup(true);
}

  async function handleVacationRequest() {
    if (!employee || !employeeId || !startDate || !endDate) {
      showDiperaPopup("Bitte Von-Datum und Bis-Datum auswählen.");
      return;
    }

    const requestedVacationDays = calculateVacationDays(startDate, endDate);

if (requestedVacationDays > remainingVacationDays) {
showDiperaPopup(
  `Du hast nur noch ${remainingVacationDays} Urlaubstage verfügbar. Dein Antrag umfasst ${requestedVacationDays} Tage.`
);
  return;
}

    if (startDate > endDate) {
  showDiperaPopup("Das Enddatum darf nicht vor dem Startdatum liegen.");
  return;
}

    const businessId = await getBusinessId();

    if (!businessId) {
      showDiperaPopup("Keine Business-ID gefunden.");
      return;
    }

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
      showDiperaPopup(
"Es ist ein Fehler aufgetreten."
);
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
  }

  const unreadNotifications = notifications.filter(
    (notification) => !notification.is_read
  );

  const today = new Date();

  const todayEntries = timeEntries.filter((entry) =>
    isSameDay(new Date(entry.created_at), today)
  );

  const weeklyEntries = timeEntries.filter((entry) => {
    const entryDate = new Date(entry.created_at);

    return (
      entryDate.getFullYear() === today.getFullYear() &&
      getWeekNumber(entryDate) === getWeekNumber(today)
    );
  });

  const monthlyEntries = timeEntries.filter((entry) => {
    const entryDate = new Date(entry.created_at);

    return (
      entryDate.getFullYear() === today.getFullYear() &&
      entryDate.getMonth() === today.getMonth()
    );
  });

  const todayStart = new Date();

todayStart.setHours(
  0,
  0,
  0,
  0
);

const todayEnd =
new Date(todayStart);

todayEnd.setDate(
  todayEnd.getDate() + 1
);

const todayMinutes =
calculateSessionMinutesInRange(
  timeEntries,
  todayStart,
  todayEnd
);
  const weeklyMinutes = calculateWorkedMinutes(weeklyEntries);
  const monthlyMinutes = calculateWorkedMinutes(monthlyEntries);

  const monthlyTargetMinutes = monthlyTargetHours * 60;
  const monthlyDifferenceMinutes = monthlyMinutes - monthlyTargetMinutes;

  function getMonthlyDifferenceText() {
    if (monthlyDifferenceMinutes > 0) {
      return `+${formatMinutes(monthlyDifferenceMinutes)} im Plus`;
    }

    if (monthlyDifferenceMinutes < 0) {
      return `${formatMinutes(Math.abs(monthlyDifferenceMinutes))} im Minus`;
    }

    return "Ausgeglichen";
  }

  function getMonthlyDifferenceColor() {
    if (monthlyDifferenceMinutes > 0) return "text-green-700";
    if (monthlyDifferenceMinutes < 0) return "text-red-600";
    return "text-blue-950";
  }

  function goToPreviousWeek() {
  const newWeekStart = addDays(
    selectedWeekStart,
    -7
  );

  setSelectedWeekStart(
    newWeekStart
  );

  loadTeamShifts(
    newWeekStart
  );
}

function goToNextWeek() {
  const newWeekStart =
    addDays(
      selectedWeekStart,
      7
    );

  setSelectedWeekStart(
    newWeekStart
  );

  loadTeamShifts(
    newWeekStart
  );
}

function goToCurrentWeek() {
  const newWeekStart =
    getMonday(
      new Date()
    );

  setSelectedWeekStart(
    newWeekStart
  );

  loadTeamShifts(
    newWeekStart
  );
}

const teamEmployees =
Array.from(

new Map(

teamShifts.map(
(shift)=>[
shift.employee_id,

{
id:
shift.employee_id,

name:
shift.employee_name,
}
]

)

).values()

);

const weekDays =
getWeekDays(
selectedWeekStart
);

const todayDate =
formatDateForDatabase(
new Date()
);

const weekStartText =
formatShiftDate(
weekDays[0].date
);

const weekEndText =
formatShiftDate(
weekDays[6].date
);

const approvedVacationDays =
  absences
    .filter(
      (absence) =>
        absence.type === "vacation" &&
        absence.request_status === "approved"
    )
    .reduce((total, absence) => {
      return (
        total +
        calculateVacationDays(
          absence.start_date,
          absence.end_date
        )
      );
    }, 0);

const remainingVacationDays=
(employee?.vacation_days_per_year ?? 24)
-
approvedVacationDays;

  if (checkingAuth) {
    return (
      <main className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-6">
        <Card className="max-w-md w-full">
          <CardBody className="text-center">
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#2563EB]">
              <Users className="h-5 w-5" />
            </div>

            <p className="text-xl font-light text-[#111827]">
              Mitarbeiterbereich wird geladen...
            </p>

            <p className="mt-2 text-sm text-[#6B7280]">
              Deine Daten werden vorbereitet.
            </p>
          </CardBody>
        </Card>
      </main>
    );
  }

  const approvedAbsencesCount = absences.filter(
    (absence) => absence.request_status === "approved"
  ).length;

  const pendingAbsencesCount = absences.filter(
    (absence) => absence.request_status === "pending"
  ).length;

  const nextShift = shifts[0];

  const getAbsenceBadgeVariant = (status: string) => {
    if (status === "approved") return "success";
    if (status === "rejected") return "danger";
    return "warning";
  };

  return (
    <main className="min-h-screen bg-[#F8FAFC] px-4 py-6 text-[#111827] md:px-8 md:py-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="relative overflow-hidden rounded-[32px] border border-[#E5E7EB] bg-white p-6 shadow-[0_18px_50px_rgba(17,24,39,0.06)] md:p-8">
          <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-[#EFF6FF] blur-3xl" />
          <div className="absolute bottom-0 right-24 h-32 w-32 rounded-full bg-[#DBEAFE] blur-3xl" />

          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-medium text-[#2563EB]">
                {businessName || "Dipera"}
              </p>

              <h1 className="mt-3 text-4xl font-light tracking-[-0.04em] text-[#111827] md:text-5xl">
                Willkommen{employee ? `, ${employee.name}` : ""}.
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-6 text-[#6B7280] md:text-base">
                Hier findest du deine Schichten, dein Stundenkonto, Urlaubsanträge und Korrekturen.
              </p>

              {nextShift && (
                <div className="mt-6 inline-flex flex-col gap-1 rounded-2xl border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-3 text-sm text-[#1D4ED8] sm:flex-row sm:items-center sm:gap-3">
                  <span className="font-medium">Nächste Schicht</span>
                  <span>
                    {formatShiftDate(nextShift.shift_date)} ·{" "}
                    {nextShift.start_time.slice(0, 5)} –{" "}
                    {nextShift.end_time.slice(0, 5)}
                  </span>
                </div>
              )}
            </div>

            <div className="grid w-full max-w-sm grid-cols-2 gap-3">
              <div className="rounded-3xl border border-[#E5E7EB] bg-[#F8FAFC] p-4">
                <Clock className="mb-4 h-5 w-5 text-[#2563EB]" />
                <p className="text-xs text-[#6B7280]">Heute gearbeitet</p>
                <p className="mt-2 text-2xl font-light text-[#111827]">
                  {formatMinutes(todayMinutes)}
                </p>
              </div>

              <div className="rounded-3xl border border-[#E5E7EB] bg-[#F8FAFC] p-4">
                <Umbrella className="mb-4 h-5 w-5 text-[#2563EB]" />
                <p className="text-xs text-[#6B7280]">Resturlaub</p>
                <p className="mt-2 text-2xl font-light text-[#111827]">
                  {remainingVacationDays}
                </p>
              </div>

              <div className="col-span-2 rounded-3xl border border-[#E5E7EB] bg-[#2563EB] p-4 text-white">
                <CalendarDays className="mb-4 h-5 w-5" />
                <p className="text-xs text-white/75">Aktuelle Woche</p>
                <p className="mt-2 text-lg font-light">
                  {weekStartText} – {weekEndText}
                </p>
              </div>
            </div>
          </div>
        </section>

        {notifications.length > 0 && (
          <Section
            title="Benachrichtigungen"
            description="Aktuelle Hinweise und Rückmeldungen deines Betriebs."
            action={
              unreadNotifications.length > 0 ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={markAllNotificationsAsRead}
                >
                  Alle als gelesen markieren ({unreadNotifications.length})
                </Button>
              ) : null
            }
          >
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] px-4 py-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="flex gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#2563EB]">
                        <Bell className="h-5 w-5" />
                      </div>

                      <div>
                        <p className="text-sm font-medium text-[#111827]">
                          {notification.title}
                        </p>

                        <p className="mt-1 text-sm leading-6 text-[#6B7280]">
                          {notification.message}
                        </p>
                      </div>
                    </div>

                    <p className="text-xs text-[#94A3B8]">
                      {formatNotificationDate(notification.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-5">
          <StatCard
            title="Heute"
            value={formatMinutes(todayMinutes)}
            badge="Heute"
            badgeVariant="primary"
          />

          <StatCard
            title="Diese Woche"
            value={formatMinutes(weeklyMinutes)}
          />

          <StatCard
            title="Monats-Soll"
            value={`${monthlyTargetHours} Std.`}
            badge="Soll"
            badgeVariant="muted"
          />

          <StatCard
            title="Monats-Saldo"
            value={getMonthlyDifferenceText()}
            badge={monthlyDifferenceMinutes >= 0 ? "OK" : "Prüfen"}
            badgeVariant={monthlyDifferenceMinutes >= 0 ? "success" : "warning"}
          />

          <StatCard
            title="Dieser Monat"
            value={formatMinutes(monthlyMinutes)}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Section
            title="Meine Schichten"
            description="Deine nächsten geplanten Einsätze."
          >
            {shifts.length > 0 ? (
              <div className="divide-y divide-[#E5E7EB]">
                {shifts.slice(0, 6).map((shift) => (
                  <div
                    key={shift.id}
                    className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium text-[#111827]">
                        {formatShiftDate(shift.shift_date)}
                      </p>

                      <p className="mt-1 text-sm text-[#6B7280]">
                        {shift.start_time.slice(0, 5)} –{" "}
                        {shift.end_time.slice(0, 5)}
                      </p>
                    </div>

                    <Badge variant="primary">
                      {shift.work_type_name || "Schicht"}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#6B7280]">
                Für dich sind noch keine Schichten eingetragen.
              </p>
            )}
          </Section>

          <Section
            title="Urlaubsübersicht"
            description="Dein Jahresurlaub und aktuelle Anträge."
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] p-4">
                <p className="text-xs text-[#6B7280]">Urlaub/Jahr</p>
                <p className="mt-2 text-3xl font-light text-[#111827]">
                  {employee?.vacation_days_per_year ?? 24}
                </p>
              </div>

              <div className="rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] p-4">
                <p className="text-xs text-[#6B7280]">Genehmigt</p>
                <p className="mt-2 text-3xl font-light text-[#111827]">
                  {approvedVacationDays}
                </p>
              </div>

              <div className="rounded-2xl border border-[#E5E7EB] bg-[#EFF6FF] p-4">
                <p className="text-xs text-[#2563EB]">Resturlaub</p>
                <p className="mt-2 text-3xl font-light text-[#111827]">
                  {remainingVacationDays}
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Badge variant="warning">{pendingAbsencesCount} offen</Badge>
              <Badge variant="success">{approvedAbsencesCount} genehmigt</Badge>
            </div>
          </Section>
        </div>

        <Section
          title="Wochenplan"
          description={`${weekStartText} bis ${weekEndText}`}
          action={
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="secondary"
                onClick={goToPreviousWeek}
              >
                Vorherige Woche
              </Button>

              <Button
                type="button"
                variant="primary"
                onClick={goToCurrentWeek}
              >
                Aktuelle Woche
              </Button>

              <Button
                type="button"
                variant="secondary"
                onClick={goToNextWeek}
              >
                Nächste Woche
              </Button>
            </div>
          }
          bodyClassName="overflow-x-auto"
        >
          {teamEmployees.length > 0 ? (
            <div className="min-w-[980px] overflow-hidden rounded-3xl border border-[#E2E8F0] bg-white">
              <div className="grid grid-cols-[220px_repeat(7,minmax(128px,1fr))] border-b border-[#E2E8F0] bg-[#F8FAFC]">
                <div className="px-4 py-4 text-xs font-semibold uppercase tracking-[0.08em] text-[#64748B]">
                  Mitarbeiter
                </div>

                {weekDays.map((day) => (
                  <div
                    key={day.date}
                    className={[
                      "px-4 py-4 text-center",
                      day.date === todayDate ? "bg-[#EFF6FF]" : "",
                    ].join(" ")}
                  >
                    <p
                      className={[
                        "text-sm font-semibold text-[#0F172A]",
                        day.date === todayDate ? "text-[#2563EB]" : "",
                      ].join(" ")}
                    >
                      {day.label.slice(0, 2)}
                    </p>

                    <p className="mt-1 text-xs text-[#64748B]">
                      {day.displayDate}
                    </p>

                    {day.date === todayDate && (
                      <Badge variant="primary" className="mt-2">
                        Heute
                      </Badge>
                    )}
                  </div>
                ))}
              </div>

              <div>
                {teamEmployees.map((teamEmployee) => (
                  <div
                    key={teamEmployee.id}
                    className="grid grid-cols-[220px_repeat(7,minmax(128px,1fr))] border-b border-[#F1F5F9] last:border-b-0"
                  >
                    <div className="flex items-center gap-3 border-r border-[#F1F5F9] px-4 py-4">
                      <div
                        className={[
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white",
                          teamEmployee.id === employeeId
                            ? "bg-[#2563EB]"
                            : "bg-[#64748B]",
                        ].join(" ")}
                      >
                        {getInitials(teamEmployee.name)}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#0F172A]">
                          {teamEmployee.name}
                        </p>

                        {teamEmployee.id === employeeId && (
                          <p className="text-xs text-[#2563EB]">Du</p>
                        )}
                      </div>
                    </div>

                    {weekDays.map((day) => {
                      const shiftsForDay = teamShifts.filter(
                        (shift) =>
                          shift.employee_id === teamEmployee.id &&
                          shift.shift_date === day.date
                      );

                      return (
                        <div
                          key={day.date}
                          className={[
                            "min-h-[104px] border-r border-[#F1F5F9] px-3 py-4 last:border-r-0",
                            day.date === todayDate ? "bg-[#EFF6FF]/45" : "",
                          ].join(" ")}
                        >
                          {shiftsForDay.length > 0 ? (
                            <div className="flex flex-col gap-2">
                              {shiftsForDay.map((shift) => (
                                <div
                                  key={shift.id}
                                  className="rounded-2xl border border-[#93C5FD] bg-[#2563EB] p-3 text-white shadow-[0_10px_24px_rgba(37,99,235,0.22)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(37,99,235,0.28)]"
                                >
                                  <p className="text-sm font-semibold leading-5">
                                    {shift.start_time.slice(0, 5)} –{" "}
                                    {shift.end_time.slice(0, 5)}
                                  </p>

                                  <p className="mt-1 text-xs font-medium text-white/85">
                                    {shift.work_type_name || "Schicht"}
                                  </p>

                                  <p className="mt-2 text-[11px] text-white/70">
                                    {getShiftDurationText(
                                      shift.start_time,
                                      shift.end_time
                                    )}
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="flex h-full min-h-[72px] items-center justify-center rounded-2xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] text-xs text-[#94A3B8]">
                              Frei
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-6 py-12 text-center">
              <h3 className="text-xl font-semibold text-[#0F172A]">
                Kein Wochenplan vorhanden
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#64748B]">
                Für diese Woche wurden noch keine veröffentlichten
                Team-Schichten eingetragen.
              </p>
            </div>
          )}
        </Section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Section
            title="Zeitkorrektur beantragen"
            description="Falls du eine Stempelung vergessen hast, kannst du hier eine Korrektur beantragen."
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Input
                label="Datum"
                type="date"
                value={correctionDate}
                onChange={(event) => setCorrectionDate(event.target.value)}
              />

              <TimeInput
                label="Arbeitsbeginn"
                value={correctionStartTime}
                onChange={setCorrectionStartTime}
              />

              <TimeInput
                label="Arbeitsende"
                value={correctionEndTime}
                onChange={setCorrectionEndTime}
              />
            </div>

            <Textarea
              className="mt-4"
              value={correctionReason}
              onChange={(event) => setCorrectionReason(event.target.value)}
              placeholder="Grund / Hinweis für den Admin"
            />

            <div className="mt-5">
              <Button
                type="button"
                variant="primary"
                onClick={handleSubmitCorrectionRequest}
              >
                Korrekturantrag senden
              </Button>
            </div>
          </Section>

          <Section
            title="Urlaub beantragen"
            description="Beantrage Urlaub für einen Zeitraum. Dein Antrag wird an den Admin gesendet."
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

            <div className="mt-5">
              <Button
                type="button"
                variant="primary"
                onClick={handleVacationRequest}
              >
                Urlaubsantrag senden
              </Button>
            </div>
          </Section>
        </div>

        <Section
          title="Meine Urlaubsanträge"
          description="Alle sichtbaren Urlaubs- und Abwesenheitsanträge."
        >
          {absences.length > 0 ? (
            <div className="space-y-3">
              {absences.map((absence) => (
                <div
                  key={absence.id}
                  className="rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] px-4 py-4"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-medium text-[#111827]">
                        {formatAbsenceType(absence.type)}
                      </p>

                      <p className="mt-1 text-sm text-[#6B7280]">
                        {absence.start_date} bis {absence.end_date}
                      </p>
                    </div>

                    <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                      <Badge variant={getAbsenceBadgeVariant(absence.request_status)}>
                        {formatRequestStatus(absence.request_status)}
                      </Badge>

                      {absence.request_status !== "pending" && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleHideAbsence(absence.id)}
                        >
                          Ausblenden
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#6B7280]">
              Du hast noch keine Urlaubsanträge gestellt.
            </p>
          )}
        </Section>

        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            onClick={handleLogout}
            className="text-red-600 hover:text-red-700"
          >
            <LogOut className="h-4 w-4" />
            Ausloggen
          </Button>
        </div>
      </div>

      <DiperaPopup
        open={showPopup}
        message={popupMessage}
        onClose={() => setShowPopup(false)}
      />
    </main>
  );
}