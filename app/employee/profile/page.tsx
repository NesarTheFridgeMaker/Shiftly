"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import PageHeader from "@/components/ui/PageHeader";
import Section from "@/components/ui/Section";
import Card from "@/components/ui/Card";
import CardBody from "@/components/ui/CardBody";
import Badge from "@/components/ui/Badge";
import Skeleton from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/ToastProvider";


type Profile = {
  id: string;
  role: string;
  employee_id: string | null;
  business_id: string | null;
  created_at: string;
};

type Employee = {
  id: string;
  name: string;
  role: string;
  account_status: string;
  vacation_days_per_year: number | null;
  work_days_per_week: number | null;
  wage_type: string | null;
  hourly_rate: number | null;
  monthly_salary: number | null;
  datev_personnel_number: string | null;
  cost_center: string | null;
};

type Business = {
  id: string;
  name: string;
};

function formatRole(role: string | null | undefined) {
  if (!role) return "Mitarbeiter";
  if (role === "owner") return "Owner";
  if (role === "admin") return "Admin";
  if (role === "employee") return "Mitarbeiter";
  return role;
}

function formatWageType(type: string | null | undefined) {
  if (type === "salary") return "Festes Monatsgehalt";
  if (type === "fixed_hourly") return "Fixer Monatslohn auf Stundenbasis";
  if (type === "hourly") return "Stundenlohn nach Iststunden";
  return "Nicht hinterlegt";
}

function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";

  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(value);
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

export default function EmployeeProfilePage() {
  const { showToast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [email, setEmail] = useState("");

  async function loadProfile() {
    setIsLoading(true);

    try {
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

      setEmail(user.email || "");

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, role, employee_id, business_id, created_at")
        .eq("id", user.id)
        .single();

      if (profileError || !profileData) {
        console.error(profileError);
        showToast({
          type: "error",
          title: "Profil konnte nicht geladen werden",
          description: "Bitte versuche es erneut.",
        });
        return;
      }

      setProfile(profileData as Profile);

      if (profileData.business_id) {
        const { data: businessData, error: businessError } = await supabase
          .from("businesses")
          .select("id, name")
          .eq("id", profileData.business_id)
          .single();

        if (businessError) {
          console.error(businessError);
        } else {
          setBusiness(businessData as Business);
        }
      }

      if (profileData.employee_id) {
        const { data: employeeData, error: employeeError } = await supabase
          .from("employees")
          .select(
            "id, name, role, account_status, vacation_days_per_year, work_days_per_week, wage_type, hourly_rate, monthly_salary, datev_personnel_number, cost_center"
          )
          .eq("id", profileData.employee_id)
          .single();

        if (employeeError || !employeeData) {
          console.error(employeeError);
          showToast({
            type: "error",
            title: "Mitarbeiterdaten konnten nicht geladen werden",
            description: "Bitte versuche es erneut.",
          });
          return;
        }

        setEmployee(employeeData as Employee);
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Profil"
          description="Deine persönlichen Daten und Einstellungen."
        />

        <Card>
          <CardBody>
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="mt-3 h-4 w-72" />
              </div>
            </div>
          </CardBody>
        </Card>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card>
            <CardBody>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="mt-5 h-12 w-full" />
              <Skeleton className="mt-4 h-12 w-full" />
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="mt-5 h-12 w-full" />
              <Skeleton className="mt-4 h-12 w-full" />
            </CardBody>
          </Card>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Profil"
          description="Deine persönlichen Daten und Einstellungen."
        />

        <Section
          title="Profil nicht gefunden"
          description="Deine Mitarbeiterdaten konnten nicht zugeordnet werden."
        >
          <p className="text-sm leading-6 text-[#64748B]">
            Bitte wende dich an deinen Arbeitgeber, damit dein Mitarbeiterkonto
            korrekt mit deinem Zugang verbunden wird.
          </p>
        </Section>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Profil"
        description="Deine persönlichen Daten und betriebliche Informationen."
      />

      <Card>
        <CardBody>
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-[#2563EB] text-lg font-semibold text-white shadow-[0_14px_35px_rgba(37,99,235,0.25)]">
                {getInitials(employee.name)}
              </div>

              <div>
                <h2 className="text-2xl font-semibold tracking-[-0.02em] text-[#0F172A]">
                  {employee.name}
                </h2>
                <p className="mt-1 text-sm text-[#64748B]">{email}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="primary" dot>
                {formatRole(profile?.role)}
              </Badge>

              <Badge
                variant={employee.account_status === "active" ? "success" : "warning"}
                dot
              >
                {employee.account_status === "active" ? "Aktiv" : "Deaktiviert"}
              </Badge>
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Section
          title="Persönliche Daten"
          description="Diese Angaben werden von deinem Arbeitgeber verwaltet."
        >
          <div className="space-y-4">
            <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#64748B]">
                Betrieb
              </p>
              <p className="mt-1 font-medium text-[#0F172A]">
                {business?.name || "—"}
              </p>
            </div>

            <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#64748B]">
                Rolle im Betrieb
              </p>
              <p className="mt-1 font-medium text-[#0F172A]">
                {employee.role || "Mitarbeiter"}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#64748B]">
                  Urlaubstage/Jahr
                </p>
                <p className="mt-1 font-medium text-[#0F172A]">
                  {employee.vacation_days_per_year ?? "—"}
                </p>
              </div>

              <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#64748B]">
                  Arbeitstage/Woche
                </p>
                <p className="mt-1 font-medium text-[#0F172A]">
                  {employee.work_days_per_week ?? "—"}
                </p>
              </div>
            </div>
          </div>
        </Section>

        <Section
          title="Stammdaten"
          description="Änderungen an sensiblen Stammdaten nimmt dein Betrieb vor."
        >
          <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
            <p className="text-sm leading-6 text-[#64748B]">
              Deine Stempel-PIN wird aus Sicherheitsgründen nicht im
              Mitarbeiterprofil angezeigt. Bei Fragen oder Änderungen wende
              dich bitte an deinen Administrator.
            </p>
          </div>
        </Section>
      </div>

      <Section
        title="Lohninformationen"
        description="Diese Angaben dienen der Lohnabrechnung und werden vom Betrieb gepflegt."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#64748B]">
              Lohnart
            </p>
            <p className="mt-1 font-medium text-[#0F172A]">
              {formatWageType(employee.wage_type)}
            </p>
          </div>

          <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#64748B]">
              Stundenlohn
            </p>
            <p className="mt-1 font-medium text-[#0F172A]">
              {formatCurrency(employee.hourly_rate)}
            </p>
          </div>

          <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#64748B]">
              Monatsgehalt
            </p>
            <p className="mt-1 font-medium text-[#0F172A]">
              {formatCurrency(employee.monthly_salary)}
            </p>
          </div>

          <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#64748B]">
              DATEV-Nr.
            </p>
            <p className="mt-1 font-medium text-[#0F172A]">
              {employee.datev_personnel_number || "—"}
            </p>
          </div>

          <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 md:col-span-2 xl:col-span-4">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#64748B]">
              Kostenstelle
            </p>
            <p className="mt-1 font-medium text-[#0F172A]">
              {employee.cost_center || "—"}
            </p>
          </div>
        </div>
      </Section>
    </div>
  );
}
