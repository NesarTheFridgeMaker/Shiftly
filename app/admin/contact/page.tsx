"use client";

import { Mail, MessageSquare } from "lucide-react";

import PageHeader from "@/components/ui/PageHeader";
import Section from "@/components/ui/Section";
import Badge from "@/components/ui/Badge";
import SupportForm from "@/components/support/SupportForm";

export default function ContactPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Kontakt & Support"
        description="Sende dein Anliegen direkt an den Dipera-Support."
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_0.55fr]">
        <Section
          title="Kontaktformular"
          description="Beschreibe dein Anliegen. Die Nachricht wird direkt an den Support gesendet."
          action={<Badge variant="primary">Support</Badge>}
        >
          <div className="rounded-3xl border border-[#CBD5E1] bg-[#F8FAFC] p-5 shadow-[0_8px_22px_rgba(15,23,42,0.09)] md:p-6">
            <SupportForm mode="contact" />
          </div>
        </Section>

        <div className="space-y-6">
          <div className="rounded-3xl border border-[#CBD5E1] bg-[#EEF2F6] p-6 shadow-[0_8px_22px_rgba(15,23,42,0.09)]">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#E8F2FB] text-[#2563EB]">
              <Mail className="h-5 w-5" />
            </div>

            <h2 className="mt-4 text-lg font-semibold text-[#0F172A]">
              E-Mail Support
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#64748B]">
              support@dipera.de
            </p>
          </div>

          <div className="rounded-3xl border border-[#CBD5E1] bg-[#EEF2F6] p-6 shadow-[0_8px_22px_rgba(15,23,42,0.09)]">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#E8F2FB] text-[#2563EB]">
              <MessageSquare className="h-5 w-5" />
            </div>

            <h2 className="mt-4 text-lg font-semibold text-[#0F172A]">
              Support-Zeiten
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#64748B]">
              Montag bis Freitag, 09:00–18:00 Uhr
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
