import { useState } from "react";
import {
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUpRight,
} from "lucide-react";
import { useLive } from "../hooks/useLive";
import { get, errorText } from "../services/api";
import toast from "react-hot-toast";
import { Badge, Empty, Drawer, time, short } from "./UI";
export default function EventTable({ compact = false }) {
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState(""),
    [page, setPage] = useState(0),
    [sort, setSort] = useState("createdAt"),
    [order, setOrder] = useState("desc"),
    [detail, setDetail] = useState(null);
  const query = new URLSearchParams({
    search,
    status,
    page,
    size: compact ? 5 : 10,
    sort,
    order,
  });
  const { data, error, loading } = useLive("/events?" + query);
  async function inspect(id) {
    try {
      setDetail(await get("/events/" + id));
    } catch (e) {
      toast.error(errorText(e));
    }
  }
  async function csv() {
    try {
      let all = [],
        p = 0,
        total = 0;
      do {
        const d = await get(
          "/events?" +
            new URLSearchParams({
              search,
              status,
              page: p++,
              size: 100,
              sort,
              order,
            }),
        );
        all.push(...d.items);
        total = d.total;
      } while (all.length < total);
      const columns = [
        "eventId",
        "eventType",
        "topic",
        "status",
        "attempts",
        "createdAt",
        "processedAt",
        "errorDetails",
      ];
      const cell = (v) =>
        '"' +
        String(v ?? "")
          .replace(/^[=+@-]/, "'$&")
          .replaceAll('"', '""') +
        '"';
      const blob = new Blob(
        [
          "﻿" +
            [columns, ...all.map((e) => columns.map((c) => e[c]))]
              .map((row) => row.map(cell).join(","))
              .join("\r\n"),
        ],
        { type: "text/csv;charset=utf-8" },
      );
      const url = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = url;
      a.download = "eventflow-events.csv";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      toast.error(errorText(e));
    }
  }
  return (
    <>
      {!compact && (
        <div className="table-tools">
          <label className="search">
            <Search size={16} />
            <input
              aria-label="Search events"
              placeholder="Search event ID, title, or scenario…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
            />
          </label>
          <select
            aria-label="Filter status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(0);
            }}
          >
            <option value="">All statuses</option>
            {[
              "SCHEDULED",
              "QUEUED",
              "PROCESSING",
              "SUCCESS",
              "RETRYING",
              "FAILED",
              "DLQ",
            ].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select
            aria-label="Sort column"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="createdAt">Created time</option>
            <option value="attempts">Attempts</option>
            <option value="status">Status</option>
          </select>
          <button
            className="icon-button"
            title="Reverse sort"
            aria-label="Reverse sort"
            onClick={() => setOrder(order === "desc" ? "asc" : "desc")}
          >
            <ArrowUpDown size={17} />
          </button>
          <button className="button secondary" onClick={csv}>
            <Download size={15} />
            Export CSV
          </button>
        </div>
      )}
      {error ? (
        <Empty
          title="Connection interrupted"
          text="The event history will reconnect automatically when the backend is available."
        />
      ) : loading ? (
        <div className="skeleton m-5 h-36" />
      ) : !data?.items.length ? (
        <Empty
          title={
            search || status
              ? "No matching events"
              : "Your event history starts here"
          }
        />
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Event / ID</th>
                {!compact && (
                  <>
                    <th>Type / Topic</th>
                  </>
                )}
                <th>Status</th>
                <th>Attempts</th>
                <th>Created</th>
                {!compact && (
                  <>
                    <th>Processed</th>
                    <th>Error</th>
                  </>
                )}
                <th />
              </tr>
            </thead>
            <tbody>
              {data.items.map((e) => (
                <tr key={e.eventId}>
                  <td>
                    <strong>{e.title}</strong>
                    <code>{short(e.eventId)}</code>
                  </td>
                  {!compact && (
                    <td>
                      {e.eventType}
                      <code>{e.topic}</code>
                    </td>
                  )}
                  <td>
                    <Badge status={e.status} />
                  </td>
                  <td>
                    <span className="attempt-number">{e.attempts}</span>
                  </td>
                  <td>{time(e.createdAt)}</td>
                  {!compact && (
                    <>
                      <td>{time(e.processedAt)}</td>
                      <td className="truncate-cell" title={e.errorDetails}>
                        {e.errorDetails || "—"}
                      </td>
                    </>
                  )}
                  <td>
                    <button
                      className="icon-button"
                      aria-label={"Inspect " + e.title}
                      onClick={() => inspect(e.eventId)}
                    >
                      <ArrowUpRight size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!compact && (
        <div className="pagination">
          <span>
            {data?.total || 0} events · Page {page + 1} of{" "}
            {Math.max(1, Math.ceil((data?.total || 0) / 10))}
          </span>
          <div>
            <button
              className="icon-button"
              aria-label="Previous page"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft size={17} />
            </button>
            <button
              className="icon-button"
              aria-label="Next page"
              disabled={(page + 1) * 10 >= (data?.total || 0)}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight size={17} />
            </button>
          </div>
        </div>
      )}
      {detail && <Drawer detail={detail} onClose={() => setDetail(null)} />}
    </>
  );
}
