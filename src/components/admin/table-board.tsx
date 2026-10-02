"use client";

import {
  Bell,
  BellRing,
  Check,
  ChevronRight,
  Clock3,
  Grid2X2,
  List,
  LoaderCircle,
  Plus,
  Printer,
  QrCode,
  ReceiptText,
  Search,
  Settings2,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useMemo, useRef, useState } from "react";

import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { TableOperationalState, TableSummary } from "@/lib/types";
import { formatBaht } from "@/lib/types";

const stateLabels: Record<TableOperationalState, string> = {
  AVAILABLE: "ว่าง",
  ACTIVE: "กำลังใช้บริการ",
  NEW_ORDER: "ออเดอร์ใหม่",
  PREPARING: "กำลังเตรียม",
  READY: "พร้อมเสิร์ฟ",
  CALLING_STAFF: "เรียกพนักงาน",
  REQUEST_BILL: "ขอเช็กบิล",
};

const stateClasses: Record<TableOperationalState, string> = {
  AVAILABLE: "free",
  ACTIVE: "dining",
  NEW_ORDER: "new",
  PREPARING: "dining",
  READY: "ready",
  CALLING_STAFF: "call",
  REQUEST_BILL: "bill",
};

const filterOptions: Array<[TableOperationalState | "ALL", string]> = [
  ["ALL", "ทั้งหมด"],
  ["ACTIVE", "ใช้งาน"],
  ["NEW_ORDER", "ออเดอร์ใหม่"],
  ["READY", "พร้อมเสิร์ฟ"],
  ["CALLING_STAFF", "เรียกพนักงาน"],
  ["REQUEST_BILL", "เช็กบิล"],
];

function elapsed(openedAt: string | null) {
  if (!openedAt) return "00:00";
  const minutes = Math.max(
    0,
    Math.floor((Date.now() - new Date(openedAt).getTime()) / 60_000),
  );
  return minutes < 60
    ? `${minutes} นาที`
    : `${Math.floor(minutes / 60)} ชม. ${minutes % 60} นาที`;
}

function orderStatusLabel(status: string) {
  const labels: Record<string, string> = {
    NEW: "ออเดอร์ใหม่",
    ACCEPTED: "รับแล้ว",
    PREPARING: "กำลังเตรียม",
    READY: "พร้อมเสิร์ฟ",
    SERVED: "เสิร์ฟแล้ว",
  };
  return labels[status] ?? status;
}

export function TableBoard({
  initialTables,
  restaurantId,
}: {
  initialTables: TableSummary[];
  restaurantId: string;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<TableOperationalState | "ALL">("ALL");
  const [zone, setZone] = useState<string>(
    initialTables.length > 30 ? (initialTables[0]?.zoneId ?? "ALL") : "ALL",
  );
  const [view, setView] = useState<"visual" | "compact">(
    initialTables.length > 50 ? "compact" : "visual",
  );
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState<TableSummary | null>(null);
  const [addDialog, setAddDialog] = useState(false);
  const [closeDialog, setCloseDialog] = useState<TableSummary | null>(null);
  const [qrData, setQrData] = useState<{
    tableName: string;
    url: string;
    sessionId: string;
  } | null>(null);
  const [notice, setNotice] = useState("");
  const refreshTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!isSupabaseConfigured || restaurantId === "demo") return;
    const supabase = createSupabaseBrowserClient();
    const refresh = () => {
      window.clearTimeout(refreshTimer.current);
      refreshTimer.current = window.setTimeout(() => router.refresh(), 250);
    };
    const channel = supabase
      .channel(`restaurant-operations:${restaurantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        refresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "table_sessions",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        refresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "staff_calls",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        refresh,
      )
      .subscribe();
    return () => {
      window.clearTimeout(refreshTimer.current);
      void supabase.removeChannel(channel);
    };
  }, [restaurantId, router]);

  const zones = useMemo(
    () =>
      Array.from(
        new Map(
          initialTables.map((table) => [table.zoneId, table.zoneName]),
        ).entries(),
      ),
    [initialTables],
  );
  const splitByZone = initialTables.length > 30;
  const visibleTables = initialTables.filter(
    (table) =>
      (filter === "ALL" || table.state === filter) &&
      (!splitByZone || zone === "ALL" || table.zoneId === zone) &&
      table.name
        .toLocaleLowerCase()
        .includes(search.trim().toLocaleLowerCase()),
  );
  const selected =
    initialTables.find((table) => table.id === selectedId) ?? null;
  const groupedTables =
    !splitByZone || zone === "ALL"
      ? zones.map(
          ([zoneId, zoneName]) =>
            [
              zoneName,
              visibleTables.filter((table) => table.zoneId === zoneId),
            ] as const,
        )
      : [
          [
            zones.find(([zoneId]) => zoneId === zone)?.[1] ?? "โซน",
            visibleTables,
          ] as const,
        ];
  const attentionCount = initialTables.filter((table) =>
    ["NEW_ORDER", "READY", "CALLING_STAFF", "REQUEST_BILL"].includes(
      table.state,
    ),
  ).length;

  const flash = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2600);
  };

  const openTable = async (formData: FormData) => {
    if (!openDialog) return;
    const response = await fetch("/api/admin/tables/open", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        tableId: openDialog.id,
        guestCount: Number(formData.get("guestCount")) || null,
      }),
    });
    const body = (await response.json()) as {
      message?: string;
      token?: string;
      sessionId?: string;
      orderUrl?: string;
    };
    if (!response.ok || !body.orderUrl || !body.sessionId)
      return flash(body.message ?? "เปิดโต๊ะไม่สำเร็จ");
    setOpenDialog(null);
    setQrData({
      tableName: openDialog.name,
      url: body.orderUrl,
      sessionId: body.sessionId,
    });
    router.refresh();
  };

  const closeTable = async (formData: FormData) => {
    if (!closeDialog?.sessionId) return;
    const response = await fetch("/api/admin/tables/close", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sessionId: closeDialog.sessionId,
        paymentMethod: formData.get("paymentMethod"),
      }),
    });
    const body = (await response.json()) as { message?: string };
    if (!response.ok) return flash(body.message ?? "ปิดโต๊ะไม่สำเร็จ");
    flash(`ปิดโต๊ะ ${closeDialog.name} แล้ว`);
    setCloseDialog(null);
    router.refresh();
  };

  const showQr = async (table: TableSummary) => {
    if (!table.sessionId) return;
    const response = await fetch(`/api/admin/sessions/${table.sessionId}/qr`, {
      cache: "no-store",
    });
    const body = (await response.json()) as {
      orderUrl?: string;
      message?: string;
    };
    if (!response.ok || !body.orderUrl)
      return flash(body.message ?? "เปิด QR ไม่สำเร็จ");
    setQrData({
      tableName: table.name,
      url: body.orderUrl,
      sessionId: table.sessionId,
    });
  };

  const addTable = async (formData: FormData) => {
    const response = await fetch("/api/admin/tables", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        capacity: Number(formData.get("capacity")),
        zoneId: formData.get("zoneId"),
      }),
    });
    const body = (await response.json()) as { message?: string };
    if (!response.ok) return flash(body.message ?? "เพิ่มโต๊ะไม่สำเร็จ");
    setAddDialog(false);
    flash("เพิ่มโต๊ะเรียบร้อยแล้ว");
    router.refresh();
  };

  const downloadQr = () => {
    const svg = document.querySelector(".qr-card svg");
    if (!svg || !qrData) return;
    const source = new XMLSerializer().serializeToString(svg);
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(
      new Blob([source], { type: "image/svg+xml" }),
    );
    anchor.download = `QR-${qrData.tableName}.svg`;
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  };

  return (
    <>
      {notice && (
        <div className="toast">
          <Check />
          {notice}
        </div>
      )}
      <header className="admin-header">
        <div className="admin-title">
          <div>
            <p>ภาพรวมการให้บริการปัจจุบัน</p>
            <div className="page-title">Table Operations</div>
          </div>
        </div>
        <div className="admin-actions">
          <div className="store-open">
            <span /> ร้านเปิดอยู่
          </div>
          <Link className="btn stock-button" href="/admin/tables/manage">
            <Settings2 />
            จัดการโต๊ะ
          </Link>
          <button className="btn new-table" onClick={() => setAddDialog(true)}>
            <Plus />
            เพิ่มโต๊ะ
          </button>
        </div>
      </header>
      <div className="status-summary">
        <div>
          <span className="summary-icon neutral">
            <Grid2X2 />
          </span>
          <p>
            โต๊ะทั้งหมด<strong>{initialTables.length}</strong>
          </p>
        </div>
        <div>
          <span className="summary-icon green">
            <Users />
          </span>
          <p>
            กำลังใช้งาน
            <strong>
              {
                initialTables.filter((table) => table.state !== "AVAILABLE")
                  .length
              }
            </strong>
          </p>
        </div>
        <div>
          <span className="summary-icon amber">
            <ReceiptText />
          </span>
          <p>
            ออเดอร์ใหม่
            <strong>
              {
                initialTables.filter((table) => table.state === "NEW_ORDER")
                  .length
              }
            </strong>
          </p>
        </div>
        <div>
          <span className="summary-icon red">
            <Bell />
          </span>
          <p>
            ต้องดูแล<strong>{attentionCount}</strong>
          </p>
        </div>
      </div>
      <div className="board-toolbar">
        <div className="filter-pills">
          {filterOptions.map(([key, label]) => (
            <button
              className={filter === key ? "active" : ""}
              onClick={() => setFilter(key)}
              key={key}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="board-tools">
          <label className="admin-search">
            <Search />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ค้นหาโต๊ะ..."
            />
          </label>
          <div className="view-switch">
            <button
              className={view === "visual" ? "active" : ""}
              aria-label="มุมมองผัง"
              onClick={() => setView("visual")}
            >
              <Grid2X2 />
            </button>
            <button
              className={view === "compact" ? "active" : ""}
              aria-label="มุมมองรายการ"
              onClick={() => setView("compact")}
            >
              <List />
            </button>
          </div>
        </div>
      </div>
      {splitByZone && (
        <nav className="zone-tabs">
          <button
            className={zone === "ALL" ? "active" : ""}
            onClick={() => setZone("ALL")}
          >
            ทุกโซน
          </button>
          {zones.map(([id, name]) => (
            <button
              className={zone === id ? "active" : ""}
              onClick={() => setZone(id)}
              key={id}
            >
              {name}
              <i>
                {initialTables.filter((table) => table.zoneId === id).length}
              </i>
            </button>
          ))}
        </nav>
      )}
      <div
        className={`operations-layout ${
          view === "compact" ? "compact-layout" : ""
        } ${selected && selected.state !== "AVAILABLE" ? "has-panel" : ""}`}
      >
        <div className="table-zones">
          {groupedTables.map(
            ([groupName, tables]) =>
              tables.length > 0 && (
                <section className="table-zone-section" key={groupName}>
                  <div className="zone-heading">
                    <div>
                      <span>ZONE</span>
                      <strong>
                        {groupName === "ALL" ? "ทุกโซน" : groupName}
                      </strong>
                    </div>
                    <small>
                      {tables.length} โต๊ะ ·{" "}
                      {
                        tables.filter((table) => table.state !== "AVAILABLE")
                          .length
                      }{" "}
                      กำลังใช้งาน
                    </small>
                  </div>
                  <div
                    className={
                      view === "visual" ? "table-board" : "compact-table-list"
                    }
                  >
                    {tables.map((table) =>
                      view === "visual" ? (
                        <button
                          className={`game-table state-${stateClasses[table.state]} ${
                            selectedId === table.id ? "selected" : ""
                          }`}
                          onClick={() =>
                            table.state === "AVAILABLE"
                              ? setOpenDialog(table)
                              : setSelectedId(table.id)
                          }
                          key={table.id}
                        >
                          {table.state !== "AVAILABLE" &&
                            table.attentionCount > 0 && (
                              <div
                                className={`order-bubble ${stateClasses[table.state]}`}
                              >
                                <span className="bubble-label">
                                  {stateLabels[table.state]}
                                </span>
                                {table.latestItems.slice(0, 2).map((item) => (
                                  <b key={item}>{item}</b>
                                ))}
                              </div>
                            )}
                          <div className="chair chair-top" />
                          <div className="chair chair-left" />
                          <div className="chair chair-right" />
                          <div className="table-top">
                            <span>{table.name}</span>
                            <small>
                              <Users size={13} />
                              {table.seats}
                            </small>
                          </div>
                          <div className="table-meta">
                            {table.state === "AVAILABLE" ? (
                              <span>แตะเพื่อเปิดโต๊ะ</span>
                            ) : (
                              <>
                                <b>
                                  <Clock3 size={13} />
                                  {elapsed(table.openedAt)}
                                </b>
                                <strong>{formatBaht(table.totalSatang)}</strong>
                              </>
                            )}
                          </div>
                        </button>
                      ) : (
                        <button
                          className={`compact-table state-${stateClasses[table.state]}`}
                          onClick={() =>
                            table.state === "AVAILABLE"
                              ? setOpenDialog(table)
                              : setSelectedId(table.id)
                          }
                          key={table.id}
                        >
                          <span
                            className={`state-dot ${stateClasses[table.state]}`}
                          />
                          <strong>{table.name}</strong>
                          <small>{stateLabels[table.state]}</small>
                          <span>
                            {table.state === "AVAILABLE"
                              ? `${table.seats} ที่นั่ง`
                              : elapsed(table.openedAt)}
                          </span>
                          <b>
                            {table.state === "AVAILABLE"
                              ? ""
                              : formatBaht(table.totalSatang)}
                          </b>
                          <ChevronRight />
                        </button>
                      ),
                    )}
                  </div>
                </section>
              ),
          )}
        </div>
        {selected && selected.state !== "AVAILABLE" && (
          <TablePanel
            key={selected.sessionId}
            table={selected}
            onClose={() => setSelectedId(null)}
            onCloseTable={() => setCloseDialog(selected)}
            onShowQr={() => void showQr(selected)}
            onViewBill={() =>
              selected.sessionId &&
              router.push(`/admin/bill/${selected.sessionId}`)
            }
          />
        )}
      </div>
      {openDialog && (
        <div
          className="modal-backdrop admin-modal-backdrop"
          onMouseDown={() => setOpenDialog(null)}
        >
          <form
            className="admin-form-modal"
            action={openTable}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="sheet-head">
              <div>
                <div className="eyebrow dark">Open table</div>
                <div className="section-title">เปิดโต๊ะ {openDialog.name}</div>
              </div>
              <button
                className="icon-btn"
                type="button"
                aria-label="ปิด"
                onClick={() => setOpenDialog(null)}
              >
                <X />
              </button>
            </div>
            <label className="form-field">
              <span>จำนวนลูกค้า (ไม่บังคับ)</span>
              <input
                name="guestCount"
                type="number"
                min="1"
                max="100"
                defaultValue={Math.min(openDialog.seats, 4)}
              />
            </label>
            <button className="btn confirm-order" type="submit">
              เปิดโต๊ะและสร้าง QR <QrCode />
            </button>
          </form>
        </div>
      )}
      {addDialog && (
        <div
          className="modal-backdrop admin-modal-backdrop"
          onMouseDown={() => setAddDialog(false)}
        >
          <form
            className="admin-form-modal"
            action={addTable}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="sheet-head">
              <div>
                <div className="eyebrow dark">Table setup</div>
                <div className="section-title">เพิ่มโต๊ะใหม่</div>
              </div>
              <button
                className="icon-btn"
                type="button"
                aria-label="ปิด"
                onClick={() => setAddDialog(false)}
              >
                <X />
              </button>
            </div>
            <div className="form-grid">
              <label className="form-field">
                <span>ชื่อโต๊ะ</span>
                <input
                  name="name"
                  placeholder="เช่น A09"
                  maxLength={40}
                  required
                />
              </label>
              <label className="form-field">
                <span>จำนวนที่นั่ง</span>
                <input
                  name="capacity"
                  defaultValue="4"
                  type="number"
                  min="1"
                  max="100"
                  required
                />
              </label>
              <label className="form-field full">
                <span>โซน</span>
                <select name="zoneId" required>
                  {zones.map(([id, name]) => (
                    <option value={id} key={id}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <button className="btn confirm-order" type="submit">
              บันทึกโต๊ะ <ChevronRight />
            </button>
          </form>
        </div>
      )}
      {qrData && (
        <div
          className="modal-backdrop admin-modal-backdrop qr-modal"
          onMouseDown={() => setQrData(null)}
        >
          <section
            className="admin-form-modal qr-card"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="sheet-head no-print">
              <div>
                <div className="eyebrow dark">Session QR</div>
                <div className="section-title">โต๊ะ {qrData.tableName}</div>
              </div>
              <button
                className="icon-btn"
                aria-label="ปิด"
                onClick={() => setQrData(null)}
              >
                <X />
              </button>
            </div>
            <div className="qr-print-brand">
              <span>S</span>
              <strong>SAVOUR</strong>
            </div>
            <QRCodeSVG value={qrData.url} size={260} level="H" includeMargin />
            <h2>โต๊ะ {qrData.tableName}</h2>
            <p>สแกนเพื่อสั่งอาหาร</p>
            <div className="qr-actions no-print">
              <button className="btn" onClick={downloadQr}>
                <QrCode />
                ดาวน์โหลด
              </button>
              <button
                className="btn confirm-order"
                onClick={() => window.print()}
              >
                <Printer />
                พิมพ์ QR
              </button>
            </div>
          </section>
        </div>
      )}
      {closeDialog && (
        <div
          className="modal-backdrop admin-modal-backdrop"
          onMouseDown={() => setCloseDialog(null)}
        >
          <form
            className="admin-form-modal"
            action={closeTable}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="sheet-head">
              <div>
                <div className="eyebrow dark">Close table</div>
                <div className="section-title">ปิดโต๊ะ {closeDialog.name}</div>
              </div>
              <button
                type="button"
                className="icon-btn"
                aria-label="ปิด"
                onClick={() => setCloseDialog(null)}
              >
                <X />
              </button>
            </div>
            <div className="closing-total">
              <span>ยอดที่ต้องยืนยัน</span>
              <strong>{formatBaht(closeDialog.totalSatang)}</strong>
            </div>
            <label className="form-field">
              <span>วิธีรับชำระ</span>
              <select name="paymentMethod" defaultValue="CASH">
                <option value="CASH">เงินสด</option>
                <option value="TRANSFER">โอนเงิน</option>
                <option value="CARD">บัตร</option>
                <option value="OTHER">อื่น ๆ</option>
              </select>
            </label>
            <div className="friendly-hint">
              <ReceiptText />
              <span>
                เมื่อยืนยัน QR เดิมจะหมดอายุและโต๊ะจะกลับเป็นสถานะว่าง
              </span>
            </div>
            <button className="btn confirm-order">ยืนยันชำระและปิดโต๊ะ</button>
          </form>
        </div>
      )}
    </>
  );
}

function TablePanel({
  table,
  onClose,
  onCloseTable,
  onShowQr,
  onViewBill,
}: {
  table: TableSummary;
  onClose: () => void;
  onCloseTable: () => void;
  onShowQr: () => void;
  onViewBill: () => void;
}) {
  const router = useRouter();
  const [detail, setDetail] = useState<{
    orders: Array<{
      id: string;
      number: number;
      status: string;
      createdAt: string;
      items: Array<{ name: string; quantity: number; note: string | null }>;
    }>;
    calls: Array<{ id: string; type: string; createdAt: string }>;
  } | null>(null);
  const [detailError, setDetailError] = useState("");
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);

  useEffect(() => {
    if (!table.sessionId) return;
    const controller = new AbortController();
    void fetch(`/api/admin/sessions/${table.sessionId}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = (await response.json()) as typeof detail & {
          message?: string;
        };
        if (!response.ok || !body)
          throw new Error(body?.message ?? "โหลดรายละเอียดโต๊ะไม่สำเร็จ");
        setDetail({ orders: body.orders, calls: body.calls });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        setDetailError(
          error instanceof Error
            ? error.message
            : "โหลดรายละเอียดโต๊ะไม่สำเร็จ",
        );
      });
    return () => controller.abort();
  }, [table.attentionCount, table.sessionId, table.totalSatang]);

  const acknowledgeCall = async (callId: string) => {
    setAcknowledgingId(callId);
    const response = await fetch(`/api/admin/calls/${callId}/ack`, {
      method: "POST",
    });
    setAcknowledgingId(null);
    if (!response.ok) return setDetailError("รับทราบคำเรียกไม่สำเร็จ");
    setDetail((current) =>
      current
        ? {
            ...current,
            calls: current.calls.filter((call) => call.id !== callId),
          }
        : current,
    );
    router.refresh();
  };

  return (
    <aside className="table-panel">
      <div className="panel-head">
        <div>
          <span className={`state-dot ${stateClasses[table.state]}`} />
          <div>
            <small>TABLE</small>
            <strong>{table.name}</strong>
          </div>
        </div>
        <button
          className="icon-btn"
          aria-label="ปิดรายละเอียด"
          onClick={onClose}
        >
          <X />
        </button>
      </div>
      <div className="panel-status">
        <span className={stateClasses[table.state]}>
          {stateLabels[table.state]}
        </span>
        <small>
          <Clock3 size={14} />
          เปิดมาแล้ว {elapsed(table.openedAt)}
        </small>
      </div>
      <div className="guest-row">
        <span>
          <Users />
        </span>
        <div>
          <small>จำนวนลูกค้า</small>
          <strong>
            {table.guestCount ? `${table.guestCount} คน` : "ไม่ได้ระบุ"}
          </strong>
        </div>
      </div>
      <div className="panel-section-title">
        <span>ข้อมูลโต๊ะปัจจุบัน</span>
      </div>
      <div className="table-detail-summary">
        <div>
          <span>ยอดรวม</span>
          <strong>{formatBaht(table.totalSatang)}</strong>
        </div>
        <div>
          <span>รายการที่ต้องดูแล</span>
          <strong>{table.attentionCount}</strong>
        </div>
      </div>
      <div className="panel-section-title">
        <span>คำเรียกและออเดอร์</span>
      </div>
      {!detail && !detailError && (
        <div className="panel-loading">
          <LoaderCircle /> กำลังโหลด
        </div>
      )}
      {detailError && <div className="panel-inline-error">{detailError}</div>}
      {detail?.calls.map((call) => (
        <div className="staff-call-row" key={call.id}>
          <BellRing />
          <div>
            <strong>
              {call.type === "BILL" ? "ขอเช็กบิล" : "เรียกพนักงาน"}
            </strong>
            <small>
              {new Date(call.createdAt).toLocaleTimeString("th-TH", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </small>
          </div>
          <button
            className="btn"
            disabled={acknowledgingId === call.id}
            onClick={() => void acknowledgeCall(call.id)}
          >
            <Check />
            รับทราบ
          </button>
        </div>
      ))}
      <div className="panel-order-list">
        {detail?.orders.map((order) => (
          <article key={order.id}>
            <header>
              <strong>ORDER #{order.number}</strong>
              <span>{orderStatusLabel(order.status)}</span>
            </header>
            {order.items.map((item, index) => (
              <div key={`${item.name}-${index}`}>
                <b>{item.quantity}×</b>
                <span>
                  {item.name}
                  {item.note && <small>{item.note}</small>}
                </span>
              </div>
            ))}
          </article>
        ))}
        {detail && detail.orders.length === 0 && detail.calls.length === 0 && (
          <div className="panel-empty">ยังไม่มีออเดอร์หรือคำเรียก</div>
        )}
      </div>
      <div className="panel-actions">
        <button className="btn" onClick={onShowQr}>
          <QrCode />
          แสดง QR
        </button>
        <button className="btn" onClick={onViewBill}>
          <ReceiptText />
          ดูบิล
        </button>
        <button className="btn danger" onClick={onCloseTable}>
          ปิดโต๊ะ
        </button>
      </div>
    </aside>
  );
}
