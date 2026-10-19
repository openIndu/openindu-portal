import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router";
import { Download, Eye, FileText, Loader2, Package, Search } from "lucide-react";
import {
  documentsApi,
  getApiErrorMessage,
  isTooManyRequests,
  softwareApi,
  tagsApi,
  type PaginatedResponse,
  type ResourceItem,
  type ResourceTag,
} from "@/api";
import { useAuth } from "@/store/auth";
import { SEO } from "../components/SEO";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";

type ResourceType = "documents" | "software";

type FilterOption = { value: string; label: string };

function tagOptions(tags: ResourceTag[] | undefined, allLabel: string): FilterOption[] {
  // Be defensive: the API may return a non-array (e.g. {} when a list is empty),
  // so guard with Array.isArray instead of relying on `?? []` (which only catches null/undefined).
  return [
    { value: "", label: allLabel },
    ...(Array.isArray(tags) ? tags : [])
      .filter((tag) => tag.is_active)
      .map((tag) => ({ value: tag.value, label: tag.label_zh })),
  ];
}

function optionMap(options: FilterOption[]): Record<string, string> {
  return Object.fromEntries(
    options.filter((option) => option.value).map((option) => [option.value, option.label]),
  );
}

function normalizeList(
  data: PaginatedResponse<ResourceItem> | ResourceItem[] | undefined,
  page: number,
  pageSize: number,
): PaginatedResponse<ResourceItem> {
  if (!data) return { items: [], total: 0, page, page_size: pageSize };
  if (Array.isArray(data)) return { items: data, total: data.length, page, page_size: pageSize };
  return {
    items: data.items ?? [],
    total: data.total ?? data.items?.length ?? 0,
    page: data.page ?? page,
    page_size: data.size ?? data.page_size ?? pageSize,
    pages: data.pages,
  };
}

const PAGE_SIZE_OPTIONS = [10, 20, 50];

function ChipBar({
  label,
  options,
  selected,
  onSelect,
  disabled,
}: {
  label: string;
  options: FilterOption[];
  selected: string;
  onSelect: (v: string) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation("resources");
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="shrink-0 font-medium text-gray-500">{label}</span>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(option.value)}
          className={`inline-flex min-h-[44px] items-center rounded-full border px-3 py-2 text-xs transition-colors disabled:opacity-50 ${
            selected === option.value
              ? "border-sky-700 bg-sky-700 text-white"
              : "border-gray-300 bg-white text-gray-700 hover:border-sky-400 hover:bg-sky-50"
          }`}
        >
          {option.value === "" ? t("filters.allOption") : option.label}
        </button>
      ))}
    </div>
  );
}

function getTitle(item: ResourceItem, fallback: string) {
  return item.title || item.name || item.original_name || item.filename || fallback;
}

function formatFileSize(size: number | undefined, unknownLabel: string) {
  if (!size) return unknownLabel;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
  return `${(size / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function getDownloadUrl(payload: { download_url?: string; url?: string }) {
  return payload.download_url || payload.url || "";
}

export function Resources() {
  const { t } = useTranslation("resources");
  const { isMember, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ResourceType>(() =>
    location.pathname.endsWith("/software") ? "software" : "documents",
  );
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [series, setSeries] = useState("");
  const [keyword, setKeyword] = useState(
    () => new URLSearchParams(location.search).get("keyword") ?? "",
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [data, setData] = useState<PaginatedResponse<ResourceItem>>({
    items: [],
    total: 0,
    page: 1,
    page_size: 10,
  });
  const [brandOptions, setBrandOptions] = useState<FilterOption[]>([
    { value: "", label: t("filters.allBrands") },
  ]);
  const [categoryOptions, setCategoryOptions] = useState<FilterOption[]>([
    { value: "", label: t("filters.allCategories") },
  ]);
  const [seriesOptions, setSeriesOptions] = useState<FilterOption[]>([
    { value: "", label: t("filters.allSeries") },
  ]);
  const [allSeriesOptions, setAllSeriesOptions] = useState<FilterOption[]>([
    { value: "", label: t("filters.allSeries") },
  ]);
  const [filtersLoading, setFiltersLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | number | null>(null);
  const [previewingId, setPreviewingId] = useState<string | number | null>(null);
  const [error, setError] = useState("");
  const [rateLimitError, setRateLimitError] = useState("");
  // Stays in lockstep with activeTab so async handlers can compare against
  // the latest value (the captured prop in their closure may be stale).
  const activeTabRef = useRef(activeTab);
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  const totalPages = useMemo(
    () => data.pages ?? Math.max(1, Math.ceil(data.total / data.page_size)),
    [data],
  );
  const brandMap = useMemo(() => optionMap(brandOptions), [brandOptions]);
  const categoryMap = useMemo(() => optionMap(categoryOptions), [categoryOptions]);
  const seriesMap = useMemo(() => optionMap(allSeriesOptions), [allSeriesOptions]);

  const loadResources = useCallback(async () => {
    setLoading(true);
    setError("");
    const requestedTab = activeTab;
    try {
      const baseParams = {
        page,
        size: pageSize,
        brand: brand || undefined,
        category: category || undefined,
        keyword: keyword || undefined,
        published_only: true,
      };
      // Only documents have a "series" dimension. Do not leak the document
      // series filter into software requests; the backend has removed the
      // legacy software.series field entirely.
      const params =
        requestedTab === "software"
          ? { ...baseParams, expand_versions: true, sort_by: "brand", sort_order: "asc" }
          : { ...baseParams, series: series || undefined, sort_by: "brand", sort_order: "asc" };
      const result =
        requestedTab === "documents"
          ? await documentsApi.list(params)
          : await softwareApi.list(params);
      // Compare against the ref — if the user clicked the other tab while
      // this request was in flight, drop the stale result.
      if (requestedTab !== activeTabRef.current) return;
      setData(normalizeList(result, page, pageSize));
    } catch (err) {
      if (requestedTab !== activeTabRef.current) return;
      setError(getApiErrorMessage(err, t("errors.loadFailed")));
      setData({ items: [], total: 0, page, page_size: pageSize });
    } finally {
      if (requestedTab === activeTabRef.current) setLoading(false);
    }
  }, [activeTab, brand, category, series, keyword, page, pageSize, t]);

  useEffect(() => {
    const routeTab = location.pathname.endsWith("/software") ? "software" : "documents";
    if (routeTab !== activeTab) {
      setActiveTab(routeTab);
      setBrand("");
      setCategory("");
      setSeries("");
      setPage(1);
    }
  }, [activeTab, location.pathname]);

  useEffect(() => {
    const loadFilters = async () => {
      setFiltersLoading(true);
      try {
        const tagPrefix = activeTab === "documents" ? "doc" : "sw";
        // Software has no "series" concept — only documents load series tags.
        const [nextBrands, nextCategories, nextSeries] = await Promise.all([
          tagsApi.list(`${tagPrefix}_brand`),
          tagsApi.list(`${tagPrefix}_category`),
          activeTab === "documents" ? tagsApi.list("doc_series") : Promise.resolve([]),
        ]);
        setBrandOptions(tagOptions(nextBrands, t("filters.allBrands")));
        setCategoryOptions(tagOptions(nextCategories, t("filters.allCategories")));
        setAllSeriesOptions(tagOptions(nextSeries, t("filters.allSeries")));
      } catch (err) {
        setError(getApiErrorMessage(err, t("errors.filtersLoadFailed")));
        setBrandOptions([{ value: "", label: t("filters.allBrands") }]);
        setCategoryOptions([{ value: "", label: t("filters.allCategories") }]);
        setAllSeriesOptions([{ value: "", label: t("filters.allSeries") }]);
      } finally {
        setFiltersLoading(false);
      }
    };
    void loadFilters();
  }, [activeTab, t]);

  useEffect(() => {
    const loadSeries = async () => {
      // Software has no "series" concept — skip the cascading series fetch entirely.
      if (activeTab !== "documents" || !category) {
        setSeriesOptions([{ value: "", label: t("filters.allSeries") }]);
        setSeries("");
        return;
      }
      setFiltersLoading(true);
      try {
        const nextSeries = await tagsApi.list("doc_series", category, brand || undefined);
        setSeriesOptions(tagOptions(nextSeries, t("filters.allSeries")));
      } catch (err) {
        setError(getApiErrorMessage(err, t("errors.seriesLoadFailed")));
        setSeriesOptions([{ value: "", label: t("filters.allSeries") }]);
      } finally {
        setFiltersLoading(false);
      }
    };
    void loadSeries();
  }, [activeTab, brand, category, t]);

  useEffect(() => {
    void loadResources();
  }, [loadResources]);

  function handleTabChange(nextTab: ResourceType) {
    setActiveTab(nextTab);
    setBrand("");
    setCategory("");
    setSeries("");
    setPage(1);
    setError("");
    navigate(nextTab === "documents" ? "/resources/documents" : "/resources/software");
  }

  function handleSearch() {
    setPage(1);
    void loadResources();
  }

  async function getLink(item: ResourceItem): Promise<string | null> {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: { pathname: location.pathname } } });
      return null;
    }
    if (!isMember) {
      setError(t("errors.memberOnly"));
      return null;
    }
    setError("");
    setRateLimitError("");
    try {
      // Software in expand-versions mode carries version_id — request the
      // exact version's link, not just the latest.
      const result =
        activeTab === "documents"
          ? await documentsApi.downloadLink(item.id)
          : item.version_id
            ? await softwareApi.downloadVersionLink(item.id, item.version_id)
            : await softwareApi.downloadLink(item.id);
      const url = getDownloadUrl(result);
      if (!url) throw new Error(t("errors.noDownloadUrl"));
      void loadResources();
      return url;
    } catch (err) {
      if (isTooManyRequests(err)) {
        setRateLimitError(t("errors.downloadRateLimited"));
      } else {
        setError(getApiErrorMessage(err, t("errors.downloadLinkFailed")));
      }
      return null;
    }
  }

  async function getPreviewUrl(item: ResourceItem): Promise<string | null> {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: { pathname: location.pathname } } });
      return null;
    }
    if (!isMember) {
      setError(t("errors.memberOnly"));
      return null;
    }
    setError("");
    setRateLimitError("");
    try {
      const result = await documentsApi.previewLink(item.id);
      const url = result.preview_url || result.url || "";
      if (!url) throw new Error(t("errors.noPreviewUrl"));
      void loadResources();
      return url;
    } catch (err) {
      if (isTooManyRequests(err)) {
        setRateLimitError(t("errors.previewRateLimited"));
      } else {
        setError(getApiErrorMessage(err, t("errors.previewLinkFailed")));
      }
      return null;
    }
  }

  async function handlePreview(item: ResourceItem) {
    setPreviewingId(item.id);
    const url = await getPreviewUrl(item);
    setPreviewingId(null);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  async function handleDownload(item: ResourceItem) {
    setDownloadingId(item.id);
    const url = await getLink(item);
    setDownloadingId(null);
    if (!url) return;
    const filename = getTitle(item, t("list.itemFallbackTitle", { id: item.id }));
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return (
    <section className="bg-gray-50 px-4 py-10 sm:px-6 lg:px-8">
      <SEO
        title={t("seo.title")}
        description={t("seo.description")}
        keywords={t("seo.keywords")}
        canonicalPath="/resources"
      />
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-sky-700">{t("header.title")}</h1>
            <p className="mt-2 text-gray-600">{t("header.subtitle")}</p>
          </div>
          {!isAuthenticated ? (
            <div className="flex flex-col gap-2 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800 sm:flex-row sm:items-center">
              <span>{t("authBanner.guest")}</span>
              <Link
                to="/login"
                state={{ from: { pathname: location.pathname } }}
                className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-lg bg-sky-700 px-4 py-2 font-medium text-white hover:bg-sky-800"
              >
                {t("authBanner.signIn")}
              </Link>
            </div>
          ) : !isMember ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {t("authBanner.nonMember")}
            </div>
          ) : null}
        </div>

        <Card className="mb-6">
          <CardContent className="p-4 sm:p-6">
            <div className="mb-5">
              <Tabs>
                <TabsList>
                  <TabsTrigger
                    active={activeTab === "documents"}
                    onClick={() => handleTabChange("documents")}
                  >
                    {t("tabs.documents")}
                  </TabsTrigger>
                  <TabsTrigger
                    active={activeTab === "software"}
                    onClick={() => handleTabChange("software")}
                  >
                    {t("tabs.software")}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="space-y-3">
              <ChipBar
                label={t("labels.brand")}
                options={brandOptions}
                selected={brand}
                disabled={filtersLoading}
                onSelect={(value) => {
                  setBrand(value);
                  setSeries("");
                  setPage(1);
                }}
              />
              <ChipBar
                label={t("labels.category")}
                options={categoryOptions}
                selected={category}
                disabled={filtersLoading}
                onSelect={(value) => {
                  setCategory(value);
                  setSeries("");
                  setPage(1);
                }}
              />
              {activeTab === "documents" && category && seriesOptions.length > 1 ? (
                <ChipBar
                  label={t("labels.series")}
                  options={seriesOptions}
                  selected={series}
                  disabled={filtersLoading}
                  onSelect={(value) => {
                    setSeries(value);
                    setPage(1);
                  }}
                />
              ) : null}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[220px] flex-1 sm:max-w-md">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    className="pl-9"
                    value={keyword}
                    onChange={(event) => setKeyword(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") handleSearch();
                    }}
                    placeholder={t("filters.searchPlaceholder")}
                  />
                </div>
                <Button
                  type="button"
                  onClick={handleSearch}
                  className="bg-sky-700 hover:bg-[#085A90]"
                >
                  {t("filters.searchButton")}
                </Button>
                {brand || category || series || keyword ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setBrand("");
                      setCategory("");
                      setSeries("");
                      setKeyword("");
                      setPage(1);
                    }}
                  >
                    {t("filters.clearButton")}
                  </Button>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}
        {rateLimitError && (
          <div className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {rateLimitError}
          </div>
        )}

        <div className="mb-4 rounded-lg border border-gray-200 bg-white px-4 py-3 text-xs text-gray-500">
          {t("copyright")}
        </div>

        <div className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="flex items-center justify-center gap-2 p-10 text-gray-600">
                <Loader2 className="animate-spin" /> {t("list.loading")}
              </CardContent>
            </Card>
          ) : data.items.length === 0 ? (
            <Card>
              <CardContent className="p-10 text-center text-gray-500">
                {t("list.empty")}
              </CardContent>
            </Card>
          ) : (
            data.items.map((item) => (
              <Card
                key={`${item.id}-${item.version_id ?? "none"}`}
                className="hover:border-sky-200 hover:shadow-md"
              >
                <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
                  <div className="flex gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
                      {activeTab === "documents" ? <FileText /> : <Package />}
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">
                        {getTitle(item, t("list.itemFallbackTitle", { id: item.id }))}
                      </h2>
                      <p className="mt-1 line-clamp-2 text-sm text-gray-600">
                        {item.description || t("list.noDescription")}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
                        <span className="rounded-full bg-gray-100 px-2 py-1">
                          {t("labels.brand")}
                          {item.brand
                            ? (brandMap[item.brand] ?? item.brand)
                            : t("list.uncategorized")}
                        </span>
                        <span className="rounded-full bg-gray-100 px-2 py-1">
                          {t("labels.category")}
                          {item.category
                            ? (categoryMap[item.category] ?? item.category)
                            : t("list.uncategorized")}
                        </span>
                        {activeTab === "documents" && item.series ? (
                          <span className="rounded-full bg-gray-100 px-2 py-1">
                            {t("labels.series")}
                            {seriesMap[item.series] ?? item.series}
                          </span>
                        ) : null}
                        <span className="rounded-full bg-gray-100 px-2 py-1">
                          {t("labels.size")}
                          {formatFileSize(
                            item.file_size ?? item.latest_version_size,
                            t("list.unknownSize"),
                          )}
                        </span>
                        {activeTab === "software" && (item.version || item.latest_version) && (
                          <span className="rounded-full bg-gray-100 px-2 py-1">
                            {t("labels.version")}
                            {item.version || item.latest_version}
                            {item.is_latest_version && (
                              <span className="ml-1 text-sky-700">{t("list.latestBadge")}</span>
                            )}
                          </span>
                        )}
                        <span className="rounded-full bg-sky-50 px-2 py-1 text-sky-800">
                          {t("list.downloadCount", { count: item.download_count ?? 0 })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2 md:self-center">
                    {activeTab === "documents" && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void handlePreview(item)}
                        disabled={previewingId === item.id || downloadingId === item.id}
                      >
                        {previewingId === item.id ? <Loader2 className="animate-spin" /> : <Eye />}
                        {t("list.previewButton")}
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void handleDownload(item)}
                      disabled={downloadingId === item.id || previewingId === item.id}
                    >
                      {downloadingId === item.id ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <Download />
                      )}
                      {t("list.downloadButton")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <div className="mt-6 flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-sm text-gray-500">
            {t("pagination.pageOf", { page, total: totalPages })}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-end">
            <span className="whitespace-nowrap text-sm text-gray-500">
              {t("pagination.totalItems", { count: data.total })}
            </span>
            <Select
              className="h-9 w-32 shrink-0 scroll-mb-[45vh]"
              value={String(pageSize)}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
              aria-label={t("pagination.perPageAriaLabel")}
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {t("pagination.perPage", { n })}
                </option>
              ))}
            </Select>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={page <= 1 || loading}
                onClick={() => setPage((value) => Math.max(value - 1, 1))}
              >
                {t("pagination.prev")}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((value) => value + 1)}
              >
                {t("pagination.next")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
