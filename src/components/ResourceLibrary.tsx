"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  getResourceFiles,
  getResourceSnapshotStatus,
  type ResourceSnapshotStatus,
} from "@/lib/data";
import type {
  Country,
  Institution,
  LinkStatus,
  Resource,
  ResourceType,
  Topic,
} from "@/types";
import {
  getPublicResourceStatusMeta,
  linkStatusBadge,
  linkStatusZh,
  resourceTypeZh,
} from "@/lib/display";

const allValue = "all";
const pageSize = 7;

type SearchField = "all" | "title" | "institution" | "country" | "topic" | "tag";
type SearchMode = "normal" | "fuzzy";
type SnapshotStatusFilter = "all" | ResourceSnapshotStatus;
type SelectValue<T extends string> = T | typeof allValue;

type ResourceLibraryProps = {
  countries: Country[];
  institutions: Institution[];
  topics: Topic[];
  resources: Resource[];
  adminSnapshotActionsEnabled?: boolean;
};

type LibraryState = {
  keyword: string;
  field: SearchField;
  countryId: SelectValue<string>;
  institutionId: SelectValue<string>;
  resourceType: SelectValue<ResourceType>;
  topicId: SelectValue<string>;
  linkStatus: SelectValue<LinkStatus>;
  snapshotStatus: SnapshotStatusFilter;
  mode: SearchMode;
};

const searchFieldZh: Record<SearchField, string> = {
  all: "全部字段",
  title: "标题",
  institution: "机构",
  country: "国家地区",
  topic: "研究专题",
  tag: "关键词标签",
};

const searchModeZh: Record<SearchMode, string> = {
  normal: "普通检索",
  fuzzy: "模糊查询",
};

const snapshotStatusZh: Record<SnapshotStatusFilter, string> = {
  all: "全部",
  complete: "已完整备份",
  partial: "部分备份",
  none: "未备份",
};

const snapshotStatusBadgeClassName = {
  complete:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  partial:
    "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  none: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
};

const pinyinSearchAliases: Array<{ pinyin: string; terms: string[] }> = [
  { pinyin: "zongtong", terms: ["总统", "总统档案", "总统图书馆"] },
  { pinyin: "dangan", terms: ["档案", "档案馆", "档案资料"] },
  { pinyin: "shuju", terms: ["数据", "数据资源"] },
  { pinyin: "dianziji", terms: ["电子记录", "电子档案"] },
  { pinyin: "jilu", terms: ["记录", "文件"] },
  { pinyin: "kaifang", terms: ["开放", "开放政府", "开放数据"] },
  { pinyin: "baocun", terms: ["保存", "保护", "长期保存"] },
  { pinyin: "falv", terms: ["法律", "法案"] },
  { pinyin: "fagui", terms: ["法规", "规章"] },
  { pinyin: "zhengce", terms: ["政策"] },
  { pinyin: "zhanlue", terms: ["战略"] },
  { pinyin: "zhinan", terms: ["指南"] },
  { pinyin: "yinsi", terms: ["隐私"] },
];

type SnapshotActionMessage = {
  tone: "success" | "error" | "info";
  text: string;
};

function normalize(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[()[\]{}"'“”‘’.,，。:：;；/\\|_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function compact(value: string) {
  return normalize(value).replace(/\s+/g, "");
}

function isOrderedSubsequence(needle: string, haystack: string) {
  if (needle.length < 2) {
    return false;
  }

  let index = 0;

  for (const char of haystack) {
    if (char === needle[index]) {
      index += 1;
    }

    if (index === needle.length) {
      return true;
    }
  }

  return false;
}

function editDistanceAtMostOne(a: string, b: string) {
  if (Math.abs(a.length - b.length) > 1) {
    return false;
  }

  let edits = 0;
  let i = 0;
  let j = 0;

  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i += 1;
      j += 1;
      continue;
    }

    edits += 1;

    if (edits > 1) {
      return false;
    }

    if (a.length > b.length) {
      i += 1;
    } else if (a.length < b.length) {
      j += 1;
    } else {
      i += 1;
      j += 1;
    }
  }

  return true;
}

function matchesText(values: string[], keyword: string, mode: SearchMode) {
  const query = normalize(keyword);

  if (!query) {
    return true;
  }

  const text = normalize(values.join(" "));
  const compactQuery = compact(query);
  const aliasTerms = pinyinSearchAliases
    .filter(({ pinyin }) => compactQuery.includes(pinyin))
    .flatMap(({ terms }) => terms);

  if (text.includes(query)) {
    return true;
  }

  if (aliasTerms.some((term) => text.includes(normalize(term)))) {
    return true;
  }

  if (mode !== "fuzzy") {
    return false;
  }

  const compactText = compact(text);

  if (compactQuery && compactText.includes(compactQuery)) {
    return true;
  }

  const queryTokens = query.split(/\s+/).filter(Boolean);
  const textTokens = text.split(/\s+/).filter(Boolean);

  if (queryTokens.length > 1 && queryTokens.every((token) => text.includes(token))) {
    return true;
  }

  if (
    queryTokens.some((token) =>
      textTokens.some(
        (textToken) =>
          token.length >= 2 &&
          (textToken.startsWith(token) || token.startsWith(textToken)),
      ),
    )
  ) {
    return true;
  }

  if (
    queryTokens.some((token) =>
      textTokens.some(
        (textToken) =>
          token.length >= 4 &&
          textToken.length >= 4 &&
          editDistanceAtMostOne(token, textToken),
      ),
    )
  ) {
    return true;
  }

  return isOrderedSubsequence(compactQuery, compactText);
}

function SelectField({
  id,
  label,
  value,
  onChange,
  children,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="archive-ledger-field-label">
        {label}
      </span>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="archive-ledger-select"
      >
        {children}
      </select>
    </label>
  );
}

function firstParam(searchParams: URLSearchParams, key: string) {
  return searchParams.get(key)?.trim() ?? "";
}

function isAllFilterValue(value?: string | null) {
  return !value || value === allValue;
}

function resolveSearchField(value: string): SearchField {
  const normalized = normalize(value);

  if (normalized === "title" || normalized === "resource") {
    return "title";
  }

  if (
    normalized === "all" ||
    normalized === "institution" ||
    normalized === "country" ||
    normalized === "topic" ||
    normalized === "tag"
  ) {
    return normalized;
  }

  return "all";
}

function resolveSearchMode(value: string): SearchMode {
  return normalize(value) === "fuzzy" ? "fuzzy" : "normal";
}

function resolveSnapshotStatus(value: string): SnapshotStatusFilter {
  const normalized = normalize(value);

  if (
    normalized === "complete" ||
    normalized === "已完整备份" ||
    normalized === "完整备份"
  ) {
    return "complete";
  }

  if (
    normalized === "partial" ||
    normalized === "部分备份" ||
    normalized === "部分快照"
  ) {
    return "partial";
  }

  if (
    normalized === "none" ||
    normalized === "未备份" ||
    normalized === "无快照"
  ) {
    return "none";
  }

  return "all";
}

function resolveResourceType(value: string): SelectValue<ResourceType> {
  const normalized = normalize(value);
  const matched = Object.entries(resourceTypeZh).find(
    ([type, label]) => normalize(type) === normalized || normalize(label) === normalized,
  );

  return (matched?.[0] as ResourceType | undefined) ?? allValue;
}

function resolveLinkStatus(value: string): SelectValue<LinkStatus> {
  const normalized = normalize(value);
  const matched = Object.entries(linkStatusZh).find(
    ([status, label]) =>
      normalize(status) === normalized || normalize(label) === normalized,
  );

  return (matched?.[0] as LinkStatus | undefined) ?? allValue;
}

function getResourceStudyPriority(resourceType: ResourceType) {
  const priority: Record<ResourceType, number> = {
    law: 0,
    regulation: 1,
    policy: 2,
    strategy: 3,
    guidance: 4,
    report: 5,
    program: 6,
    system: 7,
    database: 8,
    catalog: 9,
    portal: 10,
  };

  return priority[resourceType] ?? 99;
}

function compareResourcesForStudy(a: Resource, b: Resource) {
  const priorityDiff =
    getResourceStudyPriority(a.resourceType) -
    getResourceStudyPriority(b.resourceType);

  if (priorityDiff !== 0) {
    return priorityDiff;
  }

  return (a.titleZh || a.titleEn || a.id).localeCompare(
    b.titleZh || b.titleEn || b.id,
    "zh-Hans",
  );
}

function getResourceThumbnail(resource: Resource) {
  return getResourceFiles(resource.id).find(
    (file) => file.fileType === "screenshot" && file.visibility === "public",
  )?.fileUrl;
}

function truncateText(value: string, maxLength = 64) {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength).trim()}…`;
}

function formatResourceDate(value: string) {
  if (!value) {
    return "";
  }

  return value.replace(/-/g, ".");
}

function getSourceLabel(resource: Resource) {
  return resource.sourceDomain || "官方来源";
}

function getGeneratedSnapshotRecordCount(output: string) {
  const match = output.match(/新生成快照记录数量：(\d+)/);

  if (!match) {
    return null;
  }

  const count = Number.parseInt(match[1] ?? "", 10);

  return Number.isFinite(count) ? count : null;
}

function summarizeSnapshotOutput(output: string) {
  const lines = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const usefulLines = lines.filter(
    (line) =>
      line.includes("本次待处理数量") ||
      line.includes("新生成快照记录数量") ||
      line.includes("本次没有成功生成新的快照记录") ||
      line.includes("已有快照记录") ||
      line.includes("是否成功") ||
      line.includes("失败原因") ||
      line.includes("Federal Register") ||
      line.includes("来源快照生成脚本执行失败"),
  );

  return (usefulLines.length > 0 ? usefulLines : lines).slice(-4).join("；");
}

function interpretSnapshotAction(output: string): SnapshotActionMessage {
  const normalizedOutput = output.trim();
  const generatedCount = getGeneratedSnapshotRecordCount(normalizedOutput);
  const summary = summarizeSnapshotOutput(normalizedOutput);

  if (
    normalizedOutput.includes("来源快照生成脚本执行失败") ||
    normalizedOutput.includes("本次没有成功生成新的快照记录") ||
    normalizedOutput.includes("是否成功：否")
  ) {
    return {
      tone: "error",
      text:
        summary ||
        "这条资料暂时没有成功保存网页快照。可能是外部网站阻止访问、页面超时或浏览器快照生成失败。",
    };
  }

  if (generatedCount !== null && generatedCount > 0) {
    return {
      tone: "success",
      text: `已写入 ${generatedCount} 条快照记录。`,
    };
  }

  if (normalizedOutput.includes("是否成功：部分成功")) {
    return {
      tone: "info",
      text: "网页快照部分保存成功，刷新后查看详情页。",
    };
  }

  if (normalizedOutput.includes("已有快照记录")) {
    return {
      tone: "info",
      text: "系统检测到已有快照记录，本次没有重新生成。",
    };
  }

  return {
    tone: "info",
    text: summary || "快照任务已结束，请刷新后查看状态。",
  };
}

function resolvePageParam(value: string) {
  const page = Number.parseInt(value, 10);

  return Number.isFinite(page) && page > 0 ? page : 1;
}

function buildQueryString(state: LibraryState, page = 1) {
  const params = new URLSearchParams();
  const keyword = state.keyword.trim();

  if (keyword) {
    params.set("q", keyword);
    params.set("field", state.field);
  } else if (state.field !== "all") {
    params.set("field", state.field);
  }

  if (!isAllFilterValue(state.countryId)) {
    params.set("country", state.countryId);
  }

  if (!isAllFilterValue(state.institutionId)) {
    params.set("institution", state.institutionId);
  }

  if (!isAllFilterValue(state.resourceType)) {
    params.set("type", state.resourceType);
  }

  if (!isAllFilterValue(state.topicId)) {
    params.set("topic", state.topicId);
  }

  if (!isAllFilterValue(state.linkStatus)) {
    params.set("linkStatus", state.linkStatus);
  }

  if (state.snapshotStatus !== "all") {
    params.set("snapshotStatus", state.snapshotStatus);
  }

  if (state.mode === "fuzzy") {
    params.set("mode", "fuzzy");
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  return params.toString();
}

export function ResourceLibrary({
  countries,
  institutions,
  topics,
  resources,
  adminSnapshotActionsEnabled = false,
}: ResourceLibraryProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamString = searchParams.toString();
  const [runningSnapshotResourceId, setRunningSnapshotResourceId] = useState("");
  const [snapshotActionMessages, setSnapshotActionMessages] = useState<
    Record<string, SnapshotActionMessage>
  >({});

  const institutionById = useMemo(
    () => new Map(institutions.map((institution) => [institution.id, institution])),
    [institutions],
  );

  const resourceInstitutionIds = useMemo(
    () => new Set(resources.map((resource) => resource.institutionId).filter(Boolean)),
    [resources],
  );

  const institutionOptions = useMemo(
    () =>
      institutions
        .filter((institution) => resourceInstitutionIds.has(institution.id))
        .sort((a, b) =>
          (a.nameZh || a.nameEn || a.id).localeCompare(
            b.nameZh || b.nameEn || b.id,
            "zh-Hans",
          ),
        ),
    [institutions, resourceInstitutionIds],
  );

  const countryById = useMemo(
    () => new Map(countries.map((country) => [country.id, country])),
    [countries],
  );

  const topicById = useMemo(
    () => new Map(topics.map((topic) => [topic.id, topic])),
    [topics],
  );

  const urlState = useMemo<LibraryState>(() => {
    const params = new URLSearchParams(searchParamString);

    const resolveCountry = (value: string): SelectValue<string> => {
      const normalized = normalize(value);
      const matched = countries.find(
        (country) =>
          normalize(country.id) === normalized ||
          normalize(country.slug) === normalized ||
          normalize(country.code) === normalized ||
          normalize(country.iso2) === normalized ||
          normalize(country.iso3) === normalized ||
          normalize(country.nameZh) === normalized ||
          normalize(country.nameEn) === normalized,
      );

      return matched?.id ?? allValue;
    };

    const resolveInstitution = (value: string): SelectValue<string> => {
      const normalized = normalize(value);

      if (!normalized || normalized === allValue) {
        return allValue;
      }

      const matched = institutions.find(
        (institution) =>
          normalize(institution.id) === normalized ||
          normalize(institution.shortName) === normalized ||
          normalize(institution.nameZh) === normalized ||
          normalize(institution.nameEn) === normalized,
      );

      return matched?.id ?? allValue;
    };

    const resolveTopic = (value: string): SelectValue<string> => {
      const normalized = normalize(value);
      const matched = topics.find(
        (topic) =>
          normalize(topic.id) === normalized ||
          normalize(topic.slug) === normalized ||
          normalize(topic.titleZh) === normalized ||
          normalize(topic.titleEn) === normalized,
      );

      return matched?.id ?? allValue;
    };

    return {
      keyword: firstParam(params, "q"),
      field: resolveSearchField(firstParam(params, "field")),
      countryId: resolveCountry(firstParam(params, "country")),
      institutionId: resolveInstitution(firstParam(params, "institution")),
      resourceType: resolveResourceType(firstParam(params, "type")),
      topicId: resolveTopic(firstParam(params, "topic")),
      linkStatus: resolveLinkStatus(firstParam(params, "linkStatus")),
      snapshotStatus: resolveSnapshotStatus(firstParam(params, "snapshotStatus")),
      mode: resolveSearchMode(firstParam(params, "mode")),
    };
  }, [countries, institutions, searchParamString, topics]);

  const [draftKeyword, setDraftKeyword] = useState(urlState.keyword);
  const [isKeywordComposing, setIsKeywordComposing] = useState(false);

  useEffect(() => {
    setDraftKeyword(urlState.keyword);
  }, [urlState.keyword]);

  const currentState = useMemo(
    () => ({
      ...urlState,
      keyword: draftKeyword,
    }),
    [draftKeyword, urlState],
  );
  const requestedPage = useMemo(() => {
    const params = new URLSearchParams(searchParamString);

    return resolvePageParam(firstParam(params, "page"));
  }, [searchParamString]);
  const {
    keyword,
    field,
    countryId,
    institutionId,
    resourceType,
    topicId,
    linkStatus,
    snapshotStatus,
    mode,
  } = currentState;

  function replaceUrl(nextState: LibraryState) {
    const queryString = buildQueryString(nextState);
    const nextUrl = queryString ? `${pathname}?${queryString}` : pathname;

    router.replace(nextUrl, { scroll: false });
  }

  function updateState(nextState: LibraryState) {
    replaceUrl(nextState);
  }

  function commitKeyword(nextKeyword = draftKeyword) {
    updateState({
      ...currentState,
      keyword: nextKeyword,
    });
  }

  function resetFilters() {
    setDraftKeyword("");
    router.replace(pathname, { scroll: false });
  }

  function goToPage(page: number) {
    const nextPage = Math.min(totalPages, Math.max(1, page));
    const queryString = buildQueryString(currentState, nextPage);
    const nextUrl = queryString ? `${pathname}?${queryString}` : pathname;

    router.replace(nextUrl, { scroll: false });
  }

  async function generateSnapshotForResource(resource: Resource) {
    if (runningSnapshotResourceId) {
      return;
    }

    if (resource.sourceDomain.toLowerCase() === "federalregister.gov") {
      const confirmed = window.confirm(
        "这条资料来自 Federal Register。为避免触发官方访问验证，系统不会批量截图；如果确实需要，可以单条尝试。是否继续？",
      );

      if (!confirmed) {
        return;
      }
    }

    setRunningSnapshotResourceId(resource.id);
    setSnapshotActionMessages((current) => ({
      ...current,
      [resource.id]: {
        tone: "info",
        text: "正在生成网页快照，可能需要半分钟到几分钟。",
      },
    }));

    try {
      const currentSnapshotStatus = getResourceSnapshotStatus(resource.id);
      const response = await fetch("/api/admin/actions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "snapshot-generate",
          params: {
            resourceId: resource.id,
            force: currentSnapshotStatus.status !== "none",
          },
        }),
      });
      const body = (await response.json().catch(() => null)) as
        | { success?: boolean; error?: string; output?: string }
        | null;
      const output = body?.output || "";

      if (!response.ok || !body?.success) {
        throw new Error(body?.error || output || "网页快照生成失败。");
      }

      const message = interpretSnapshotAction(output);

      setSnapshotActionMessages((current) => ({
        ...current,
        [resource.id]: message,
      }));

      if (message.tone === "success" || message.tone === "info") {
        router.refresh();
      }
    } catch (error) {
      setSnapshotActionMessages((current) => ({
        ...current,
        [resource.id]: {
          tone: "error",
          text: error instanceof Error ? error.message : "网页快照生成失败。",
        },
      }));
    } finally {
      setRunningSnapshotResourceId("");
    }
  }

  const resourceTypeOptions = useMemo(
    () =>
      Object.entries(resourceTypeZh)
        .map(([type, label]) => ({
          value: type as ResourceType,
          label,
          count: resources.filter((resource) => resource.resourceType === type)
            .length,
        }))
        .filter((item) => item.count > 0),
    [resources],
  );

  const linkStatusOptions = useMemo(
    () =>
      Object.entries(linkStatusZh)
        .map(([status, label]) => ({
          value: status as LinkStatus,
          label,
          count: resources.filter((resource) => resource.linkStatus === status)
            .length,
        }))
        .filter((item) => item.count > 0),
    [resources],
  );

  const snapshotStatusOptions = useMemo(
    () =>
      (["all", "complete", "partial", "none"] as SnapshotStatusFilter[]).map(
        (status) => ({
          value: status,
          label: snapshotStatusZh[status],
          count:
            status === allValue
              ? resources.length
              : resources.filter(
                  (resource) => getResourceSnapshotStatus(resource.id).status === status,
                ).length,
        }),
      ),
    [resources],
  );

  const topicOptions = useMemo(
    () =>
      topics
        .map((topic) => ({
          ...topic,
          count: resources.filter((resource) => resource.topicIds.includes(topic.id))
            .length,
        }))
        .filter((topic) => topic.count > 0)
        .sort((a, b) => b.count - a.count),
    [resources, topics],
  );

  const filteredResources = useMemo(() => {
    return resources.filter((resource) => {
      const country = countryById.get(resource.countryId);
      const institution = institutionById.get(resource.institutionId);
      const resourceTopics = resource.topicIds
        .map((id) => topicById.get(id))
        .filter((topic): topic is Topic => Boolean(topic));

      const searchValues = (() => {
        if (field === "title") {
          return [resource.titleZh, resource.titleEn];
        }

        if (field === "institution") {
          return [
            institution?.nameZh ?? "",
            institution?.nameEn ?? "",
            institution?.shortName ?? "",
          ];
        }

        if (field === "country") {
          return [
            country?.nameZh ?? "",
            country?.nameEn ?? "",
            country?.code ?? "",
          ];
        }

        if (field === "topic") {
          return resourceTopics.flatMap((topic) => [
            topic.titleZh,
            topic.titleEn,
            topic.plainQuestion,
            topic.shortDescription,
          ]);
        }

        if (field === "tag") {
          return resource.tags;
        }

        return [
          resource.titleZh,
          resource.titleEn,
          resource.summaryShort ?? "",
          resource.summaryZh,
          ...resource.tags,
          country?.nameZh ?? "",
          country?.nameEn ?? "",
          country?.code ?? "",
          institution?.nameZh ?? "",
          institution?.nameEn ?? "",
          institution?.shortName ?? "",
          ...resourceTopics.flatMap((topic) => [topic.titleZh, topic.titleEn]),
        ];
      })();

      const matchesKeyword = matchesText(searchValues, keyword, mode);
      const matchesCountry =
        isAllFilterValue(countryId) || resource.countryId === countryId;
      const matchesInstitution =
        isAllFilterValue(institutionId) || resource.institutionId === institutionId;
      const matchesType =
        isAllFilterValue(resourceType) || resource.resourceType === resourceType;
      const matchesTopic =
        isAllFilterValue(topicId) || resource.topicIds.includes(topicId);
      const matchesLinkStatus =
        isAllFilterValue(linkStatus) || resource.linkStatus === linkStatus;
      const matchesSnapshotStatus =
        snapshotStatus === "all" ||
        getResourceSnapshotStatus(resource.id).status === snapshotStatus;

      return (
        matchesKeyword &&
        matchesCountry &&
        matchesInstitution &&
        matchesType &&
        matchesTopic &&
        matchesLinkStatus &&
        matchesSnapshotStatus
      );
    }).sort(compareResourcesForStudy);
  }, [
    countryById,
    countryId,
    field,
    institutionById,
    institutionId,
    keyword,
    linkStatus,
    mode,
    resourceType,
    resources,
    snapshotStatus,
    topicById,
    topicId,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredResources.length / pageSize));
  const safeCurrentPage = Math.min(requestedPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * pageSize;
  const paginatedResources = filteredResources.slice(
    pageStartIndex,
    pageStartIndex + pageSize,
  );
  const paginationPages = Array.from({ length: totalPages }, (_, index) => index + 1)
    .filter(
      (page) =>
        totalPages <= 5 ||
        page === 1 ||
        page === totalPages ||
        Math.abs(page - safeCurrentPage) <= 1,
    );

  const selectedCountry = countryById.get(countryId);
  const selectedInstitution = institutionById.get(institutionId);
  const selectedTopic = topicById.get(topicId);
  const hasActiveFilters =
    keyword.trim().length > 0 ||
    field !== "all" ||
    !isAllFilterValue(countryId) ||
    !isAllFilterValue(institutionId) ||
    !isAllFilterValue(resourceType) ||
    !isAllFilterValue(topicId) ||
    !isAllFilterValue(linkStatus) ||
    snapshotStatus !== "all" ||
    mode !== "normal";

  const currentSearchItems = [
    keyword.trim() ? `关键词：“${keyword.trim()}”` : null,
    `检索字段：${searchFieldZh[field]}`,
    mode === "fuzzy" ? `检索模式：${searchModeZh[mode]}` : null,
    selectedCountry ? `国家地区：${selectedCountry.nameZh}` : null,
    selectedInstitution ? `机构：${selectedInstitution.nameZh}` : null,
    resourceType !== allValue ? `资料类型：${resourceTypeZh[resourceType]}` : null,
    selectedTopic ? `研究专题：${selectedTopic.titleZh}` : null,
    linkStatus !== allValue ? `链接状态：${linkStatusZh[linkStatus]}` : null,
    snapshotStatus !== "all"
      ? `快照状态：${snapshotStatusZh[snapshotStatus]}`
      : null,
  ].filter((item): item is string => Boolean(item));

  return (
    <section className="archive-ledger-section">
      <div className="archive-ledger-shell">
        <aside className="archive-ledger-sidebar">
          <div className="archive-ledger-sticky">
            <section className="archive-ledger-filter-card">
              <h2>资料类型</h2>
              <button
                type="button"
                className={`archive-ledger-filter-line ${
                  resourceType === allValue ? "is-active" : ""
                }`}
                onClick={() => updateState({ ...currentState, resourceType: allValue })}
              >
                <span>全部资料</span>
                <b>{resources.length}</b>
              </button>
              {resourceTypeOptions.map((item) => (
                <button
                  type="button"
                  key={item.value}
                  className={`archive-ledger-filter-line ${
                    resourceType === item.value ? "is-active" : ""
                  }`}
                  onClick={() =>
                    updateState({ ...currentState, resourceType: item.value })
                  }
                >
                  <span>{item.label}</span>
                  <b>{item.count}</b>
                </button>
              ))}
            </section>

            <section className="archive-ledger-filter-card">
              <h2>按专题筛选</h2>
              <button
                type="button"
                className={`archive-ledger-check-line ${
                  topicId === allValue ? "is-active" : ""
                }`}
                onClick={() => updateState({ ...currentState, topicId: allValue })}
              >
                <span>全部专题</span>
                <b>{resources.length}</b>
              </button>
              {topicOptions.slice(0, 6).map((topic) => (
                <button
                  type="button"
                  key={topic.id}
                  className={`archive-ledger-check-line ${
                    topicId === topic.id ? "is-active" : ""
                  }`}
                  onClick={() => updateState({ ...currentState, topicId: topic.id })}
                >
                  <span>{topic.titleZh}</span>
                  <b>{topic.count}</b>
                </button>
              ))}
            </section>

            <section className="archive-ledger-filter-card">
              <h2>筛选工具</h2>
              <SelectField
                id="country-filter"
                label="国家地区"
                value={countryId}
                onChange={(value) =>
                  updateState({ ...currentState, countryId: value })
                }
              >
                <option value={allValue}>全部国家地区</option>
                {countries.map((country) => (
                  <option key={country.id} value={country.id}>
                    {country.nameZh}
                  </option>
                ))}
              </SelectField>

              <SelectField
                id="institution-filter"
                label="机构"
                value={institutionId}
                onChange={(value) =>
                  updateState({ ...currentState, institutionId: value })
                }
              >
                <option value={allValue}>全部机构</option>
                {institutionOptions.map((institution) => (
                  <option key={institution.id} value={institution.id}>
                    {institution.nameZh}
                  </option>
                ))}
              </SelectField>

              <SelectField
                id="snapshot-status-filter"
                label="快照状态"
                value={snapshotStatus}
                onChange={(value) =>
                  updateState({
                    ...currentState,
                    snapshotStatus: value as SnapshotStatusFilter,
                  })
                }
              >
                {snapshotStatusOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                    {item.value === allValue ? "" : `（${item.count}）`}
                  </option>
                ))}
              </SelectField>
            </section>
          </div>
        </aside>

        <div className="archive-ledger-main">
          <div className="archive-ledger-paper-edges" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>

          <section className="archive-ledger-desk">
            <div className="archive-ledger-drawer-tab" aria-hidden="true">
              <span>打开档案抽屉</span>
            </div>

            <div className="archive-ledger-search-strip">
              <label className="archive-ledger-search-field">
                <span>标题 / 关键词</span>
                <input
                  value={draftKeyword}
                  onChange={(event) => setDraftKeyword(event.target.value)}
                  onCompositionStart={() => setIsKeywordComposing(true)}
                  onCompositionEnd={(event) => {
                    setIsKeywordComposing(false);
                    setDraftKeyword(event.currentTarget.value);
                  }}
                  onBlur={() => commitKeyword()}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" || isKeywordComposing) {
                      return;
                    }

                    event.preventDefault();
                    commitKeyword(event.currentTarget.value);
                  }}
                  placeholder="搜索标题、摘要、标签、机构、国家或专题"
                />
              </label>

              <SelectField
                id="field-filter"
                label="检索字段"
                value={field}
                onChange={(value) =>
                  updateState({ ...currentState, field: value as SearchField })
                }
              >
                {Object.entries(searchFieldZh).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </SelectField>

              <SelectField
                id="mode-filter"
                label="检索模式"
                value={mode}
                onChange={(value) =>
                  updateState({ ...currentState, mode: value as SearchMode })
                }
              >
                <option value="normal">{searchModeZh.normal}</option>
                <option value="fuzzy">{searchModeZh.fuzzy}</option>
              </SelectField>

              <button
                type="button"
                onClick={resetFilters}
                disabled={!hasActiveFilters}
                className="archive-ledger-reset"
              >
                重置
              </button>
            </div>

            <div className="archive-ledger-advanced">
              <SelectField
                id="resource-type-filter"
                label="资料类型"
                value={resourceType}
                onChange={(value) =>
                  updateState({
                    ...currentState,
                    resourceType: value as SelectValue<ResourceType>,
                  })
                }
              >
                <option value={allValue}>全部资料类型</option>
                {resourceTypeOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </SelectField>

              <SelectField
                id="topic-filter"
                label="研究专题"
                value={topicId}
                onChange={(value) => updateState({ ...currentState, topicId: value })}
              >
                <option value={allValue}>全部研究专题</option>
                {topics.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.titleZh}
                  </option>
                ))}
              </SelectField>

              <SelectField
                id="link-status-filter"
                label="链接状态"
                value={linkStatus}
                onChange={(value) =>
                  updateState({
                    ...currentState,
                    linkStatus: value as SelectValue<LinkStatus>,
                  })
                }
              >
                <option value={allValue}>全部链接状态</option>
                {linkStatusOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </SelectField>
            </div>

            <div className="archive-ledger-snapshot-note">
              <strong>图片与快照说明</strong>
              <p>
                部分资料暂无左侧预览图片，是因为官方页面可能限制自动截图、页面采用动态加载、来源文件不适合生成缩略图，或本站仍在分批补充网页快照。这不代表资料不可用；进入详情页后仍可查看官方来源、本站快照状态和可打开的备份文件。
              </p>
            </div>

            <div className="archive-ledger-summary">
              <div>
                <span>资料索引</span>
                <strong>{filteredResources.length}</strong>
                <small> / 共 {resources.length} 条</small>
              </div>
              {hasActiveFilters ? (
                <div className="archive-ledger-active-tags">
                  {currentSearchItems.map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
              ) : null}
            </div>

            {filteredResources.length > 0 ? (
              <div className="archive-ledger-table" role="table">
                <div className="archive-ledger-table-head" role="row">
                  <span>序号</span>
                  <span>来源快照</span>
                  <span>资料标题</span>
                  <span>专题 / 标签</span>
                  <span>状态</span>
                  <span>档案编号</span>
                </div>

                {paginatedResources.map((resource, index) => {
                  const country = countryById.get(resource.countryId);
                  const institution = institutionById.get(resource.institutionId);
                  const primaryTopic = topicById.get(resource.primaryTopicId);
                  const statusMeta = getPublicResourceStatusMeta(resource.status);
                  const snapshotStatus = getResourceSnapshotStatus(resource.id);
                  const snapshotActionMessage = snapshotActionMessages[resource.id];
                  const thumbnailUrl = getResourceThumbnail(resource);
                  const displayTitle = resource.titleZh || resource.titleEn;
                  const displaySummary =
                    truncateText(
                      resource.summaryShort ||
                        resource.summaryZh ||
                        "该资料由自动采集流程导入，中文简介待补充。",
                    );
                  const sourceMeta = [
                    resource.publishDate
                      ? `发布日期 ${formatResourceDate(resource.publishDate)}`
                      : null,
                    getSourceLabel(resource),
                    resource.sourceResourceIds?.length
                      ? `已合并 ${resource.sourceResourceIds.length + 1} 个同名来源`
                      : null,
                  ].filter((item): item is string => Boolean(item));
                  const globalIndex = pageStartIndex + index + 1;
                  const archiveRef = `AS-${String(globalIndex).padStart(3, "0")}`;

                  return (
                    <article
                      key={resource.id}
                      className="archive-ledger-row"
                      role="row"
                    >
                      <div className="archive-ledger-number" role="cell">
                        {String(globalIndex).padStart(2, "0")}
                      </div>

                      <Link
                        href={`/resources/${resource.slug}`}
                        className="archive-ledger-thumb"
                        role="cell"
                      >
                        {thumbnailUrl ? (
                          <img src={thumbnailUrl} alt="" loading="lazy" />
                        ) : (
                          <span>NO IMAGE</span>
                        )}
                      </Link>

                      <div className="archive-ledger-title-cell" role="cell">
                        <Link href={`/resources/${resource.slug}`}>
                          {displayTitle}
                        </Link>
                        <small>{resource.titleEn}</small>
                        <p>{displaySummary}</p>
                        <em>
                          {institution?.shortName || institution?.nameZh || "未标注机构"} ·{" "}
                          {country?.nameZh ?? "未标注国家"}
                          {sourceMeta.length ? ` · ${sourceMeta.join(" · ")}` : ""}
                        </em>
                        {snapshotActionMessage ? (
                          <span
                            className={`archive-ledger-admin-message is-${snapshotActionMessage.tone}`}
                          >
                            {snapshotActionMessage.text}
                          </span>
                        ) : null}
                      </div>

                      <div className="archive-ledger-tags-cell" role="cell">
                        <strong>{primaryTopic?.titleZh ?? "未标注专题"}</strong>
                        <div>
                          {resource.tags.slice(0, 3).map((tag) => (
                            <span key={tag}>{tag}</span>
                          ))}
                        </div>
                      </div>

                      <div className="archive-ledger-status-cell" role="cell">
                        {statusMeta.showBadge ? (
                          <span className="archive-ledger-status">
                            {statusMeta.label}
                          </span>
                        ) : null}
                        <span
                          className="archive-ledger-review-state"
                          title="中文介绍由 AI 辅助整理，并经网站管理员人工审核后发布。如发现问题，可通过网站说明页联系作者。"
                        >
                          AI 整理 / 人工审核
                        </span>
                        <span
                          className={`archive-ledger-snapshot ${
                            snapshotStatusBadgeClassName[snapshotStatus.status]
                          }`}
                        >
                          {snapshotStatus.label}
                        </span>
                        <span className={linkStatusBadge[resource.linkStatus]}>
                          {linkStatusZh[resource.linkStatus]}
                        </span>
                      </div>

                      <div className="archive-ledger-ref-cell" role="cell">
                        <strong>{archiveRef}</strong>
                        <span>{resourceTypeZh[resource.resourceType]}</span>
                        <Link href={`/resources/${resource.slug}`}>查看</Link>
                        <a
                          href={resource.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          来源
                        </a>
                        {adminSnapshotActionsEnabled ? (
                          <button
                            type="button"
                            onClick={() => void generateSnapshotForResource(resource)}
                            disabled={Boolean(runningSnapshotResourceId)}
                            className="archive-ledger-snapshot-action"
                          >
                            {runningSnapshotResourceId === resource.id
                              ? "补快照中"
                              : snapshotStatus.status === "complete"
                                ? "重新补快照"
                                : "补网页快照"}
                          </button>
                        ) : null}
                      </div>
                    </article>
                  );
                })}

                <nav className="archive-ledger-pagination" aria-label="资料库分页">
                  <span>
                    第 {safeCurrentPage} / {totalPages} 页
                  </span>
                  <div>
                    <button
                      type="button"
                      disabled={safeCurrentPage <= 1}
                      onClick={() => goToPage(safeCurrentPage - 1)}
                    >
                      上一页
                    </button>
                    {paginationPages.map((page, index) => {
                      const previousPage = paginationPages[index - 1];
                      const needsGap = previousPage && page - previousPage > 1;

                      return (
                        <span key={page} className="archive-ledger-page-slot">
                          {needsGap ? <i>…</i> : null}
                          <button
                            type="button"
                            className={page === safeCurrentPage ? "is-active" : ""}
                            onClick={() => goToPage(page)}
                          >
                            {page}
                          </button>
                        </span>
                      );
                    })}
                    <button
                      type="button"
                      disabled={safeCurrentPage >= totalPages}
                      onClick={() => goToPage(safeCurrentPage + 1)}
                    >
                      下一页
                    </button>
                  </div>
                </nav>
              </div>
            ) : (
              <div className="archive-ledger-empty">
                <h3>未找到匹配资料</h3>
                <p>可以更换关键词、减少筛选条件，或浏览全部资料。</p>
                <button type="button" onClick={resetFilters}>
                  浏览全部资料
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </section>
  );
}
