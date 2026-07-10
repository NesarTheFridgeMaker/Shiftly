"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getBusinessId } from "@/lib/getBusinessId";

import DiperaPopup from "@/components/DiperaPopup";

import PageHeader from "@/components/ui/PageHeader";
import Section from "@/components/ui/Section";
import StatCard from "@/components/ui/StatCard";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import PageActions from "@/components/ui/PageActions";
import { useToast } from "@/components/ui/ToastProvider";

import StatsSkeleton from "@/components/skeletons/StatsSkeleton";
import FormSkeleton from "@/components/skeletons/FormSkeleton";
import TimeInput from "@/components/ui/TimeInput";

import { MapPin, Plus } from "lucide-react";

import LocationEditor, {
  LocationEditorValue,
} from "@/components/maps/LocationEditor";

type PayRule = {
  id: string;
  business_id: string;
  name: string;
  rule_type: string;
  starts_at: string | null;
  ends_at: string | null;
  percentage: number;
  datev_wage_type: string | null;
  active: boolean;
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

type BusinessLocation = {
  id: string;
  business_id: string;
  name: string;

  address: string | null;
  street: string | null;
  house_number: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null;
  country_code: string | null;

  mapbox_feature_id: string | null;

  latitude: number;
  longitude: number;
  radius_meters: number;
  timezone: string;

  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type SupabaseLikeError = {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
};

const federalStateOptions = [
  { value: "BW", label: "Baden-Württemberg" },
  { value: "BY", label: "Bayern" },
  { value: "BE", label: "Berlin" },
  { value: "BB", label: "Brandenburg" },
  { value: "HB", label: "Bremen" },
  { value: "HH", label: "Hamburg" },
  { value: "HE", label: "Hessen" },
  { value: "MV", label: "Mecklenburg-Vorpommern" },
  { value: "NI", label: "Niedersachsen" },
  { value: "NW", label: "Nordrhein-Westfalen" },
  { value: "RP", label: "Rheinland-Pfalz" },
  { value: "SL", label: "Saarland" },
  { value: "SN", label: "Sachsen" },
  { value: "ST", label: "Sachsen-Anhalt" },
  { value: "SH", label: "Schleswig-Holstein" },
  { value: "TH", label: "Thüringen" },
];

const payRuleTypeOptions = [
  { value: "night", label: "Nacht" },
  { value: "sunday", label: "Sonntag" },
  { value: "holiday", label: "Feiertag" },
];

function formatError(error: unknown) {
  const supabaseError = error as SupabaseLikeError;

  if (supabaseError?.message) {
    return [
      supabaseError.message,
      supabaseError.details,
      supabaseError.hint,
      supabaseError.code ? `Code: ${supabaseError.code}` : "",
    ]
      .filter(Boolean)
      .join(" ");
  }

  try {
    return JSON.stringify(error);
  } catch {
    return "Unbekannter Fehler.";
  }
}

function formatRuleType(ruleType: string) {
  if (ruleType === "night") return "Nacht";
  if (ruleType === "sunday") return "Sonntag";
  if (ruleType === "holiday") return "Feiertag";
  return ruleType;
}

function getFederalStateLabel(value: string) {
  return (
    federalStateOptions.find((state) => state.value === value)?.label ?? value
  );
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default function SettingsPage() {
  const { showToast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [shiftTemplates, setShiftTemplates] = useState<ShiftTemplate[]>([]);
  const [templateName, setTemplateName] = useState("");
  const [templateStart, setTemplateStart] = useState("");
  const [templateEnd, setTemplateEnd] = useState("");

  const [workTypes, setWorkTypes] = useState<WorkType[]>([]);
  const [workTypeName, setWorkTypeName] = useState("");

  const [payRules, setPayRules] = useState<PayRule[]>([]);
  const [payRuleName, setPayRuleName] = useState("");
  const [payRuleType, setPayRuleType] = useState("night");
  const [payRuleStart, setPayRuleStart] = useState("");
  const [payRuleEnd, setPayRuleEnd] = useState("");
  const [payRulePercentage, setPayRulePercentage] = useState("");
  const [payRuleDatevType, setPayRuleDatevType] = useState("");

  const [federalState, setFederalState] = useState("BW");
  const [datevRegularHoursWageType, setDatevRegularHoursWageType] =
    useState("100");
  const [datevSalaryWageType, setDatevSalaryWageType] = useState("101");
  const [datevOvertimeWageType, setDatevOvertimeWageType] = useState("130");
  const [datevVacationWageType, setDatevVacationWageType] = useState("140");
  const [datevSickWageType, setDatevSickWageType] = useState("141");

  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [showConfirmPopup, setShowConfirmPopup] = useState(false);

  const [businessLocations, setBusinessLocations] = useState<
    BusinessLocation[]
  >([]);
  const [showLocationEditor, setShowLocationEditor] = useState(false);
  const [editingLocationId, setEditingLocationId] = useState<string | null>(
    null,
  );
  const [isSavingLocation, setIsSavingLocation] = useState(false);

  const activePayRules = payRules.filter((rule) => rule.active);

  const editingLocation =
    businessLocations.find((location) => location.id === editingLocationId) ??
    null;

  const locationEditorInitialValue = editingLocation
    ? {
        name: editingLocation.name,
        address: editingLocation.address ?? "",
        street: editingLocation.street ?? "",
        houseNumber: editingLocation.house_number ?? "",
        postalCode: editingLocation.postal_code ?? "",
        city: editingLocation.city ?? "",
        country: editingLocation.country ?? "",
        countryCode: editingLocation.country_code ?? "",
        mapboxFeatureId: editingLocation.mapbox_feature_id ?? "",
        latitude: editingLocation.latitude,
        longitude: editingLocation.longitude,
        radiusMeters: editingLocation.radius_meters,
        timezone: editingLocation.timezone || "Europe/Berlin",
      }
    : undefined;

  function showConfirm(text: string, action: () => void) {
    setConfirmMessage(text);
    setConfirmAction(() => action);
    setShowConfirmPopup(true);
  }

  async function loadShiftTemplates() {
    const businessId = await getBusinessId();

    if (!businessId) {
      showToast({
        type: "error",
        title: "Betrieb nicht gefunden",
        description: "Schichtvorlagen konnten nicht geladen werden.",
      });
      return;
    }

    const { data, error } = await supabase
      .from("shift_templates")
      .select("id, name, start_time, end_time")
      .eq("business_id", businessId)
      .order("name", { ascending: true });

    if (error) {
      console.error("LOAD SHIFT TEMPLATES ERROR:", error);
      showToast({
        type: "error",
        title: "Schichtvorlagen konnten nicht geladen werden",
        description: formatError(error),
      });
      return;
    }

    setShiftTemplates((data || []) as ShiftTemplate[]);
  }

  async function createShiftTemplate() {
    if (!templateName.trim() || !templateStart || !templateEnd) {
      showToast({
        type: "warning",
        title: "Angaben fehlen",
        description:
          "Bitte fülle Name, Beginn und Ende der Schichtvorlage aus.",
      });
      return;
    }

    const businessId = await getBusinessId();

    if (!businessId) {
      showToast({
        type: "error",
        title: "Betrieb nicht gefunden",
        description: "Die Schichtvorlage konnte nicht gespeichert werden.",
      });
      return;
    }

    setIsSaving(true);

    try {
      const { error } = await supabase.from("shift_templates").insert([
        {
          business_id: businessId,
          name: templateName.trim(),
          start_time: templateStart,
          end_time: templateEnd,
        },
      ]);

      if (error) {
        console.error("CREATE SHIFT TEMPLATE ERROR:", error);
        showToast({
          type: "error",
          title: "Schichtvorlage konnte nicht gespeichert werden",
          description: formatError(error),
        });
        return;
      }

      const savedName = templateName.trim();

      setTemplateName("");
      setTemplateStart("");
      setTemplateEnd("");

      await loadShiftTemplates();

      showToast({
        type: "success",
        title: "Schichtvorlage gespeichert",
        description: `${savedName} wurde hinzugefügt.`,
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteShiftTemplate(id: string) {
    const businessId = await getBusinessId();

    if (!businessId) {
      showToast({
        type: "error",
        title: "Betrieb nicht gefunden",
        description: "Die Schichtvorlage konnte nicht gelöscht werden.",
      });
      return;
    }

    const template = shiftTemplates.find((item) => item.id === id);

    const { error } = await supabase
      .from("shift_templates")
      .delete()
      .eq("id", id)
      .eq("business_id", businessId);

    if (error) {
      console.error("DELETE SHIFT TEMPLATE ERROR:", error);
      showToast({
        type: "error",
        title: "Schichtvorlage konnte nicht gelöscht werden",
        description: formatError(error),
      });
      return;
    }

    await loadShiftTemplates();

    showToast({
      type: "success",
      title: "Schichtvorlage gelöscht",
      description: template
        ? `${template.name} wurde entfernt.`
        : "Die Vorlage wurde entfernt.",
    });
  }

  async function loadWorkTypes() {
    const businessId = await getBusinessId();

    if (!businessId) {
      showToast({
        type: "error",
        title: "Betrieb nicht gefunden",
        description: "Arbeitstypen konnten nicht geladen werden.",
      });
      return;
    }

    const { data, error } = await supabase
      .from("work_types")
      .select("id, name")
      .eq("business_id", businessId)
      .order("name", { ascending: true });

    if (error) {
      console.error("LOAD WORK TYPES ERROR:", error);
      showToast({
        type: "error",
        title: "Arbeitstypen konnten nicht geladen werden",
        description: formatError(error),
      });
      return;
    }

    setWorkTypes((data || []) as WorkType[]);
  }

  async function createWorkType() {
    if (!workTypeName.trim()) {
      showToast({
        type: "warning",
        title: "Name fehlt",
        description: "Bitte gib einen Namen für den Arbeitstyp ein.",
      });
      return;
    }

    const businessId = await getBusinessId();

    if (!businessId) {
      showToast({
        type: "error",
        title: "Betrieb nicht gefunden",
        description: "Der Arbeitstyp konnte nicht gespeichert werden.",
      });
      return;
    }

    setIsSaving(true);

    try {
      const { error } = await supabase.from("work_types").insert([
        {
          business_id: businessId,
          name: workTypeName.trim(),
        },
      ]);

      if (error) {
        console.error("CREATE WORK TYPE ERROR:", error);
        showToast({
          type: "error",
          title: "Arbeitstyp konnte nicht gespeichert werden",
          description: formatError(error),
        });
        return;
      }

      const savedName = workTypeName.trim();

      setWorkTypeName("");
      await loadWorkTypes();

      showToast({
        type: "success",
        title: "Arbeitstyp gespeichert",
        description: `${savedName} wurde hinzugefügt.`,
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteWorkType(id: string) {
    const businessId = await getBusinessId();

    if (!businessId) {
      showToast({
        type: "error",
        title: "Betrieb nicht gefunden",
        description: "Der Arbeitstyp konnte nicht gelöscht werden.",
      });
      return;
    }

    const workType = workTypes.find((item) => item.id === id);

    const { error } = await supabase
      .from("work_types")
      .delete()
      .eq("id", id)
      .eq("business_id", businessId);

    if (error) {
      console.error("DELETE WORK TYPE ERROR:", error);
      showToast({
        type: "error",
        title: "Arbeitstyp konnte nicht gelöscht werden",
        description: formatError(error),
      });
      return;
    }

    await loadWorkTypes();

    showToast({
      type: "success",
      title: "Arbeitstyp gelöscht",
      description: workType
        ? `${workType.name} wurde entfernt.`
        : "Der Arbeitstyp wurde entfernt.",
    });
  }

  async function loadPayRules() {
    const businessId = await getBusinessId();

    if (!businessId) {
      showToast({
        type: "error",
        title: "Betrieb nicht gefunden",
        description: "Zuschläge konnten nicht geladen werden.",
      });
      return;
    }

    const { data, error } = await supabase
      .from("pay_rules")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("LOAD PAY RULES ERROR:", error);
      showToast({
        type: "error",
        title: "Zuschläge konnten nicht geladen werden",
        description: formatError(error),
      });
      return;
    }

    setPayRules((data || []) as PayRule[]);
  }

  async function handleCreatePayRule() {
    const businessId = await getBusinessId();

    if (!businessId) {
      showToast({
        type: "error",
        title: "Betrieb nicht gefunden",
        description: "Der Zuschlag konnte nicht gespeichert werden.",
      });
      return;
    }

    if (!payRuleName.trim() || !payRulePercentage) {
      showToast({
        type: "warning",
        title: "Angaben fehlen",
        description: "Bitte gib Name und Zuschlag ein.",
      });
      return;
    }

    const percentage = Number(payRulePercentage);

    if (Number.isNaN(percentage) || percentage <= 0) {
      showToast({
        type: "warning",
        title: "Ungültiger Zuschlag",
        description: "Bitte gib einen gültigen Prozentwert ein.",
      });
      return;
    }

    setIsSaving(true);

    try {
      const { error } = await supabase.from("pay_rules").insert([
        {
          business_id: businessId,
          name: payRuleName.trim(),
          rule_type: payRuleType,
          starts_at: payRuleStart || null,
          ends_at: payRuleEnd || null,
          percentage,
          datev_wage_type: payRuleDatevType.trim() || null,
        },
      ]);

      if (error) {
        console.error("CREATE PAY RULE ERROR:", error);
        showToast({
          type: "error",
          title: "Zuschlag konnte nicht gespeichert werden",
          description: formatError(error),
        });
        return;
      }

      const savedName = payRuleName.trim();

      setPayRuleName("");
      setPayRuleType("night");
      setPayRuleStart("");
      setPayRuleEnd("");
      setPayRulePercentage("");
      setPayRuleDatevType("");

      await loadPayRules();

      showToast({
        type: "success",
        title: "Zuschlag gespeichert",
        description: `${savedName} wurde hinzugefügt.`,
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeletePayRule(ruleId: string) {
    const businessId = await getBusinessId();

    if (!businessId) {
      showToast({
        type: "error",
        title: "Betrieb nicht gefunden",
        description: "Der Zuschlag konnte nicht gelöscht werden.",
      });
      return;
    }

    const rule = payRules.find((item) => item.id === ruleId);

    const { error } = await supabase
      .from("pay_rules")
      .delete()
      .eq("id", ruleId)
      .eq("business_id", businessId);

    if (error) {
      console.error("DELETE PAY RULE ERROR:", error);
      showToast({
        type: "error",
        title: "Zuschlag konnte nicht gelöscht werden",
        description: formatError(error),
      });
      return;
    }

    await loadPayRules();

    showToast({
      type: "success",
      title: "Zuschlag gelöscht",
      description: rule
        ? `${rule.name} wurde entfernt.`
        : "Der Zuschlag wurde entfernt.",
    });
  }

  async function handleTogglePayRuleActive(
    ruleId: string,
    currentActive: boolean,
  ) {
    const businessId = await getBusinessId();

    if (!businessId) {
      showToast({
        type: "error",
        title: "Betrieb nicht gefunden",
        description: "Der Zuschlag konnte nicht geändert werden.",
      });
      return;
    }

    const rule = payRules.find((item) => item.id === ruleId);

    const { error } = await supabase
      .from("pay_rules")
      .update({ active: !currentActive })
      .eq("id", ruleId)
      .eq("business_id", businessId);

    if (error) {
      console.error("TOGGLE PAY RULE ERROR:", error);
      showToast({
        type: "error",
        title: "Zuschlag konnte nicht geändert werden",
        description: formatError(error),
      });
      return;
    }

    await loadPayRules();

    showToast({
      type: "success",
      title: currentActive ? "Zuschlag deaktiviert" : "Zuschlag aktiviert",
      description: rule
        ? `${rule.name} wurde ${currentActive ? "deaktiviert" : "aktiviert"}.`
        : "Die Änderung wurde übernommen.",
    });
  }

  async function loadBusiness() {
    const businessId = await getBusinessId();

    if (!businessId) {
      showToast({
        type: "error",
        title: "Betrieb nicht gefunden",
        description: "Betriebseinstellungen konnten nicht geladen werden.",
      });
      return;
    }

    const { data, error } = await supabase
      .from("businesses")
      .select(
        "federal_state, datev_regular_hours_wage_type, datev_salary_wage_type, datev_overtime_wage_type, datev_vacation_wage_type, datev_sick_wage_type",
      )
      .eq("id", businessId)
      .single();

    if (error) {
      console.error("LOAD BUSINESS ERROR:", error);
      showToast({
        type: "error",
        title: "Betriebseinstellungen konnten nicht geladen werden",
        description: formatError(error),
      });
      return;
    }

    if (data?.federal_state) setFederalState(data.federal_state);
    if (data?.datev_regular_hours_wage_type) {
      setDatevRegularHoursWageType(data.datev_regular_hours_wage_type);
    }
    if (data?.datev_salary_wage_type) {
      setDatevSalaryWageType(data.datev_salary_wage_type);
    }
    if (data?.datev_overtime_wage_type) {
      setDatevOvertimeWageType(data.datev_overtime_wage_type);
    }
    if (data?.datev_vacation_wage_type) {
      setDatevVacationWageType(data.datev_vacation_wage_type);
    }
    if (data?.datev_sick_wage_type) {
      setDatevSickWageType(data.datev_sick_wage_type);
    }
  }

  async function saveFederalState() {
    const businessId = await getBusinessId();

    if (!businessId) {
      showToast({
        type: "error",
        title: "Betrieb nicht gefunden",
        description: "Die Einstellungen konnten nicht gespeichert werden.",
      });
      return;
    }

    setIsSaving(true);

    try {
      const { error } = await supabase
        .from("businesses")
        .update({
          federal_state: federalState,
          datev_regular_hours_wage_type:
            datevRegularHoursWageType.trim() || null,
          datev_salary_wage_type: datevSalaryWageType.trim() || null,
          datev_overtime_wage_type: datevOvertimeWageType.trim() || null,
          datev_vacation_wage_type: datevVacationWageType.trim() || null,
          datev_sick_wage_type: datevSickWageType.trim() || null,
        })
        .eq("id", businessId);

      if (error) {
        console.error("SAVE BUSINESS SETTINGS ERROR:", error);
        showToast({
          type: "error",
          title: "Einstellungen konnten nicht gespeichert werden",
          description: formatError(error),
        });
        return;
      }

      showToast({
        type: "success",
        title: "Einstellungen gespeichert",
        description: "Bundesland und DATEV-Lohnarten wurden aktualisiert.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function loadBusinessLocations() {
    const businessId = await getBusinessId();

    if (!businessId) {
      showToast({
        type: "error",
        title: "Betrieb nicht gefunden",
        description: "Standorte konnten nicht geladen werden.",
      });
      return;
    }

    const { data, error } = await supabase
      .from("business_locations")
      .select(
        `
        id,
        business_id,
        name,
        address,
        street,
        house_number,
        postal_code,
        city,
        country,
        country_code,
        mapbox_feature_id,
        latitude,
        longitude,
        radius_meters,
        timezone,
        is_active,
        created_at,
        updated_at
      `,
      )
      .eq("business_id", businessId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("LOAD BUSINESS LOCATIONS ERROR:", error);
      showToast({
        type: "error",
        title: "Standorte konnten nicht geladen werden",
        description: formatError(error),
      });
      return;
    }

    setBusinessLocations((data || []) as BusinessLocation[]);
  }

  function openNewLocationEditor() {
    setEditingLocationId(null);
    setShowLocationEditor(true);
  }

  function openEditLocationEditor(locationId: string) {
    setEditingLocationId(locationId);
    setShowLocationEditor(true);
  }

  function closeLocationEditor() {
    if (isSavingLocation) return;

    setShowLocationEditor(false);
    setEditingLocationId(null);
  }

  async function saveLocationEditorValue(value: LocationEditorValue) {
    const businessId = await getBusinessId();

    if (!businessId) {
      showToast({
        type: "error",
        title: "Betrieb nicht gefunden",
        description: "Der Standort konnte nicht gespeichert werden.",
      });
      return;
    }

    setIsSavingLocation(true);

    const databaseValue = {
      business_id: businessId,
      name: value.name,
      address: value.address || null,
      street: value.street || null,
      house_number: value.houseNumber || null,
      postal_code: value.postalCode || null,
      city: value.city || null,
      country: value.country || null,
      country_code: value.countryCode || null,
      mapbox_feature_id: value.mapboxFeatureId || null,
      latitude: value.latitude,
      longitude: value.longitude,
      radius_meters: value.radiusMeters,
      timezone: value.timezone,
      is_active: true,
    };

    try {
      if (editingLocationId) {
        const {
          business_id: _businessId,
          is_active: _isActive,
          ...updateValue
        } = databaseValue;

        const { error } = await supabase
          .from("business_locations")
          .update(updateValue)
          .eq("id", editingLocationId)
          .eq("business_id", businessId);

        if (error) {
          console.error("UPDATE BUSINESS LOCATION ERROR:", error);
          showToast({
            type: "error",
            title: "Standort konnte nicht aktualisiert werden",
            description: formatError(error),
          });
          return;
        }

        showToast({
          type: "success",
          title: "Standort aktualisiert",
          description: `${value.name} wurde gespeichert.`,
        });
      } else {
        const { error } = await supabase
          .from("business_locations")
          .insert([databaseValue]);

        if (error) {
          console.error("CREATE BUSINESS LOCATION ERROR:", error);

          const duplicateName = error.code === "23505";

          showToast({
            type: "error",
            title: duplicateName
              ? "Standortname bereits vergeben"
              : "Standort konnte nicht gespeichert werden",
            description: duplicateName
              ? "Ein Standort mit diesem Namen existiert bereits."
              : formatError(error),
          });
          return;
        }

        showToast({
          type: "success",
          title: "Standort gespeichert",
          description: `${value.name} wurde hinzugefügt.`,
        });
      }

      await loadBusinessLocations();
      setShowLocationEditor(false);
      setEditingLocationId(null);
    } finally {
      setIsSavingLocation(false);
    }
  }

  async function toggleBusinessLocation(
    locationId: string,
    currentStatus: boolean,
  ) {
    const businessId = await getBusinessId();

    if (!businessId) {
      showToast({
        type: "error",
        title: "Betrieb nicht gefunden",
        description: "Der Standort konnte nicht geändert werden.",
      });
      return;
    }

    const location = businessLocations.find((item) => item.id === locationId);

    const { error } = await supabase
      .from("business_locations")
      .update({ is_active: !currentStatus })
      .eq("id", locationId)
      .eq("business_id", businessId);

    if (error) {
      console.error("TOGGLE BUSINESS LOCATION ERROR:", error);
      showToast({
        type: "error",
        title: "Standort konnte nicht geändert werden",
        description: formatError(error),
      });
      return;
    }

    await loadBusinessLocations();

    showToast({
      type: "success",
      title: currentStatus ? "Standort deaktiviert" : "Standort aktiviert",
      description: location
        ? `${location.name} wurde ${
            currentStatus ? "deaktiviert" : "aktiviert"
          }.`
        : "Die Änderung wurde gespeichert.",
    });
  }

  async function deleteBusinessLocation(locationId: string) {
    const businessId = await getBusinessId();

    if (!businessId) {
      showToast({
        type: "error",
        title: "Betrieb nicht gefunden",
        description: "Der Standort konnte nicht gelöscht werden.",
      });
      return;
    }

    const location = businessLocations.find((item) => item.id === locationId);

    const { error } = await supabase
      .from("business_locations")
      .delete()
      .eq("id", locationId)
      .eq("business_id", businessId);

    if (error) {
      console.error("DELETE BUSINESS LOCATION ERROR:", error);
      showToast({
        type: "error",
        title: "Standort konnte nicht gelöscht werden",
        description: formatError(error),
      });
      return;
    }

    if (editingLocationId === locationId) {
      setShowLocationEditor(false);
      setEditingLocationId(null);
    }

    await loadBusinessLocations();

    showToast({
      type: "success",
      title: "Standort gelöscht",
      description: location
        ? `${location.name} wurde entfernt.`
        : "Der Standort wurde entfernt.",
    });
  }

  async function loadSettings() {
    setIsLoading(true);

    try {
      await Promise.all([
        loadShiftTemplates(),
        loadWorkTypes(),
        loadPayRules(),
        loadBusiness(),
        loadBusinessLocations(),
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Einstellungen"
          description="Verwalte Unternehmensdaten, Arbeitstypen, Schichtvorlagen und Zuschläge."
        />

        <StatsSkeleton />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <FormSkeleton />
          <FormSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Einstellungen"
        description="Verwalte Unternehmensdaten, Arbeitstypen, Schichtvorlagen und Zuschläge."
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Arbeitstypen"
          value={workTypes.length}
          badge="Planung"
          badgeVariant="primary"
        />

        <StatCard
          title="Schichtvorlagen"
          value={shiftTemplates.length}
          badge="Vorlagen"
          badgeVariant="muted"
        />

        <StatCard
          title="Aktive Zuschläge"
          value={activePayRules.length}
          badge="Lohn"
          badgeVariant={activePayRules.length > 0 ? "success" : "muted"}
        />

        <StatCard
          title="Bundesland"
          value={federalState}
          subtitle={getFederalStateLabel(federalState)}
        />
      </div>

      <Section
        title="Unternehmensdaten & DATEV"
        description="Diese Daten steuern Feiertage, Exporte und Standard-Lohnarten."
        action={<Badge variant="primary">Basis</Badge>}
      >
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Select
            label="Bundesland"
            value={federalState}
            onChange={(event) => setFederalState(event.target.value)}
            options={federalStateOptions}
          />

          <Input
            label="Reguläre Arbeitsstunden"
            value={datevRegularHoursWageType}
            onChange={(event) =>
              setDatevRegularHoursWageType(event.target.value)
            }
            placeholder="z. B. 100"
          />

          <Input
            label="Monatsgehalt"
            value={datevSalaryWageType}
            onChange={(event) => setDatevSalaryWageType(event.target.value)}
            placeholder="z. B. 101"
          />

          <Input
            label="Überstunden"
            value={datevOvertimeWageType}
            onChange={(event) => setDatevOvertimeWageType(event.target.value)}
            placeholder="z. B. 130"
          />

          <Input
            label="Urlaubstage"
            value={datevVacationWageType}
            onChange={(event) => setDatevVacationWageType(event.target.value)}
            placeholder="z. B. 140"
          />

          <Input
            label="Krankheitstage"
            value={datevSickWageType}
            onChange={(event) => setDatevSickWageType(event.target.value)}
            placeholder="z. B. 141"
          />
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-[#E2E8F0] pt-5 md:flex-row md:items-center md:justify-between">
          <p className="text-sm leading-6 text-[#64748B]">
            Tipp: Diese Lohnarten werden später für Excel- und DATEV-Exporte
            verwendet.
          </p>

          <Button type="button" onClick={saveFederalState} loading={isSaving}>
            Einstellungen speichern
          </Button>
        </div>
      </Section>

      <Section
        title="Betriebsstandorte"
        description="Lege fest, an welchen Standorten Mitarbeiter ihre Arbeitszeit erfassen dürfen."
        action={
          !showLocationEditor ? (
            <Button type="button" size="sm" onClick={openNewLocationEditor}>
              <Plus className="h-4 w-4" />
              Standort hinzufügen
            </Button>
          ) : (
            <Badge variant="primary">
              {editingLocation ? "Standort bearbeiten" : "Neuer Standort"}
            </Badge>
          )
        }
      >
        {showLocationEditor && (
          <div className="mb-6 rounded-3xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 md:p-6">
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-[#0F172A]">
                {editingLocation
                  ? "Betriebsstandort bearbeiten"
                  : "Betriebsstandort hinzufügen"}
              </h3>

              <p className="mt-2 text-sm leading-6 text-[#64748B]">
                Lege den Mittelpunkt und den erlaubten Radius für die mobile
                Zeiterfassung fest.
              </p>
            </div>

            <LocationEditor
              key={editingLocationId ?? "new-location"}
              initialValue={locationEditorInitialValue}
              isSaving={isSavingLocation}
              onCancel={closeLocationEditor}
              onSave={saveLocationEditorValue}
            />
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {businessLocations.length > 0 ? (
            businessLocations.map((location) => (
              <div
                key={location.id}
                className="rounded-3xl border border-[#E2E8F0] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#CBD5E1] hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)]"
              >
                <div className="flex flex-col gap-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#005CA8]">
                      <MapPin className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-base font-semibold text-[#0F172A]">
                          {location.name}
                        </p>

                        <Badge
                          variant={location.is_active ? "success" : "muted"}
                          dot
                        >
                          {location.is_active ? "Aktiv" : "Inaktiv"}
                        </Badge>
                      </div>

                      <p className="mt-2 text-sm leading-6 text-[#64748B]">
                        {location.address ||
                          "Keine postalische Adresse hinterlegt"}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full bg-[#F8FAFC] px-3 py-1 text-xs font-medium text-[#64748B]">
                          Radius {location.radius_meters} m
                        </span>

                        <span className="rounded-full bg-[#F8FAFC] px-3 py-1 text-xs font-medium text-[#64748B]">
                          {location.timezone}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 border-t border-[#E2E8F0] pt-4 sm:flex-row sm:flex-wrap">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => openEditLocationEditor(location.id)}
                    >
                      Bearbeiten
                    </Button>

                    <Button
                      type="button"
                      variant={location.is_active ? "secondary" : "primary"}
                      size="sm"
                      onClick={() =>
                        toggleBusinessLocation(location.id, location.is_active)
                      }
                    >
                      {location.is_active ? "Deaktivieren" : "Aktivieren"}
                    </Button>

                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() =>
                        showConfirm(
                          "Möchtest du diesen Standort wirklich löschen?",
                          () => deleteBusinessLocation(location.id),
                        )
                      }
                    >
                      Löschen
                    </Button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-3xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-6 py-10 text-center xl:col-span-2">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#005CA8]">
                <MapPin className="h-5 w-5" />
              </div>

              <p className="mt-4 text-base font-semibold text-[#0F172A]">
                Noch kein Betriebsstandort
              </p>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#64748B]">
                Füge einen Standort hinzu, damit die mobile GPS-Zeiterfassung
                eingerichtet werden kann.
              </p>

              {!showLocationEditor && (
                <div className="mt-5">
                  <Button type="button" onClick={openNewLocationEditor}>
                    <Plus className="h-4 w-4" />
                    Ersten Standort hinzufügen
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </Section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Section
          title="Arbeitstypen"
          description="Bereiche wie Service, Küche oder Counter. Diese Auswahl erscheint in der Schichtplanung."
          action={<Badge variant="primary">{workTypes.length}</Badge>}
        >
          <div className="flex flex-col gap-3 md:flex-row">
            <Input
              label="Neuer Arbeitstyp"
              value={workTypeName}
              onChange={(event) => setWorkTypeName(event.target.value)}
              placeholder="z. B. Service"
              className="md:min-w-[280px]"
            />

            <div className="md:pt-[30px]">
              <Button type="button" onClick={createWorkType} loading={isSaving}>
                Hinzufügen
              </Button>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            {workTypes.length > 0 ? (
              workTypes.map((type) => (
                <div
                  key={type.id}
                  className="flex flex-col gap-3 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 transition hover:border-[#CBD5E1] md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#EFF6FF] text-sm font-semibold text-[#2563EB]">
                      {getInitials(type.name)}
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-[#0F172A]">
                        {type.name}
                      </p>
                      <p className="mt-0.5 text-xs text-[#64748B]">
                        In der Schichtplanung auswählbar
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() =>
                      showConfirm("Arbeitstyp wirklich löschen?", () =>
                        deleteWorkType(type.id),
                      )
                    }
                  >
                    Löschen
                  </Button>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-5 text-sm leading-6 text-[#64748B]">
                Noch keine Arbeitstypen vorhanden. Lege zuerst deine wichtigsten
                Arbeitsbereiche an.
              </div>
            )}
          </div>
        </Section>

        <Section
          title="Schichtvorlagen"
          description="Wiederkehrende Zeiten wie Früh-, Mittel- oder Spätschicht."
          action={<Badge variant="muted">{shiftTemplates.length}</Badge>}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Input
              label="Name"
              value={templateName}
              onChange={(event) => setTemplateName(event.target.value)}
              placeholder="z. B. Frühschicht"
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <TimeInput
                label="Beginn"
                value={templateStart}
                onChange={setTemplateStart}
              />

              <TimeInput
                label="Ende"
                value={templateEnd}
                onChange={setTemplateEnd}
              />
            </div>
          </div>

          <div className="mt-5">
            <Button
              type="button"
              onClick={createShiftTemplate}
              loading={isSaving}
            >
              Vorlage speichern
            </Button>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3">
            {shiftTemplates.length > 0 ? (
              shiftTemplates.map((template) => (
                <div
                  key={template.id}
                  className="flex flex-col gap-3 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 transition hover:border-[#CBD5E1] md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-[#0F172A]">
                      {template.name}
                    </p>
                    <p className="mt-1 text-sm text-[#64748B]">
                      {template.start_time.slice(0, 5)} –{" "}
                      {template.end_time.slice(0, 5)}
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() =>
                      showConfirm(
                        "Möchtest du diese Schichtvorlage wirklich löschen?",
                        () => deleteShiftTemplate(template.id),
                      )
                    }
                  >
                    Löschen
                  </Button>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-5 text-sm leading-6 text-[#64748B]">
                Noch keine Schichtvorlagen vorhanden. Vorlagen beschleunigen die
                Wochenplanung deutlich.
              </div>
            )}
          </div>
        </Section>
      </div>

      <Section
        title="Lohn & Zuschläge"
        description="Lege Nacht-, Sonn- oder Feiertagszuschläge inklusive DATEV-Lohnart fest."
        action={
          <PageActions>
            <Badge variant="success" dot>
              {activePayRules.length} aktiv
            </Badge>
            <Badge variant="muted">{payRules.length} gesamt</Badge>
          </PageActions>
        }
      >
        <div className="rounded-3xl border border-[#E2E8F0] bg-[#F8FAFC] p-5">
          <div className="mb-5 flex flex-col gap-1">
            <h3 className="text-base font-semibold text-[#0F172A]">
              Neuen Zuschlag anlegen
            </h3>
            <p className="text-sm text-[#64748B]">
              Beispiel: Nachtzuschlag 25 % von 22:00 bis 06:00 Uhr.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Input
              label="Name"
              value={payRuleName}
              onChange={(event) => setPayRuleName(event.target.value)}
              placeholder="z. B. Nachtzuschlag"
            />

            <Select
              label="Typ"
              value={payRuleType}
              onChange={(event) => setPayRuleType(event.target.value)}
              options={payRuleTypeOptions}
            />

            <Input
              label="Zuschlag %"
              type="number"
              value={payRulePercentage}
              onChange={(event) => setPayRulePercentage(event.target.value)}
              placeholder="25"
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <TimeInput
                label="Beginn"
                value={payRuleStart}
                onChange={setPayRuleStart}
              />

              <TimeInput
                label="Ende"
                value={payRuleEnd}
                onChange={setPayRuleEnd}
              />
            </div>

            <Input
              label="DATEV-Lohnart"
              value={payRuleDatevType}
              onChange={(event) => setPayRuleDatevType(event.target.value)}
              placeholder="z. B. 150"
            />
          </div>

          <div className="mt-5">
            <Button
              type="button"
              onClick={handleCreatePayRule}
              loading={isSaving}
            >
              Zuschlag speichern
            </Button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
          {payRules.length > 0 ? (
            payRules.map((rule) => (
              <div
                key={rule.id}
                className="rounded-3xl border border-[#E2E8F0] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#CBD5E1] hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)]"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-semibold text-[#0F172A]">
                        {rule.name}
                      </p>
                      <Badge variant={rule.active ? "success" : "danger"} dot>
                        {rule.active ? "Aktiv" : "Inaktiv"}
                      </Badge>
                      <Badge variant="muted">
                        {formatRuleType(rule.rule_type)}
                      </Badge>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-sm text-[#64748B]">
                      <span className="rounded-full bg-[#F8FAFC] px-3 py-1">
                        {rule.percentage}% Zuschlag
                      </span>

                      {rule.starts_at && rule.ends_at && (
                        <span className="rounded-full bg-[#F8FAFC] px-3 py-1">
                          {rule.starts_at.slice(0, 5)} –{" "}
                          {rule.ends_at.slice(0, 5)}
                        </span>
                      )}

                      {rule.datev_wage_type && (
                        <span className="rounded-full bg-[#F8FAFC] px-3 py-1">
                          DATEV {rule.datev_wage_type}
                        </span>
                      )}
                    </div>
                  </div>

                  <PageActions className="shrink-0">
                    <Button
                      type="button"
                      variant={rule.active ? "secondary" : "primary"}
                      size="sm"
                      onClick={() =>
                        handleTogglePayRuleActive(rule.id, rule.active)
                      }
                    >
                      {rule.active ? "Deaktivieren" : "Aktivieren"}
                    </Button>

                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() =>
                        showConfirm("Zuschlag wirklich löschen?", () =>
                          handleDeletePayRule(rule.id),
                        )
                      }
                    >
                      Löschen
                    </Button>
                  </PageActions>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-6 text-sm leading-6 text-[#64748B] xl:col-span-2">
              Noch keine Zuschläge vorhanden. Für viele Betriebe reicht zunächst
              ein Nachtzuschlag.
            </div>
          )}
        </div>
      </Section>

      <DiperaPopup
        open={showConfirmPopup}
        message={confirmMessage}
        cancelText="Abbrechen"
        confirmText="Löschen"
        onClose={() => {
          setShowConfirmPopup(false);
          setConfirmAction(null);
        }}
        onConfirm={() => {
          confirmAction?.();
          setShowConfirmPopup(false);
          setConfirmAction(null);
        }}
      />
    </div>
  );
}
