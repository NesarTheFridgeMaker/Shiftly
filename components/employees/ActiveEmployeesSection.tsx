"use client";

import type { ReactNode } from "react";

import EmployeeCard, {
  type EmployeeCardEmployee,
} from "@/components/employees/EmployeeCard";
import EmployeeInviteCard from "@/components/employees/EmployeeInviteCard";

type EmployeeInvite = {
  id: string;
  employee_id: string;
  business_id: string;
  invite_code: string;
  email: string | null;
  delivery_method: "email" | "whatsapp";
  auth_user_id: string | null;
  claimed_at: string | null;
  used_at: string | null;
};

export type ActiveEmployee = EmployeeCardEmployee & {
  invite: EmployeeInvite | null;
};

type ActiveEmployeesSectionProps = {
  employees: ActiveEmployee[];

  canEditPayroll: boolean;
  canEditLocationTracking: boolean;

  hasUnsavedMonthlyHours: (employeeId: string) => boolean;
  renderNotes: (employee: ActiveEmployee) => ReactNode;

  onMonthlyHoursChange: (
    employeeId: string,
    value: number,
  ) => void;

  onSaveMonthlyHours: (
    employeeId: string,
    monthlyHours: number,
  ) => void;

  onToggleAccountStatus: (
    employeeId: string,
    currentStatus: string,
  ) => void;

  onOpenLocationTracking: (employee: ActiveEmployee) => void;
  onOpenPayroll: (employee: ActiveEmployee) => void;
  onOpenInvite: (employee: ActiveEmployee) => void;
  onDelete: (employeeId: string) => void;

  // NEU
  expandedEmployeeId: string | null;
  onToggleExpanded: (employeeId: string) => void;
};

export default function ActiveEmployeesSection({
  employees,
  canEditPayroll,
  canEditLocationTracking,
  hasUnsavedMonthlyHours,
  renderNotes,
  onMonthlyHoursChange,
  onSaveMonthlyHours,
  onToggleAccountStatus,
  onOpenLocationTracking,
  onOpenPayroll,
  onOpenInvite,
  onDelete,

  // NEU
  expandedEmployeeId,
  onToggleExpanded,
}: ActiveEmployeesSectionProps) {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 2xl:grid-cols-3">
      {employees.map((employee) => (
        <EmployeeCard
          key={employee.id}
          employee={employee}
          canEditPayroll={canEditPayroll}
          canEditLocationTracking={canEditLocationTracking}
          hasUnsavedMonthlyHours={hasUnsavedMonthlyHours(employee.id)}
          onMonthlyHoursChange={(value) =>
            onMonthlyHoursChange(employee.id, value)
          }
          onSaveMonthlyHours={() =>
            onSaveMonthlyHours(
              employee.id,
              employee.monthly_target_hours,
            )
          }
          onToggleAccountStatus={() =>
            onToggleAccountStatus(
              employee.id,
              employee.account_status,
            )
          }
          onOpenLocationTracking={() =>
            onOpenLocationTracking(employee)
          }
          onOpenPayroll={() => onOpenPayroll(employee)}
          onDelete={() => onDelete(employee.id)}
          inviteContent={
            <EmployeeInviteCard
              invite={employee.invite}
              onOpenInvite={() => onOpenInvite(employee)}
            />
          }
          notesContent={renderNotes(employee)}

          // NEU
          isExpanded={expandedEmployeeId === employee.id}
          onToggleExpanded={() =>
            onToggleExpanded(employee.id)
          }
        />
      ))}
    </div>
  );
}