"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

interface AuditUser {
  _id: string;
  name?: string;
  email?: string;
  mobileNumber?: string;
}

interface AuditMetadata {
  changes?: string[];
  source?: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  diff?: Record<string, { from: unknown; to: unknown }>;
}

interface AuditLogEntry {
  _id: string;
  userId?: AuditUser;
  action: string;
  metadata?: AuditMetadata;
  ipAddress?: string;
  userAgent?: string;
  createdAt?: string;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const tryParseJson = (value: unknown) => {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const resolveFirst = (
  source: Record<string, unknown>,
  keys: string[],
): unknown => {
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null) {
      return tryParseJson(value);
    }
  }
  return undefined;
};

const buildFallbackDiff = (
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
) => {
  if (!before || !after) return {} as Record<string, { from: unknown; to: unknown }>;

  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const diff: Record<string, { from: unknown; to: unknown }> = {};

  keys.forEach((key) => {
    const from = before[key];
    const to = after[key];
    if (JSON.stringify(from) !== JSON.stringify(to)) {
      diff[key] = { from, to };
    }
  });

  return diff;
};

const normalizeMetadata = (log: AuditLogEntry) => {
  const logRecord = log as unknown as Record<string, unknown>;
  const metadata = isObject(log.metadata) ? log.metadata : {};
  const metadataRecord = metadata as Record<string, unknown>;

  const beforeRaw =
    resolveFirst(metadataRecord, [
      "before",
      "old",
      "previous",
      "prev",
      "oldValue",
      "beforeData",
      "oldData",
    ]) ??
    resolveFirst(logRecord, ["before", "oldValue", "beforeData"]);

  const afterRaw =
    resolveFirst(metadataRecord, [
      "after",
      "new",
      "next",
      "newValue",
      "afterData",
      "newData",
    ]) ?? resolveFirst(logRecord, ["after", "newValue", "afterData"]);

  const before = isObject(beforeRaw) ? beforeRaw : null;
  const after = isObject(afterRaw) ? afterRaw : null;

  const diffRaw =
    resolveFirst(metadataRecord, ["diff", "changesDiff", "delta", "patch"]) ??
    resolveFirst(logRecord, ["diff", "changesDiff"]);

  const diff = isObject(diffRaw)
    ? (diffRaw as Record<string, { from: unknown; to: unknown }>)
    : buildFallbackDiff(before, after);

  return {
    ...metadata,
    before,
    after,
    diff,
  } as AuditMetadata;
};

const formatJsonPanel = (value: unknown) => {
  if (value === null || value === undefined) return "No data";
  if (isObject(value) && Object.keys(value).length === 0) return "No data";
  return JSON.stringify(value, null, 2);
};

interface PaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const actionOptions = [
  { value: "all", label: "All actions" },
  {
    value: "user.notification_settings.updated",
    label: "Notification settings updated",
  },
];

const formatUser = (user?: AuditUser) => {
  if (!user) return "Unknown user";
  const label = user.name || user.email || user.mobileNumber || "Unknown user";
  const extra = user.email && user.name ? ` (${user.email})` : "";
  return `${label}${extra}`;
};

const formatDate = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const formatIpAddress = (ipAddress?: string) => {
  if (!ipAddress) return "-";

  let candidate = String(ipAddress).trim();
  if (!candidate) return "-";

  if (candidate.startsWith("[") && candidate.includes("]")) {
    candidate = candidate.slice(1, candidate.indexOf("]"));
  }

  if (candidate.includes(",")) {
    candidate = candidate
      .split(",")
      .map((value) => value.trim())
      .find(Boolean) || candidate;
  }

  if (candidate.toLowerCase() === "local" || candidate.toLowerCase() === "localhost") {
    return "127.0.0.1 (localhost)";
  }

  if (candidate.startsWith("::ffff:")) {
    candidate = candidate.replace("::ffff:", "");
  }

  if (candidate === "::1" || candidate === "0:0:0:0:0:0:0:1") {
    return "127.0.0.1 (localhost)";
  }

  const ipv4WithPort = candidate.match(/^(\d{1,3}(?:\.\d{1,3}){3}):(\d+)$/);
  if (ipv4WithPort) {
    candidate = ipv4WithPort[1];
  }

  return candidate || "-";
};

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [action, setAction] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(pagination.page));
    params.set("limit", String(pagination.limit));
    if (action && action !== "all") params.set("action", action);
    if (search) params.set("search", search);
    if (dateFrom) params.set("from", dateFrom);
    if (dateTo) params.set("to", dateTo);
    return params.toString();
  }, [action, dateFrom, dateTo, pagination.limit, pagination.page, search]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/audit-logs?${queryString}`);
      if (!response.ok) {
        throw new Error("Failed to fetch audit logs.");
      }
      const data = await response.json();
      setLogs(data.logs || []);
      setPagination((current) => ({
        ...current,
        total: data.pagination?.total ?? current.total,
        totalPages: data.pagination?.totalPages ?? current.totalPages,
      }));
    } catch (error) {
      console.error(error);
      toast.error("Unable to load audit logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [queryString]);

  const handleApplySearch = () => {
    setPagination((current) => ({ ...current, page: 1 }));
    setSearch(searchInput.trim());
  };

  const handleClearFilters = () => {
    setAction("all");
    setSearchInput("");
    setSearch("");
    setDateFrom("");
    setDateTo("");
    setPagination((current) => ({ ...current, page: 1 }));
  };

  const canGoPrev = pagination.page > 1;
  const canGoNext = pagination.page < pagination.totalPages;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
        <p className="text-sm text-gray-500">
          Track sensitive changes and system activity across the platform.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-600">
              Action
            </label>
            <select
              value={action}
              onChange={(event) => {
                setAction(event.target.value);
                setPagination((current) => ({ ...current, page: 1 }));
              }}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            >
              {actionOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-600">
              Search
            </label>
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="User, action, source"
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-600">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => {
                setDateFrom(event.target.value);
                setPagination((current) => ({ ...current, page: 1 }));
              }}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-600">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(event) => {
                setDateTo(event.target.value);
                setPagination((current) => ({ ...current, page: 1 }));
              }}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </div>

          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={handleApplySearch}
              className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
            >
              Apply
            </button>
            <button
              type="button"
              onClick={handleClearFilters}
              className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-gray-300"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Time
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                  User
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Action
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Changes
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Source
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                  IP
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-6 text-center text-sm text-gray-500"
                  >
                    Loading audit logs...
                  </td>
                </tr>
              )}
              {!loading && logs.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-6 text-center text-sm text-gray-500"
                  >
                    No audit logs found.
                  </td>
                </tr>
              )}
              {!loading &&
                logs.map((log) => {
                  const normalizedMetadata = normalizeMetadata(log);
                  const changes = log.metadata?.changes?.length
                    ? log.metadata.changes.join(", ")
                    : "-";
                  const isExpanded = expandedLogId === log._id;

                  return (
                    <Fragment key={log._id}>
                      <tr key={log._id}>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {formatDate(log.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {formatUser(log.userId)}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {log.action}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {changes}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {log.metadata?.source || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {formatIpAddress(log.ipAddress)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedLogId(isExpanded ? null : log._id)
                            }
                            className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 hover:border-gray-300"
                          >
                            {isExpanded ? "Hide" : "View"}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={7} className="bg-gray-50 px-6 py-4">
                            <div className="grid gap-4 lg:grid-cols-3">
                              <div className="space-y-2">
                                <p className="text-xs font-semibold text-gray-600">
                                  Diff
                                </p>
                                <pre className="max-h-56 overflow-auto rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-700">
                                  {formatJsonPanel(normalizedMetadata.diff)}
                                </pre>
                              </div>
                              <div className="space-y-2">
                                <p className="text-xs font-semibold text-gray-600">
                                  Before
                                </p>
                                <pre className="max-h-56 overflow-auto rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-700">
                                  {formatJsonPanel(normalizedMetadata.before)}
                                </pre>
                              </div>
                              <div className="space-y-2">
                                <p className="text-xs font-semibold text-gray-600">
                                  After
                                </p>
                                <pre className="max-h-56 overflow-auto rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-700">
                                  {formatJsonPanel(normalizedMetadata.after)}
                                </pre>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 px-4 py-3 text-sm text-gray-600">
          <span>
            Page {pagination.page} of {pagination.totalPages} •{" "}
            {pagination.total} total
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setPagination((current) => ({
                  ...current,
                  page: Math.max(1, current.page - 1),
                }))
              }
              disabled={!canGoPrev}
              className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() =>
                setPagination((current) => ({
                  ...current,
                  page: Math.min(current.totalPages, current.page + 1),
                }))
              }
              disabled={!canGoNext}
              className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
