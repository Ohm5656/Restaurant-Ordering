"use client";

import { Archive, Check, Pencil, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { RestaurantConfiguration } from "@/lib/data/admin";
import type { TableSummary } from "@/lib/types";

export function TableManager({
  tables,
  zones,
}: {
  tables: TableSummary[];
  zones: RestaurantConfiguration["zones"];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<TableSummary | null>(null);
  const [notice, setNotice] = useState("");
  const flash = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2600);
  };
  const update = async (formData: FormData) => {
    if (!editing) return;
    const response = await fetch(`/api/admin/tables/${editing.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        capacity: Number(formData.get("capacity")),
        zoneId: formData.get("zoneId"),
      }),
    });
    const body = (await response.json()) as { message?: string };
    if (!response.ok) return flash(body.message ?? "บันทึกไม่สำเร็จ");
    setEditing(null);
    flash("อัปเดตโต๊ะแล้ว");
    router.refresh();
  };
  const archive = async (table: TableSummary) => {
    if (table.state !== "AVAILABLE")
      return flash("ต้องปิดเซสชันโต๊ะก่อนปิดใช้งาน");
    if (
      !window.confirm(
        `ปิดใช้งานโต๊ะ ${table.name} หรือไม่? ประวัติเดิมจะยังอยู่`,
      )
    )
      return;
    const response = await fetch(`/api/admin/tables/${table.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ active: false }),
    });
    if (!response.ok) return flash("ปิดใช้งานโต๊ะไม่สำเร็จ");
    router.refresh();
  };
  const filtered = tables.filter((table) =>
    `${table.name} ${table.zoneName}`
      .toLowerCase()
      .includes(search.trim().toLowerCase()),
  );
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
            <p>ชื่อ จำนวนที่นั่ง และโซน</p>
            <div className="page-title">จัดการโต๊ะ</div>
          </div>
        </div>
      </header>
      <div className="management-toolbar">
        <label className="admin-search">
          <Search />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ค้นหาโต๊ะ..."
          />
        </label>
        <span>{filtered.length} โต๊ะ</span>
      </div>
      <div className="table-management-list">
        {filtered.map((table) => (
          <article className="table-management-row" key={table.id}>
            <strong>{table.name}</strong>
            <span>{table.zoneName}</span>
            <span>{table.seats} ที่นั่ง</span>
            <b>{table.state === "AVAILABLE" ? "ว่าง" : "กำลังใช้งาน"}</b>
            <div className="row-actions">
              <button
                className="icon-btn"
                aria-label="แก้ไขโต๊ะ"
                onClick={() => setEditing(table)}
              >
                <Pencil />
              </button>
              <button
                className="icon-btn danger"
                aria-label="ปิดใช้งานโต๊ะ"
                onClick={() => void archive(table)}
              >
                <Archive />
              </button>
            </div>
          </article>
        ))}
      </div>
      {editing && (
        <div
          className="modal-backdrop admin-modal-backdrop"
          onMouseDown={() => setEditing(null)}
        >
          <form
            className="admin-form-modal"
            action={update}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="sheet-head">
              <div>
                <div className="eyebrow dark">Table editor</div>
                <div className="section-title">แก้ไขโต๊ะ {editing.name}</div>
              </div>
              <button
                type="button"
                className="icon-btn"
                aria-label="ปิด"
                onClick={() => setEditing(null)}
              >
                <X />
              </button>
            </div>
            <div className="form-grid">
              <label className="form-field">
                <span>ชื่อโต๊ะ</span>
                <input name="name" defaultValue={editing.name} required />
              </label>
              <label className="form-field">
                <span>จำนวนที่นั่ง</span>
                <input
                  name="capacity"
                  type="number"
                  min="1"
                  max="100"
                  defaultValue={editing.seats}
                  required
                />
              </label>
              <label className="form-field full">
                <span>โซน</span>
                <select name="zoneId" defaultValue={editing.zoneId}>
                  {zones.map((zone) => (
                    <option value={zone.id} key={zone.id}>
                      {zone.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <button className="btn confirm-order">บันทึกการเปลี่ยนแปลง</button>
          </form>
        </div>
      )}
    </>
  );
}
