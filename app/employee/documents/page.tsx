"use client";

import {
  ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  CalendarDays,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Lock,
  Search,
} from "lucide-react";

import PageHeader from "@/components/ui/PageHeader";
import Section from "@/components/ui/Section";
import Card from "@/components/ui/Card";
import CardBody from "@/components/ui/CardBody";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import Input from "@/components/ui/Input";
import { supabase } from "@/lib/supabaseClient";

const STORAGE_BUCKET = "employee-documents";

const EMPLOYEE_DOCUMENT_SELECT =
  "id, business_id, employee_id, uploaded_by, category, title, description, file_name, storage_path, mime_type, size_bytes, created_at";

type DocumentCategory =
  | "payslip"
  | "employment_contract"
  | "certificate"
  | "tax"
  | "warning"
  | "termination"
  | "other";

type EmployeeDocument = {
  id: string;
  business_id: string;
  employee_id: string;
  uploaded_by: string;
  category: DocumentCategory;
  title: string;
  description: string | null;
  file_name: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
};

const CATEGORY_OPTIONS: Array<{
  value: "all" | DocumentCategory;
  label: string;
}> = [
  {
    value: "all",
    label: "Alle Kategorien",
  },
  {
    value: "payslip",
    label: "Lohnabrechnung",
  },
  {
    value: "employment_contract",
    label: "Arbeitsvertrag",
  },
  {
    value: "certificate",
    label: "Bescheinigung",
  },
  {
    value: "tax",
    label: "Steuerdokument",
  },
  {
    value: "warning",
    label: "Abmahnung",
  },
  {
    value: "termination",
    label: "Kündigung",
  },
  {
    value: "other",
    label: "Sonstiges",
  },
];

function formatCategory(category: DocumentCategory) {
  return (
    CATEGORY_OPTIONS.find(
      (option) => option.value === category,
    )?.label ?? "Sonstiges"
  );
}

function getCategoryBadgeClasses(
  category: DocumentCategory,
) {
  switch (category) {
    case "payslip":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "employment_contract":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "certificate":
      return "border-violet-200 bg-violet-50 text-violet-700";

    case "tax":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "warning":
      return "border-orange-200 bg-orange-50 text-orange-700";

    case "termination":
      return "border-red-200 bg-red-50 text-red-700";

    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function highlightSearchMatch(
  value: string,
  searchValue: string,
) {
  const trimmedSearch = searchValue.trim();

  if (!trimmedSearch) {
    return value;
  }

  const escapedSearch = trimmedSearch.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );

  const parts = value.split(
    new RegExp(`(${escapedSearch})`, "gi"),
  );

  return parts.map((part, index) => {
    const isMatch =
      part.toLocaleLowerCase("de-DE") ===
      trimmedSearch.toLocaleLowerCase("de-DE");

    return isMatch ? (
      <mark
        key={`${part}-${index}`}
        className="rounded bg-yellow-200 px-0.5 text-inherit"
      >
        {part}
      </mark>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    );
  });
}

function formatFileSize(sizeBytes: number) {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`;
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function formatFileType(mimeType: string) {
  if (mimeType === "application/pdf") {
    return "PDF";
  }

  if (mimeType === "image/jpeg") {
    return "JPG";
  }

  if (mimeType === "image/png") {
    return "PNG";
  }

  return "Datei";
}

export default function EmployeeDocumentsPage() {
  const [documents, setDocuments] = useState<
    EmployeeDocument[]
  >([]);

  const [isLoading, setIsLoading] = useState(true);
  const [openingDocumentId, setOpeningDocumentId] =
    useState<string | null>(null);
  const [downloadingDocumentId, setDownloadingDocumentId] =
    useState<string | null>(null);

  const [searchValue, setSearchValue] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState<"all" | DocumentCategory>("all");

  const [errorMessage, setErrorMessage] = useState("");

  const loadDocuments = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setErrorMessage(
          "Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.",
        );
        return;
      }

      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("employee_id, role")
          .eq("id", user.id)
          .maybeSingle();

      if (profileError) {
        console.error(
          "EMPLOYEE DOCUMENTS PROFILE LOAD ERROR:",
          profileError,
        );

        setErrorMessage(
          "Dein Mitarbeiterprofil konnte nicht geladen werden.",
        );
        return;
      }

      if (
        profile?.role !== "employee" ||
        !profile.employee_id
      ) {
        setErrorMessage(
          "Deinem Benutzerkonto konnte kein Mitarbeiterprofil zugeordnet werden.",
        );
        return;
      }

      const { data, error: documentsError } =
        await supabase
          .from("employee_documents")
          .select(EMPLOYEE_DOCUMENT_SELECT)
          .eq("employee_id", profile.employee_id)
          .order("created_at", {
            ascending: false,
          });

      if (documentsError) {
        console.error(
          "EMPLOYEE DOCUMENTS LOAD ERROR:",
          documentsError,
        );

        setErrorMessage(
          "Deine Dokumente konnten nicht geladen werden.",
        );
        return;
      }

      setDocuments(
        (data ?? []) as unknown as EmployeeDocument[],
      );
    } catch (error) {
      console.error(
        "EMPLOYEE DOCUMENTS UNEXPECTED LOAD ERROR:",
        error,
      );

      setErrorMessage(
        "Beim Laden deiner Dokumente ist ein unerwarteter Fehler aufgetreten.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  const filteredDocuments = useMemo(() => {
    const normalizedSearch = searchValue
      .trim()
      .toLocaleLowerCase("de-DE");

    return documents.filter((document) => {
      const matchesCategory =
        selectedCategory === "all" ||
        document.category === selectedCategory;

      const searchableText = [
        document.title,
        document.description ?? "",
        document.file_name,
        formatCategory(document.category),
        formatFileType(document.mime_type),
      ]
        .join(" ")
        .toLocaleLowerCase("de-DE");

      const matchesSearch =
        !normalizedSearch ||
        searchableText.includes(normalizedSearch);

      return matchesCategory && matchesSearch;
    });
  }, [documents, searchValue, selectedCategory]);

  const payslipCount = documents.filter(
    (document) => document.category === "payslip",
  ).length;

  async function createDocumentUrl(
    document: EmployeeDocument,
    download: boolean,
  ) {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(
        document.storage_path,
        60,
        download
          ? {
              download: document.file_name,
            }
          : undefined,
      );

    if (error || !data?.signedUrl) {
      console.error(
        "EMPLOYEE DOCUMENT SIGNED URL ERROR:",
        error,
      );

      throw new Error(
        "Für das Dokument konnte kein sicherer Link erstellt werden.",
      );
    }

    return data.signedUrl;
  }

  async function handleOpenDocument(
    document: EmployeeDocument,
  ) {
    setErrorMessage("");
    setOpeningDocumentId(document.id);

    try {
      const signedUrl = await createDocumentUrl(
        document,
        false,
      );

      window.open(
        signedUrl,
        "_blank",
        "noopener,noreferrer",
      );
    } catch (error) {
      console.error(
        "EMPLOYEE DOCUMENT OPEN ERROR:",
        error,
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Das Dokument konnte nicht geöffnet werden.",
      );
    } finally {
      setOpeningDocumentId(null);
    }
  }

  async function handleDownloadDocument(
    document: EmployeeDocument,
  ) {
    setErrorMessage("");
    setDownloadingDocumentId(document.id);

    try {
      const signedUrl = await createDocumentUrl(
        document,
        true,
      );

      window.location.assign(signedUrl);
    } catch (error) {
      console.error(
        "EMPLOYEE DOCUMENT DOWNLOAD ERROR:",
        error,
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Das Dokument konnte nicht heruntergeladen werden.",
      );
    } finally {
      setDownloadingDocumentId(null);
    }
  }

  function handleSearchChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    setSearchValue(event.target.value);
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dokumente"
        description="Hier findest du die Dokumente, die dein Betrieb für dich bereitgestellt hat."
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card>
          <CardBody>
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#2563EB]">
                <FileText className="h-6 w-6" />
              </div>

              <div>
                <p className="text-sm text-[#64748B]">
                  Dokumente
                </p>

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
                <p className="text-sm text-[#64748B]">
                  Lohnabrechnungen
                </p>

                <p className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-[#0F172A]">
                  {payslipCount}
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
                <p className="text-sm text-[#64748B]">
                  Datenschutz
                </p>

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
        description="Deine zuletzt bereitgestellten Dokumente erscheinen zuerst."
      >
        {errorMessage ? (
          <div
            role="alert"
            className="mb-5 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm leading-6 text-[#B91C1C]"
          >
            {errorMessage}
          </div>
        ) : null}

        {isLoading ? (
          <Card>
            <CardBody>
              <div className="flex items-center justify-center gap-3 py-10 text-sm text-[#64748B]">
                <Loader2 className="h-5 w-5 animate-spin" />
                Dokumente werden geladen
              </div>
            </CardBody>
          </Card>
        ) : documents.length === 0 ? (
          <EmptyState
            title="Noch keine Dokumente vorhanden"
            description="Sobald dein Betrieb ein Dokument für dich bereitstellt, erscheint es hier."
            icon={
              <FileText className="h-6 w-6 text-[#2563EB]" />
            }
          />
        ) : (
          <div className="space-y-5">
            <Card>
              <CardBody>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_240px]">
                  <div className="relative">
                    <Search
                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]"
                      aria-hidden="true"
                    />

                    <Input
                      value={searchValue}
                      onChange={handleSearchChange}
                      placeholder="Dokumente durchsuchen"
                      className="pl-10"
                    />
                  </div>

                  <select
                    value={selectedCategory}
                    onChange={(event) =>
                      setSelectedCategory(
                        event.target.value as
                          | "all"
                          | DocumentCategory,
                      )
                    }
                    className="h-11 w-full rounded-xl border border-[#CBD5E1] bg-white px-3 text-sm text-[#0F172A] outline-none transition focus:border-[#005CA8] focus:ring-4 focus:ring-blue-100"
                  >
                    {CATEGORY_OPTIONS.map((option) => (
                      <option
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </CardBody>
            </Card>

            {filteredDocuments.length === 0 ? (
              <EmptyState
                title="Keine passenden Dokumente gefunden"
                description="Passe die Suche oder den ausgewählten Filter an."
                icon={
                  <Search className="h-6 w-6 text-[#2563EB]" />
                }
              />
            ) : (
              <div className="flex flex-col gap-3">
                {filteredDocuments.map((document) => {
                  const isOpening =
                    openingDocumentId === document.id;

                  const isDownloading =
                    downloadingDocumentId === document.id;

                  return (
                    <article
                      key={document.id}
                      className="rounded-3xl border border-[#E2E8F0] bg-white p-4 transition hover:-translate-y-0.5 hover:border-[#CBD5E1] hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)]"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex min-w-0 items-start gap-4">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#2563EB]">
                            <FileText className="h-6 w-6" />
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                            <h3 className="break-words font-semibold text-[#0F172A]">
                              {highlightSearchMatch(
                                document.title,
                                searchValue,
                              )}
                            </h3>

                            <span
                              className={[
                                "inline-flex items-center rounded-full border px-2.5 py-1",
                                "text-xs font-semibold",
                                getCategoryBadgeClasses(document.category),
                              ].join(" ")}
                            >
                              {formatCategory(document.category)}
                            </span>
                          </div>

                          <p
                            className="mt-1 truncate text-xs text-[#94A3B8]"
                            title={document.file_name}
                          >
                            {document.file_name}
                          </p>

                            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[#64748B]">
  <CalendarDays className="h-4 w-4" />

  <span>
    Hochgeladen am{" "}
    {formatDate(document.created_at)}
  </span>

  <span aria-hidden="true">·</span>

  <span>
    {formatFileType(document.mime_type)}
  </span>

  <span aria-hidden="true">·</span>

  <span>
    {formatFileSize(document.size_bytes)}
  </span>
</div>

                            {document.description ? (
                              <p className="mt-3 max-w-3xl text-sm leading-6 text-[#64748B]">
                                {document.description}
                              </p>
                            ) : null}
                          </div>
                        </div>

                        <div className="grid shrink-0 grid-cols-1 gap-2 sm:grid-cols-2">
                          <Button
                            variant="secondary"
                            type="button"
                            disabled={
                              isOpening || isDownloading
                            }
                            onClick={() =>
                              void handleOpenDocument(
                                document,
                              )
                            }
                          >
                            {isOpening ? (
                              <span className="inline-flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Wird geöffnet
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-2">
                                <ExternalLink className="h-4 w-4" />
                                Öffnen
                              </span>
                            )}
                          </Button>

                          <Button
                            variant="primary"
                            type="button"
                            disabled={
                              isOpening || isDownloading
                            }
                            onClick={() =>
                              void handleDownloadDocument(
                                document,
                              )
                            }
                          >
                            {isDownloading ? (
                              <span className="inline-flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Download
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-2">
                                <Download className="h-4 w-4" />
                                Herunterladen
                              </span>
                            )}
                          </Button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
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
                Die hier bereitgestellten Dokumente können
                sensible personenbezogene Daten enthalten. Sie
                werden ausschließlich deinem eigenen
                Mitarbeiterkonto angezeigt und über zeitlich
                begrenzte, geschützte Links geöffnet.
              </p>
            </div>

            <Badge variant="primary" dot>
              Geschützt
            </Badge>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}