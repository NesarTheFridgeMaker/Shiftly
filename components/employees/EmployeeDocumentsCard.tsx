"use client";

import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { supabase } from "@/lib/supabaseClient";

const STORAGE_BUCKET = "employee-documents";
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);

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

type EmployeeDocumentsCardProps = {
  employeeId: string;
};

const CATEGORY_OPTIONS: Array<{
  value: DocumentCategory;
  label: string;
}> = [
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

function sanitizeFileName(fileName: string) {
  const dotIndex = fileName.lastIndexOf(".");

  const extension =
    dotIndex >= 0
      ? fileName.slice(dotIndex).toLowerCase()
      : "";

  const baseName =
    dotIndex >= 0
      ? fileName.slice(0, dotIndex)
      : fileName;

  const sanitizedBaseName = baseName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  return `${sanitizedBaseName || "dokument"}${extension}`;
}

export default function EmployeeDocumentsCard({
  employeeId,
}: EmployeeDocumentsCardProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [documents, setDocuments] = useState<
    EmployeeDocument[]
  >([]);

  const [businessId, setBusinessId] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");

  const [title, setTitle] = useState("");
  const [category, setCategory] =
    useState<DocumentCategory>("payslip");
  const [description, setDescription] = useState("");
  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingDocumentId, setDeletingDocumentId] =
    useState<string | null>(null);
  const [openingDocumentId, setOpeningDocumentId] =
    useState<string | null>(null);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [isUploadExpanded, setIsUploadExpanded] =
  useState(false);

const [isDocumentListExpanded, setIsDocumentListExpanded] =
  useState(false);

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
          "Die Dokumente konnten nicht geladen werden, weil keine gültige Sitzung besteht.",
        );
        return;
      }

      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("business_id, role")
          .eq("id", user.id)
          .maybeSingle();

      if (profileError) {
        console.error(
          "EMPLOYEE DOCUMENTS PROFILE LOAD ERROR:",
          profileError,
        );

        setErrorMessage(
          "Das Benutzerprofil konnte nicht geladen werden.",
        );
        return;
      }

      if (
        !profile?.business_id ||
        !["owner", "admin"].includes(profile.role)
      ) {
        setErrorMessage(
          "Du besitzt keine Berechtigung zur Verwaltung dieser Dokumente.",
        );
        return;
      }

      setBusinessId(profile.business_id);
      setCurrentUserId(user.id);

      const { data, error: documentsError } =
        await supabase
          .from("employee_documents")
          .select(EMPLOYEE_DOCUMENT_SELECT)
          .eq("employee_id", employeeId)
          .order("created_at", {
            ascending: false,
          });

      if (documentsError) {
        console.error(
          "EMPLOYEE DOCUMENTS LOAD ERROR:",
          documentsError,
        );

        setErrorMessage(
          "Die Dokumente konnten nicht geladen werden.",
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
        "Beim Laden der Dokumente ist ein unerwarteter Fehler aufgetreten.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  function resetMessages() {
    setErrorMessage("");
    setSuccessMessage("");
  }

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    resetMessages();

    const file = event.target.files?.[0] ?? null;

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      setSelectedFile(null);
      event.target.value = "";

      setErrorMessage(
        "Erlaubt sind ausschließlich PDF-, JPG- und PNG-Dateien.",
      );
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setSelectedFile(null);
      event.target.value = "";

      setErrorMessage(
        "Die Datei darf maximal 10 MB groß sein.",
      );
      return;
    }

    setSelectedFile(file);

    if (!title.trim()) {
      const titleWithoutExtension = file.name.replace(
        /\.[^/.]+$/,
        "",
      );

      setTitle(titleWithoutExtension);
    }
  }

  async function handleUpload(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (isUploading) {
      return;
    }

    resetMessages();

    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    if (!businessId || !currentUserId) {
      setErrorMessage(
        "Der Betrieb konnte nicht ermittelt werden.",
      );
      return;
    }

    if (!trimmedTitle) {
      setErrorMessage(
        "Bitte gib einen Titel für das Dokument ein.",
      );
      return;
    }

    if (!selectedFile) {
      setErrorMessage(
        "Bitte wähle eine Datei aus.",
      );
      return;
    }

    if (!ALLOWED_MIME_TYPES.has(selectedFile.type)) {
      setErrorMessage(
        "Erlaubt sind ausschließlich PDF-, JPG- und PNG-Dateien.",
      );
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      setErrorMessage(
        "Die Datei darf maximal 10 MB groß sein.",
      );
      return;
    }

    setIsUploading(true);

    const documentId = crypto.randomUUID();
    const safeFileName = sanitizeFileName(
      selectedFile.name,
    );

    const storagePath = [
      businessId,
      employeeId,
      documentId,
      safeFileName,
    ].join("/");

    let fileWasUploaded = false;

    try {
      const { error: uploadError } =
        await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(storagePath, selectedFile, {
            cacheControl: "3600",
            contentType: selectedFile.type,
            upsert: false,
          });

      if (uploadError) {
        console.error(
          "EMPLOYEE DOCUMENT STORAGE UPLOAD ERROR:",
          uploadError,
        );

        setErrorMessage(
          uploadError.message ||
            "Die Datei konnte nicht hochgeladen werden.",
        );
        return;
      }

      fileWasUploaded = true;

      const { data: insertedDocument, error: insertError } =
        await supabase
          .from("employee_documents")
          .insert({
            id: documentId,
            business_id: businessId,
            employee_id: employeeId,
            uploaded_by: currentUserId,
            category,
            title: trimmedTitle,
            description:
              trimmedDescription || null,
            file_name: selectedFile.name,
            storage_path: storagePath,
            mime_type: selectedFile.type,
            size_bytes: selectedFile.size,
          })
          .select(EMPLOYEE_DOCUMENT_SELECT)
          .single();

      if (insertError) {
        console.error(
          "EMPLOYEE DOCUMENT DATABASE INSERT ERROR:",
          insertError,
        );

        await supabase.storage
          .from(STORAGE_BUCKET)
          .remove([storagePath]);

        fileWasUploaded = false;

        setErrorMessage(
          insertError.message ||
            "Die Dokumentinformationen konnten nicht gespeichert werden.",
        );
        return;
      }

      setDocuments((currentDocuments) => [
        insertedDocument as unknown as EmployeeDocument,
        ...currentDocuments,
      ]);

      setTitle("");
      setCategory("payslip");
      setDescription("");
      setSelectedFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setSuccessMessage(
      "Das Dokument wurde erfolgreich hochgeladen.",
      );

      setIsUploadExpanded(false);
      setIsDocumentListExpanded(true);
    } catch (error) {
      console.error(
        "EMPLOYEE DOCUMENT UPLOAD ERROR:",
        error,
      );

      if (fileWasUploaded) {
        await supabase.storage
          .from(STORAGE_BUCKET)
          .remove([storagePath]);
      }

      setErrorMessage(
        "Beim Hochladen ist ein unerwarteter Fehler aufgetreten.",
      );
    } finally {
      setIsUploading(false);
    }
  }

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
    resetMessages();
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
    resetMessages();
    setOpeningDocumentId(document.id);

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
      setOpeningDocumentId(null);
    }
  }

  async function handleDeleteDocument(
    document: EmployeeDocument,
  ) {
    const confirmed = window.confirm(
      `Möchtest du „${document.title}“ wirklich dauerhaft löschen?`,
    );

    if (!confirmed) {
      return;
    }

    resetMessages();
    setDeletingDocumentId(document.id);

    try {
      const { error: storageError } =
        await supabase.storage
          .from(STORAGE_BUCKET)
          .remove([document.storage_path]);

      if (storageError) {
        console.error(
          "EMPLOYEE DOCUMENT STORAGE DELETE ERROR:",
          storageError,
        );

        setErrorMessage(
          storageError.message ||
            "Die Datei konnte nicht aus dem Speicher gelöscht werden.",
        );
        return;
      }

      const { error: databaseError } = await supabase
        .from("employee_documents")
        .delete()
        .eq("id", document.id);

      if (databaseError) {
        console.error(
          "EMPLOYEE DOCUMENT DATABASE DELETE ERROR:",
          databaseError,
        );

        setErrorMessage(
          "Die Datei wurde gelöscht, aber der Datenbankeintrag konnte nicht entfernt werden.",
        );
        return;
      }

      setDocuments((currentDocuments) =>
        currentDocuments.filter(
          (currentDocument) =>
            currentDocument.id !== document.id,
        ),
      );

      setSuccessMessage(
        "Das Dokument wurde gelöscht.",
      );
    } catch (error) {
      console.error(
        "EMPLOYEE DOCUMENT DELETE ERROR:",
        error,
      );

      setErrorMessage(
        "Beim Löschen des Dokuments ist ein unerwarteter Fehler aufgetreten.",
      );
    } finally {
      setDeletingDocumentId(null);
    }
  }

    return (
    <section className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h4 className="flex items-center gap-2 text-sm font-bold text-[#0F172A]">
            <FileText
              className="h-4 w-4 text-[#005CA8]"
              aria-hidden="true"
            />
            Dokumente
          </h4>

          <p className="mt-1 text-xs leading-5 text-[#64748B]">
            Private Dokumente für diesen Mitarbeiter hochladen
            und verwalten.
          </p>
        </div>

        <span className="w-fit rounded-full bg-[#E8F2FB] px-2.5 py-1 text-xs font-semibold text-[#005CA8]">
          {documents.length}{" "}
          {documents.length === 1 ? "Dokument" : "Dokumente"}
        </span>
      </div>

      <button
        type="button"
        onClick={() =>
          setIsUploadExpanded((current) => !current)
        }
        aria-expanded={isUploadExpanded}
        className="mt-4 flex h-11 w-full items-center justify-between rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] px-4 text-sm font-semibold text-[#334155] transition hover:border-[#93C5FD] hover:bg-[#EFF6FF] hover:text-[#005CA8]"
      >
        <span className="inline-flex items-center gap-2">
          <Upload className="h-4 w-4" />
          Dokument hochladen
        </span>

        {isUploadExpanded ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>

      {isUploadExpanded ? (
        <form
          onSubmit={handleUpload}
          className="mt-4 space-y-3"
        >
          <div>
            <label
              htmlFor={`document-file-${employeeId}`}
              className="mb-1.5 block text-xs font-semibold text-[#334155]"
            >
              Datei
            </label>

            <input
              ref={fileInputRef}
              id={`document-file-${employeeId}`}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              disabled={isUploading}
              onChange={handleFileChange}
              className="block w-full cursor-pointer rounded-xl border border-[#CBD5E1] bg-white text-xs text-[#475569] file:mr-3 file:border-0 file:bg-[#E8F2FB] file:px-3 file:py-3 file:font-semibold file:text-[#005CA8] hover:file:bg-[#D9EAF8] disabled:cursor-not-allowed disabled:opacity-60"
            />

            <p className="mt-1.5 text-[11px] text-[#94A3B8]">
              PDF, JPG oder PNG · maximal 10 MB
            </p>
          </div>

          <div>
            <label
              htmlFor={`document-title-${employeeId}`}
              className="mb-1.5 block text-xs font-semibold text-[#334155]"
            >
              Titel
            </label>

            <Input
              id={`document-title-${employeeId}`}
              value={title}
              disabled={isUploading}
              placeholder="z. B. Lohnabrechnung Juli 2026"
              onChange={(event) => {
                setTitle(event.target.value);
                resetMessages();
              }}
            />
          </div>

          <div>
            <label
              htmlFor={`document-category-${employeeId}`}
              className="mb-1.5 block text-xs font-semibold text-[#334155]"
            >
              Kategorie
            </label>

            <select
              id={`document-category-${employeeId}`}
              value={category}
              disabled={isUploading}
              onChange={(event) =>
                setCategory(
                  event.target.value as DocumentCategory,
                )
              }
              className="h-11 w-full rounded-xl border border-[#CBD5E1] bg-white px-3 text-sm text-[#0F172A] outline-none transition focus:border-[#005CA8] focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-[#F8FAFC]"
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

          <div>
            <label
              htmlFor={`document-description-${employeeId}`}
              className="mb-1.5 block text-xs font-semibold text-[#334155]"
            >
              Beschreibung{" "}
              <span className="font-normal text-[#94A3B8]">
                optional
              </span>
            </label>

            <textarea
              id={`document-description-${employeeId}`}
              value={description}
              disabled={isUploading}
              rows={3}
              maxLength={500}
              placeholder="Zusätzliche Information zum Dokument"
              onChange={(event) => {
                setDescription(event.target.value);
                resetMessages();
              }}
              className="w-full resize-none rounded-xl border border-[#CBD5E1] bg-white px-3 py-2.5 text-sm text-[#0F172A] outline-none transition placeholder:text-[#94A3B8] focus:border-[#005CA8] focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-[#F8FAFC]"
            />
          </div>

          {errorMessage ? (
            <div
              role="alert"
              className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3 py-2.5 text-xs leading-5 text-[#B91C1C]"
            >
              {errorMessage}
            </div>
          ) : null}

          {successMessage ? (
            <div
              role="status"
              className="rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] px-3 py-2.5 text-xs leading-5 text-[#15803D]"
            >
              {successMessage}
            </div>
          ) : null}

          <Button
            variant="primary"
            type="submit"
            fullWidth
            disabled={
              isUploading ||
              !selectedFile ||
              !title.trim()
            }
          >
            {isUploading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Dokument wird hochgeladen
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Dokument hochladen
              </span>
            )}
          </Button>
        </form>
      ) : null}

      <div className="mt-4">
        <button
          type="button"
          onClick={() =>
            setIsDocumentListExpanded(
              (current) => !current,
            )
          }
          aria-expanded={isDocumentListExpanded}
          className="flex h-11 w-full items-center justify-between rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] px-4 text-sm font-semibold text-[#334155] transition hover:border-[#93C5FD] hover:bg-[#EFF6FF] hover:text-[#005CA8]"
        >
          <span className="inline-flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Vorhandene Dokumente ({documents.length})
          </span>

          {isDocumentListExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>

        {isDocumentListExpanded ? (
          <div className="mt-3">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-7 text-sm text-[#64748B]">
                <Loader2 className="h-4 w-4 animate-spin" />
                Dokumente werden geladen
              </div>
            ) : documents.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-4 py-6 text-center">
                <FileText className="mx-auto h-6 w-6 text-[#94A3B8]" />

                <p className="mt-2 text-sm font-semibold text-[#475569]">
                  Noch keine Dokumente
                </p>

                <p className="mt-1 text-xs text-[#94A3B8]">
                  Hochgeladene Dokumente erscheinen hier.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {documents.map((document) => {
                  const isDeleting =
                    deletingDocumentId === document.id;

                  const isOpening =
                    openingDocumentId === document.id;

                  return (
                    <article
                      key={document.id}
                      className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#E8F2FB] text-[#005CA8]">
                          <FileText className="h-4 w-4" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-[#0F172A]">
                            {document.title}
                          </p>

                          <p className="mt-1 text-[11px] leading-4 text-[#64748B]">
                            {formatCategory(
                              document.category,
                            )}
                            {" · "}
                            {formatFileType(
                              document.mime_type,
                            )}
                            {" · "}
                            {formatFileSize(
                              document.size_bytes,
                            )}
                            {" · "}
                            {formatDate(
                              document.created_at,
                            )}
                          </p>

                          {document.description ? (
                            <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#64748B]">
                              {document.description}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                        <button
                          type="button"
                          disabled={isOpening || isDeleting}
                          onClick={() =>
                            void handleOpenDocument(document)
                          }
                          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[#CBD5E1] bg-white px-2 text-xs font-semibold text-[#334155] transition hover:border-[#93C5FD] hover:text-[#005CA8] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isOpening ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <ExternalLink className="h-3.5 w-3.5" />
                          )}
                          Öffnen
                        </button>

                        <button
                          type="button"
                          disabled={isOpening || isDeleting}
                          onClick={() =>
                            void handleDownloadDocument(
                              document,
                            )
                          }
                          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[#CBD5E1] bg-white px-2 text-xs font-semibold text-[#334155] transition hover:border-[#93C5FD] hover:text-[#005CA8] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download
                        </button>

                        <button
                          type="button"
                          disabled={isDeleting || isOpening}
                          onClick={() =>
                            void handleDeleteDocument(document)
                          }
                          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[#FECACA] bg-white px-2 text-xs font-semibold text-[#B91C1C] transition hover:bg-[#FEF2F2] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isDeleting ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                          Löschen
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}