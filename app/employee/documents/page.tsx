"use client";

import { FileText, Lock, Download, CalendarDays } from "lucide-react";

import PageHeader from "@/components/ui/PageHeader";
import Section from "@/components/ui/Section";
import Card from "@/components/ui/Card";
import CardBody from "@/components/ui/CardBody";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";

const documents: {
  id: string;
  title: string;
  period: string;
  type: string;
  status: "available" | "locked";
}[] = [];

export default function EmployeeDocumentsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Lohndokumente"
        description="Hier findest du später deine Lohnabrechnungen und weitere Dokumente deines Betriebs."
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card>
          <CardBody>
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#2563EB]">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-[#64748B]">Dokumente</p>
                <p className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-[#0F172A]">
                  {documents.length}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#DCFCE7] text-[#15803D]">
                <Download className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-[#64748B]">Verfügbar</p>
                <p className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-[#0F172A]">
                  {documents.filter((document) => document.status === "available").length}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F8FAFC] text-[#64748B]">
                <Lock className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-[#64748B]">Datenschutz</p>
                <p className="mt-1 text-sm font-semibold text-[#0F172A]">
                  Nur für dich sichtbar
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      <Section
        title="Meine Dokumente"
        description="Lohnabrechnungen und Dokumente werden hier monatlich bereitgestellt."
      >
        {documents.length === 0 ? (
          <EmptyState
            title="Noch keine Lohndokumente vorhanden"
            description="Sobald dein Betrieb Lohnabrechnungen oder Dokumente bereitstellt, erscheinen sie hier zum Herunterladen."
            icon={<FileText className="h-6 w-6 text-[#2563EB]" />}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {documents.map((document) => (
              <div
                key={document.id}
                className="flex flex-col gap-4 rounded-3xl border border-[#E2E8F0] bg-white p-4 transition hover:-translate-y-0.5 hover:border-[#CBD5E1] hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)] md:flex-row md:items-center md:justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#2563EB]">
                    <FileText className="h-6 w-6" />
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-[#0F172A]">
                        {document.title}
                      </h3>
                      <Badge
                        variant={document.status === "available" ? "success" : "muted"}
                        dot={document.status === "available"}
                      >
                        {document.status === "available" ? "Verfügbar" : "Gesperrt"}
                      </Badge>
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-[#64748B]">
                      <CalendarDays className="h-4 w-4" />
                      <span>{document.period}</span>
                      <span>·</span>
                      <span>{document.type}</span>
                    </div>
                  </div>
                </div>

                <Button
                  variant="secondary"
                  disabled={document.status !== "available"}
                >
                  Herunterladen
                </Button>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Card>
        <CardBody>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-[#0F172A]">
                Hinweis zum Datenschutz
              </h3>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#64748B]">
                Lohndokumente enthalten sensible personenbezogene Daten. Deshalb werden sie nur deinem eigenen Mitarbeiterkonto angezeigt. Später kann dein Betrieb hier PDF-Dokumente sicher bereitstellen.
              </p>
            </div>

            <Badge variant="primary" dot>
              Geplant
            </Badge>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
