import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";
import {
  getApiErrorMessage,
  submissionsApi,
  tagsApi,
  type ResourceTag,
  type SubmissionItem,
  type SubmissionStatus,
} from "@/api";
import { useAuth } from "@/store/auth";
import { SEO } from "../components/SEO";
import { uploadToOss, UploadCancelledError } from "@/lib/directUpload";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../components/ui/alert-dialog";

type Tab = "software" | "documents";

function humanSize(bytes: number): string {
  if (!bytes || bytes <= 0) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function humanRate(bytesPerSec: number): string {
  if (!bytesPerSec || bytesPerSec <= 0) return "-";
  return `${humanSize(bytesPerSec)}/s`;
}

function formatDate(iso?: string): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function StatusChip({ status, reason }: { status: SubmissionStatus; reason?: string | null }) {
  const { t } = useTranslation("submissions");
  const cls =
    status === "pending"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : status === "published"
        ? "bg-green-50 text-green-700 border-green-200"
        : "bg-red-50 text-red-600 border-red-200";
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${cls}`}
    >
      {status === "published" ? <CheckCircle2 className="h-3 w-3" /> : null}
      {status === "rejected" ? <AlertTriangle className="h-3 w-3" /> : null}
      {status === "pending" ? <Clock className="h-3 w-3" /> : null}
      {t(`status.${status}`)}
      {status === "rejected" && reason ? (
        <span aria-hidden className="hidden sm:inline">
          · {reason}
        </span>
      ) : null}
    </span>
  );
}

// 报错时保留后端 detail（如 403 的会员限制提示），让用户看到真实原因。
function requestError(err: unknown, fallback: string): string {
  return getApiErrorMessage(err, fallback);
}

function useTagOptions(type: string) {
  const [tags, setTags] = useState<ResourceTag[]>([]);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    tagsApi
      .list(type)
      .then((v) => {
        if (alive) setTags((Array.isArray(v) ? v : []).filter((tg) => tg.is_active));
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [type]);
  return { tags, failed };
}

function BrandCategoryFields({
  brandType,
  categoryType,
  brand,
  category,
  onBrand,
  onCategory,
  labelPrefix,
}: {
  brandType: string;
  categoryType: string;
  brand: string;
  category: string;
  onBrand: (v: string) => void;
  onCategory: (v: string) => void;
  labelPrefix: string;
}) {
  const { t } = useTranslation("submissions");
  const brands = useTagOptions(brandType);
  const categories = useTagOptions(categoryType);
  return (
    <>
      <div className="space-y-2">
        <label
          htmlFor={`${labelPrefix}-brand`}
          className="block text-left px-1 text-sm font-medium text-gray-700"
        >
          {t("upload.brand")}
        </label>
        <Select
          id={`${labelPrefix}-brand`}
          value={brand}
          onChange={(e) => onBrand(e.target.value)}
          aria-label={t("upload.brand")}
        >
          <option value="">{t("upload.brandPlaceholder")}</option>
          {brands.tags.map((tg) => (
            <option key={tg.value} value={tg.value}>
              {tg.label_zh}
            </option>
          ))}
        </Select>
        {brands.failed && (
          <p className="px-1 text-xs text-red-600">{t("upload.errors.loadTags")}</p>
        )}
      </div>
      <div className="space-y-2">
        <label
          htmlFor={`${labelPrefix}-category`}
          className="block text-left px-1 text-sm font-medium text-gray-700"
        >
          {t("upload.category")}
        </label>
        <Select
          id={`${labelPrefix}-category`}
          value={category}
          onChange={(e) => onCategory(e.target.value)}
          aria-label={t("upload.category")}
        >
          <option value="">{t("upload.categoryPlaceholder")}</option>
          {categories.tags.map((tg) => (
            <option key={tg.value} value={tg.value}>
              {tg.label_zh}
            </option>
          ))}
        </Select>
        {categories.failed && (
          <p className="px-1 text-xs text-red-600">{t("upload.errors.loadTags")}</p>
        )}
      </div>
    </>
  );
}

/** 进度条 + 速率，软件/文档上传共用。 */
function ProgressBlock({
  uploading,
  finalizing,
  loaded,
  total,
  rate,
}: {
  uploading: boolean;
  finalizing: boolean;
  loaded: number;
  total: number;
  rate: number;
}) {
  const { t } = useTranslation("submissions");
  if (!uploading && !finalizing) return null;
  const pct = total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 0;
  return (
    <div className="space-y-1">
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full bg-sky-700 transition-all duration-150 ${finalizing ? "animate-pulse" : ""}`}
          style={{ width: `${finalizing ? 100 : pct}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-gray-500">
        {uploading ? (
          <>
            <span>
              {humanSize(loaded)} / {humanSize(total)}（{pct}%）
            </span>
            <span>{humanRate(rate)}</span>
          </>
        ) : (
          <span>{t("upload.progressMerged")}</span>
        )}
      </div>
    </div>
  );
}

function FilePicker({
  id,
  accept,
  file,
  onFile,
  label,
  chooseLabel,
}: {
  id: string;
  accept: string;
  file: File | null;
  onFile: (f: File | null) => void;
  label: string;
  chooseLabel: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-left px-1 text-sm font-medium text-gray-700">
        {label}
      </label>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex w-full items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2.5 text-left text-sm text-gray-700 transition-colors hover:border-sky-400 hover:bg-sky-50/50"
      >
        <Upload className="h-4 w-4 shrink-0 text-gray-400" />
        <span className={`truncate ${file ? "text-gray-900" : "text-gray-500"}`}>
          {file ? `${file.name}（${humanSize(file.size)}）` : chooseLabel}
        </span>
      </button>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => {
          onFile(e.target.files?.[0] ?? null);
          // Allow picking the same file again after a completed upload.
          e.target.value = "";
        }}
      />
    </div>
  );
}

const SW_ACCEPT = ".zip,.exe,.msi,.rar,.7z,.pkg,.package";

function SoftwareUploadForm({ onUploaded }: { onUploaded: () => void }) {
  const { t } = useTranslation("submissions");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [version, setVersion] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loaded, setLoaded] = useState(0);
  const [total, setTotal] = useState(0);
  const [rate, setRate] = useState(0);
  const [phase, setPhase] = useState<"idle" | "uploading" | "finalizing">("idle");
  const abortRef = useRef<AbortController | null>(null);
  const sampleRef = useRef<{ loaded: number; t: number } | null>(null);

  const busy = phase === "uploading" || phase === "finalizing";

  function reportProgress(l: number, tt: number) {
    setLoaded(l);
    setTotal(tt);
    const now = Date.now();
    const prev = sampleRef.current;
    if (!prev) {
      sampleRef.current = { loaded: l, t: now };
      return;
    }
    const dt = now - prev.t;
    if (dt >= 800) {
      setRate((Math.max(0, l - prev.loaded) * 1000) / dt);
      sampleRef.current = { loaded: l, t: now };
    }
  }

  function resetProgress() {
    setLoaded(0);
    setTotal(0);
    setRate(0);
    sampleRef.current = null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");
    const errs: Record<string, string> = {};
    if (!brand) errs.brand = t("upload.errors.brand");
    if (!category) errs.category = t("upload.errors.category");
    if (!version.trim()) errs.version = t("upload.errors.version");
    if (!file) errs.file = t("upload.errors.file");
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    resetProgress();
    setTotal(file!.size);
    sampleRef.current = { loaded: 0, t: Date.now() };
    setPhase("uploading");
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const init = await submissionsApi.uploadSoftwareInit({
        filename: file!.name,
        brand,
        category,
        version: version.trim(),
        description: description.trim() || undefined,
        content_type: file!.type || "application/octet-stream",
        size: file!.size,
      });
      let parts: Awaited<ReturnType<typeof uploadToOss>> = null;
      if (init.mode === "sync") {
        const formData = new FormData();
        formData.append("file", file!);
        formData.append("brand", brand);
        formData.append("category", category);
        formData.append("version", version.trim());
        formData.append("description", description.trim());
        await submissionsApi.uploadSoftware(formData, (e) => {
          if (e.total) reportProgress(e.loaded, e.total);
        });
      } else {
        parts = await uploadToOss(file!, init, reportProgress, controller.signal);
      }
      setPhase("finalizing");
      setRate(0);
      if (init.mode !== "sync" && init.token) {
        await submissionsApi.uploadSoftwareComplete({
          token: init.token,
          parts: parts ?? undefined,
        });
      }
      setSuccessMsg(t("upload.success"));
      setPhase("idle");
      resetProgress();
      setFile(null);
      setVersion("");
      setDescription("");
      onUploaded();
    } catch (err) {
      if (err instanceof UploadCancelledError) {
        setPhase("idle");
        resetProgress();
        return;
      }
      setPhase("idle");
      resetProgress();
      setErrorMsg(requestError(err, t("upload.errors.failed")));
    } finally {
      abortRef.current = null;
    }
  }

  return (
    <Card className="border-sky-100 shadow-sm">
      <CardHeader>
        <CardTitle>{t("upload.softwareTitle")}</CardTitle>
        <CardDescription>{t("upload.softwareDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <BrandCategoryFields
            brandType="sw_brand"
            categoryType="sw_category"
            brand={brand}
            category={category}
            onBrand={setBrand}
            onCategory={setCategory}
            labelPrefix="sw-upload"
          />
          <div className="space-y-2">
            <label
              htmlFor="sw-upload-version"
              className="block text-left px-1 text-sm font-medium text-gray-700"
            >
              {t("upload.version")}
            </label>
            <Input
              id="sw-upload-version"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder={t("upload.versionPlaceholder")}
            />
            {fieldErrors.version && (
              <p className="px-1 text-xs text-red-600">{fieldErrors.version}</p>
            )}
          </div>
          <div className="space-y-2">
            <label
              htmlFor="sw-upload-desc"
              className="block text-left px-1 text-sm font-medium text-gray-700"
            >
              {t("upload.description")}
            </label>
            <Input
              id="sw-upload-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("upload.descriptionPlaceholder")}
            />
          </div>
          <FilePicker
            id="sw-upload-file"
            accept={SW_ACCEPT}
            file={file}
            onFile={(f) => {
              setFile(f);
              setFieldErrors((prev) => ({ ...prev, file: "" }));
            }}
            label={t("upload.softwareFile")}
            chooseLabel={t("upload.chooseSoftwareFile")}
          />
          {fieldErrors.file && <p className="px-1 text-xs text-red-600">{fieldErrors.file}</p>}

          <ProgressBlock
            uploading={phase === "uploading"}
            finalizing={phase === "finalizing"}
            loaded={loaded}
            total={total}
            rate={rate}
          />
          {successMsg && (
            <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{successMsg}</p>
          )}
          {errorMsg && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errorMsg}</p>
          )}

          <div className="flex flex-col gap-3 pt-1 sm:flex-row">
            <Button
              type="submit"
              disabled={busy || !brand || !category || !version.trim() || !file}
              className="w-full bg-sky-700 hover:bg-[#085A90] sm:w-auto"
            >
              {busy ? <Loader2 className="animate-spin" /> : null}
              {phase === "uploading"
                ? t("upload.uploading")
                : phase === "finalizing"
                  ? t("upload.finalizing")
                  : t("upload.submit")}
            </Button>
            {busy ? (
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => {
                  // Aborting in-flight PUTs surfaces as UploadCancelledError,
                  // which returns the form to idle without an error banner.
                  abortRef.current?.abort();
                }}
              >
                {t("upload.cancelUpload")}
              </Button>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function DocumentUploadForm({ onUploaded }: { onUploaded: () => void }) {
  const { t } = useTranslation("submissions");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [series, setSeries] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loaded, setLoaded] = useState(0);
  const [total, setTotal] = useState(0);
  const [rate, setRate] = useState(0);
  const [uploading, setUploading] = useState(false);
  const sampleRef = useRef<{ loaded: number; t: number } | null>(null);

  // 系列级联：品牌+分类选定后才拉取系列标签（后端会校验三者组合）。
  const [seriesTags, setSeriesTags] = useState<ResourceTag[]>([]);
  useEffect(() => {
    if (!category) {
      setSeriesTags([]);
      return;
    }
    let alive = true;
    tagsApi
      .list("doc_series", category, brand || undefined)
      .then((v) => {
        if (alive) setSeriesTags((Array.isArray(v) ? v : []).filter((tg) => tg.is_active));
      })
      .catch(() => {
        if (alive) setSeriesTags([]);
      });
    return () => {
      alive = false;
    };
  }, [brand, category]);

  function reportProgress(l: number, tt: number) {
    setLoaded(l);
    setTotal(tt);
    const now = Date.now();
    const prev = sampleRef.current;
    if (!prev) {
      sampleRef.current = { loaded: l, t: now };
      return;
    }
    const dt = now - prev.t;
    if (dt >= 800) {
      setRate((Math.max(0, l - prev.loaded) * 1000) / dt);
      sampleRef.current = { loaded: l, t: now };
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");
    const errs: Record<string, string> = {};
    if (!brand) errs.brand = t("upload.errors.brand");
    if (!category) errs.category = t("upload.errors.category");
    if (!file) errs.file = t("upload.errors.file");
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    setLoaded(0);
    setTotal(file!.size);
    setRate(0);
    sampleRef.current = { loaded: 0, t: Date.now() };
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file!);
      formData.append("brand", brand);
      formData.append("category", category);
      if (series) formData.append("series", series);
      formData.append("description", description.trim());
      await submissionsApi.uploadDocument(formData, (e) => {
        if (e.total) reportProgress(e.loaded, e.total);
      });
      setSuccessMsg(t("upload.success"));
      setFile(null);
      setSeries("");
      setDescription("");
      onUploaded();
    } catch (err) {
      setErrorMsg(requestError(err, t("upload.errors.failed")));
    } finally {
      setUploading(false);
      setLoaded(0);
      setTotal(0);
      setRate(0);
      sampleRef.current = null;
    }
  }

  return (
    <Card className="border-sky-100 shadow-sm">
      <CardHeader>
        <CardTitle>{t("upload.documentTitle")}</CardTitle>
        <CardDescription>{t("upload.documentDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <BrandCategoryFields
            brandType="doc_brand"
            categoryType="doc_category"
            brand={brand}
            category={category}
            onBrand={setBrand}
            onCategory={(v) => {
              setCategory(v);
              setSeries("");
            }}
            labelPrefix="doc-upload"
          />
          {category && seriesTags.length > 0 ? (
            <div className="space-y-2">
              <label
                htmlFor="doc-upload-series"
                className="block text-left px-1 text-sm font-medium text-gray-700"
              >
                {t("upload.series")}
              </label>
              <Select
                id="doc-upload-series"
                value={series}
                onChange={(e) => setSeries(e.target.value)}
                aria-label={t("upload.series")}
              >
                <option value="">{t("upload.seriesPlaceholder")}</option>
                {seriesTags.map((tg) => (
                  <option key={tg.value} value={tg.value}>
                    {tg.label_zh}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}
          <div className="space-y-2">
            <label
              htmlFor="doc-upload-desc"
              className="block text-left px-1 text-sm font-medium text-gray-700"
            >
              {t("upload.description")}
            </label>
            <Input
              id="doc-upload-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("upload.descriptionPlaceholder")}
            />
          </div>
          <FilePicker
            id="doc-upload-file"
            accept=".pdf"
            file={file}
            onFile={(f) => {
              setFile(f);
              setFieldErrors((prev) => ({ ...prev, file: "" }));
            }}
            label={t("upload.documentFile")}
            chooseLabel={t("upload.chooseDocumentFile")}
          />
          {fieldErrors.file && <p className="px-1 text-xs text-red-600">{fieldErrors.file}</p>}

          <ProgressBlock
            uploading={uploading}
            finalizing={false}
            loaded={loaded}
            total={total}
            rate={rate}
          />
          {successMsg && (
            <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{successMsg}</p>
          )}
          {errorMsg && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errorMsg}</p>
          )}

          <div className="flex flex-col gap-3 pt-1 sm:flex-row">
            <Button
              type="submit"
              disabled={uploading || !brand || !category || !file}
              className="w-full bg-sky-700 hover:bg-[#085A90] sm:w-auto"
            >
              {uploading ? <Loader2 className="animate-spin" /> : null}
              {uploading ? t("upload.uploading") : t("upload.submit")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function SubmissionRow({
  item,
  tab,
  onDeleted,
  highlighted = false,
}: {
  item: SubmissionItem;
  tab: Tab;
  onDeleted: () => void;
  highlighted?: boolean;
}) {
  const { t } = useTranslation("submissions");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  async function handleDelete() {
    setDeleteError("");
    setDeleting(true);
    try {
      if (tab === "software") await submissionsApi.deleteSoftware(item.id);
      else await submissionsApi.deleteDocument(item.id);
      onDeleted();
    } catch (err) {
      setDeleteError(requestError(err, t("delete.failed")));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div
      className={`rounded-xl border bg-white p-4 shadow-sm transition-colors ${
        highlighted ? "border-sky-400 ring-2 ring-sky-200" : "border-gray-100"
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="break-all font-medium text-gray-900">{item.original_name}</p>
          <p className="mt-1 text-sm text-gray-500">
            {item.brand} · {item.category}
            {item.version ? ` · ${t("meta.version")} ${item.version}` : ""} ·{" "}
            {humanSize(item.file_size)} · {formatDate(item.upload_time ?? item.created_at)}
          </p>
          {item.description ? (
            <p className="mt-1 break-all text-sm text-gray-500">
              {t("meta.description")}：{item.description}
            </p>
          ) : null}
          <div className="mt-2">
            <StatusChip status={item.submission_status} reason={item.rejected_reason} />
          </div>
          {item.submission_status === "rejected" && item.rejected_reason ? (
            <div className="mt-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
              <span className="font-medium">{t("rejectedReasonLabel")}：</span>
              {item.rejected_reason}
            </div>
          ) : null}
          {deleteError ? <p className="mt-2 text-xs text-red-600">{deleteError}</p> : null}
        </div>
        <div className="shrink-0 sm:pl-4">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={deleting}
                className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 sm:w-auto"
              >
                {deleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                {t("delete.trigger")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("delete.title")}</AlertDialogTitle>
                <AlertDialogDescription>
                  <span className="block break-all">{item.original_name}</span>
                  {t("delete.description")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex gap-3 sm:gap-3">
                <AlertDialogCancel disabled={deleting} className="flex-1 mt-0">
                  {t("delete.cancel")}
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e: React.MouseEvent) => {
                    e.preventDefault();
                    handleDelete();
                  }}
                  disabled={deleting}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                >
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {t("delete.confirm")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}

export function MySubmissions() {
  const { t } = useTranslation("submissions");
  const { isAuthenticated, isLoading, isMember } = useAuth();
  const [tab, setTab] = useState<Tab>("software");
  const [items, setItems] = useState<SubmissionItem[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [highlight, setHighlight] = useState<{ tab: Tab; id: number } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const highlightTimer = useRef<number | null>(null);
  const noticeTimer = useRef<number | null>(null);

  const load = useCallback(async (): Promise<SubmissionItem[]> => {
    setLoadError("");
    try {
      const page =
        tab === "software"
          ? await submissionsApi.softwareList()
          : await submissionsApi.documentList();
      setItems(page.items);
      setTruncated(page.truncated);
      return page.items;
    } catch (err) {
      setItems([]);
      setLoadError(requestError(err, t("errors.load")));
      return [];
    }
  }, [tab, t]);

  // After a successful upload: collapse the form, refresh, then scroll to the
  // list and briefly highlight the new entry (first row — lists are
  // newest-first) so it is easy to find. The success notice sits above the
  // list, so the message and the new row end up on screen together.
  const handleUploaded = useCallback(async () => {
    setShowUpload(false);
    const list = await load();
    setNotice(t("upload.success"));
    if (noticeTimer.current !== null) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(null), 6000);
    const first = list[0];
    if (!first) return;
    setHighlight({ tab, id: first.id });
    // Wait for the collapsed form to leave the layout before measuring.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
    if (highlightTimer.current !== null) window.clearTimeout(highlightTimer.current);
    highlightTimer.current = window.setTimeout(() => setHighlight(null), 6000);
  }, [load, tab, t]);

  useEffect(() => {
    if (isAuthenticated && isMember) void load();
  }, [isAuthenticated, isMember, load]);

  useEffect(
    () => () => {
      if (highlightTimer.current !== null) window.clearTimeout(highlightTimer.current);
      if (noticeTimer.current !== null) window.clearTimeout(noticeTimer.current);
    },
    [],
  );

  if (!isLoading && !isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: { pathname: "/account/submissions" } }} />;
  }

  if (!isLoading && isAuthenticated && !isMember) {
    return (
      <section className="min-h-[50vh] px-4 py-12 sm:px-6">
        <SEO
          title={t("seo.title")}
          description={t("seo.description")}
          canonicalPath="/account/submissions"
        />
        <div className="mx-auto max-w-3xl rounded-xl border border-sky-100 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900">{t("memberOnly.title")}</h1>
          <p className="mt-3 text-gray-600">{t("memberOnly.description")}</p>
          <Button asChild className="mt-5 w-full bg-sky-700 hover:bg-[#085A90] sm:w-auto">
            <Link to="/account">{t("memberOnly.action")}</Link>
          </Button>
        </div>
      </section>
    );
  }

  const tabs: Array<{ key: Tab; label: string }> = [
    { key: "software", label: t("tabs.software") },
    { key: "documents", label: t("tabs.documents") },
  ];

  return (
    <section className="bg-gradient-to-br from-blue-50 via-white to-cyan-50 px-4 py-12 sm:px-6 lg:px-8">
      <SEO
        title={t("seo.title")}
        description={t("seo.description")}
        canonicalPath="/account/submissions"
      />
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-sky-100 px-4 py-2 text-sm font-semibold text-sky-800">
            <Upload className="h-4 w-4" />
            {t("header.badge")}
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{t("header.title")}</h1>
          <p className="mt-2 text-gray-600">{t("header.subtitle")}</p>
          <Link
            to="/account"
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-sky-700 hover:text-[#085A90]"
          >
            <ChevronLeft className="h-4 w-4" />
            {t("back")}
          </Link>
        </div>

        {/* Tabs — segmented, full-width on mobile */}
        <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl border border-gray-200 bg-white p-1">
          {tabs.map((tb) => (
            <button
              key={tb.key}
              type="button"
              onClick={() => {
                setTab(tb.key);
                setShowUpload(false);
              }}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                tab === tb.key ? "bg-sky-700 text-white shadow-sm" : "text-gray-600 hover:bg-sky-50"
              }`}
            >
              {tb.label}
            </button>
          ))}
        </div>

        {/* Upload toggle */}
        <div className="mb-6">
          {showUpload ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowUpload(false)}
              className="w-full sm:w-auto"
            >
              {t(tab === "software" ? "upload.hideSoftware" : "upload.hideDocuments")}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => setShowUpload(true)}
              className="w-full bg-sky-700 hover:bg-[#085A90] sm:w-auto"
            >
              <Upload className="h-4 w-4" />
              {t(tab === "software" ? "upload.showSoftware" : "upload.showDocuments")}
            </Button>
          )}
        </div>
        {showUpload ? (
          <div className="mb-6">
            {tab === "software" ? (
              <SoftwareUploadForm
                onUploaded={() => {
                  void handleUploaded();
                }}
              />
            ) : (
              <DocumentUploadForm
                onUploaded={() => {
                  void handleUploaded();
                }}
              />
            )}
          </div>
        ) : null}

        {/* Submissions list */}
        {items === null ? (
          <div className="flex items-center gap-2 text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : loadError ? (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {loadError}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="ml-3"
              onClick={() => void load()}
            >
              {t("errors.retry")}
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white/60 px-4 py-10 text-center text-sm text-gray-500">
            {t(tab === "software" ? "empty.software" : "empty.documents")}
          </div>
        ) : (
          <div ref={listRef} className="space-y-3">
            {notice ? (
              <div className="rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-800">
                {notice}
              </div>
            ) : null}
            {items.map((item) => (
              <SubmissionRow
                key={item.id}
                item={item}
                tab={tab}
                highlighted={
                  highlight !== null && highlight.tab === tab && highlight.id === item.id
                }
                onDeleted={() => {
                  void load();
                }}
              />
            ))}
            {truncated ? (
              <p className="pt-1 text-center text-xs text-gray-400">
                {t("truncatedHint").replace("{count}", String(items.length))}
              </p>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
