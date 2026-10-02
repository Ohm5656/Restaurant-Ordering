"use client";

import {
  CalendarDays,
  ChevronRight,
  Clock3,
  History,
  ReceiptText,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import type { HistorySession } from "@/lib/data/admin";
import { formatBaht } from "@/lib/types";

const periods = [
  { key: 1, label: "วันนี้" },
  { key: 7, label: "7 วัน" },
  { key: 30, label: "30 วัน" },
  { key: 0, label: "ทั้งหมด" },
];

export function HistoryView({ sessions }: { sessions: HistorySession[] }) {
  const [days, setDays] = useState(7);
  const [search, setSearch] = useState("");
  const [referenceTime] = useState(() => Date.now());
  const filtered = useMemo(
    () =>
      sessions.filter((session) => {
        const recent =
          days === 0 ||
          new Date(session.closedAt).getTime() >=
            referenceTime - days * 86_400_000;
        const query = search.trim().toLowerCase();
        return (
          recent &&
          (!query ||
            session.tableName.toLowerCase().includes(query) ||
            session.orderNumbers.some((number) =>
              String(number).includes(query),
            ))
        );
      }),
    [days, referenceTime, search, sessions],
  );
  const total = filtered.reduce((sum, session) => sum + session.totalSatang, 0);

  return (
    <>
      <header className="admin-header">
        <div className="admin-title">
          <div>
            <p>เซสชันโต๊ะที่ปิดแล้ว</p>
            <div className="page-title">ประวัติการให้บริการ</div>
          </div>
        </div>
      </header>
      <div className="history-summary">
        <div>
          <span>
            <History />
          </span>
          <p>
            จำนวนเซสชัน<strong>{filtered.length}</strong>
          </p>
        </div>
        <div>
          <span>
            <ReceiptText />
          </span>
          <p>
            ยอดรวมในช่วงนี้<strong>{formatBaht(total)}</strong>
          </p>
        </div>
      </div>
      <div className="history-toolbar">
        <div className="filter-pills">
          {periods.map((period) => (
            <button
              className={days === period.key ? "active" : ""}
              onClick={() => setDays(period.key)}
              key={period.key}
            >
              {period.label}
            </button>
          ))}
        </div>
        <label className="admin-search">
          <Search />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ค้นหาโต๊ะหรือ Order ID..."
          />
        </label>
      </div>
      <div className="history-list">
        {filtered.map((session) => (
          <Link
            className="history-row"
            href={`/admin/bill/${session.id}`}
            key={session.id}
          >
            <div className="history-table">
              <strong>โต๊ะ {session.tableName}</strong>
              <small>
                {session.guestCount
                  ? `${session.guestCount} คน`
                  : "ไม่ระบุจำนวนลูกค้า"}
              </small>
            </div>
            <div>
              <span>
                <CalendarDays />
                {new Intl.DateTimeFormat("th-TH", {
                  dateStyle: "medium",
                }).format(new Date(session.closedAt))}
              </span>
              <small>
                <Clock3 />
                {new Intl.DateTimeFormat("th-TH", {
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(new Date(session.openedAt))}
                –
                {new Intl.DateTimeFormat("th-TH", {
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(new Date(session.closedAt))}
              </small>
            </div>
            <div>
              <span>{session.orderCount} ออเดอร์</span>
              <small>{session.paymentMethod ?? "ไม่ระบุวิธีชำระ"}</small>
            </div>
            <strong>{formatBaht(session.totalSatang)}</strong>
            <ChevronRight />
          </Link>
        ))}
        {filtered.length === 0 && (
          <div className="management-empty">
            <History />
            <strong>ไม่พบประวัติในช่วงที่เลือก</strong>
          </div>
        )}
      </div>
    </>
  );
}
