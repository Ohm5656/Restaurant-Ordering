"use client";

import {
  Check,
  ChevronDown,
  ChevronUp,
  MapPinned,
  Plus,
  Save,
  Settings,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { RestaurantConfiguration } from "@/lib/data/admin";

export function RestaurantSettings({
  configuration,
}: {
  configuration: RestaurantConfiguration;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"restaurant" | "ordering" | "zones">(
    "restaurant",
  );
  const [notice, setNotice] = useState("");
  const [zoneDialog, setZoneDialog] = useState(false);
  const flash = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2600);
  };

  const saveSettings = async (formData: FormData) => {
    const response = await fetch("/api/admin/settings", {
      method: "POST",
      body: formData,
    });
    const body = (await response.json()) as { message?: string };
    if (!response.ok) return flash(body.message ?? "บันทึกไม่สำเร็จ");
    flash("บันทึกการตั้งค่าเรียบร้อยแล้ว");
    router.refresh();
  };
  const addZone = async (formData: FormData) => {
    const response = await fetch("/api/admin/zones", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: formData.get("name") }),
    });
    if (!response.ok) return flash("เพิ่มโซนไม่สำเร็จ");
    setZoneDialog(false);
    router.refresh();
  };
  const updateZone = async (
    id: string,
    values: Record<string, string | number | boolean>,
  ) => {
    const response = await fetch(`/api/admin/zones/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!response.ok) return flash("อัปเดตโซนไม่สำเร็จ");
    router.refresh();
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
            <p>ข้อมูลและพฤติกรรมของระบบ</p>
            <div className="page-title">ตั้งค่าร้าน</div>
          </div>
        </div>
      </header>
      <div className="settings-layout">
        <aside className="settings-nav">
          <button
            className={tab === "restaurant" ? "active" : ""}
            onClick={() => setTab("restaurant")}
          >
            <Settings />
            ข้อมูลร้าน
          </button>
          <button
            className={tab === "ordering" ? "active" : ""}
            onClick={() => setTab("ordering")}
          >
            <Save />
            การสั่งอาหาร
          </button>
          <button
            className={tab === "zones" ? "active" : ""}
            onClick={() => setTab("zones")}
          >
            <MapPinned />
            โซนและพื้นที่
          </button>
        </aside>
        <section className="settings-content">
          {tab === "restaurant" && (
            <form action={saveSettings}>
              <div className="settings-head">
                <div>
                  <h2>ข้อมูลร้านอาหาร</h2>
                  <p>ข้อมูลนี้จะแสดงบนหน้าเมนูและเอกสารพิมพ์</p>
                </div>
                <button className="btn new-table">
                  <Save />
                  บันทึก
                </button>
              </div>
              <input type="hidden" name="section" value="restaurant" />
              <div className="form-grid">
                <label className="form-field full">
                  <span>ชื่อร้าน</span>
                  <input
                    name="name"
                    defaultValue={configuration.restaurant.name}
                    required
                  />
                </label>
                <label className="form-field">
                  <span>เบอร์ติดต่อ</span>
                  <input
                    name="contactNumber"
                    defaultValue={configuration.restaurant.contactNumber}
                  />
                </label>
                <label className="form-field">
                  <span>เขตเวลา</span>
                  <select
                    name="timezone"
                    defaultValue={configuration.restaurant.timezone}
                  >
                    <option value="Asia/Bangkok">Asia/Bangkok</option>
                  </select>
                </label>
                <label className="form-field full">
                  <span>ที่อยู่</span>
                  <textarea
                    name="address"
                    defaultValue={configuration.restaurant.address}
                  />
                </label>
              </div>
            </form>
          )}
          {tab === "ordering" && (
            <form action={saveSettings}>
              <div className="settings-head">
                <div>
                  <h2>การสั่งอาหาร</h2>
                  <p>เปิดหรือปิดความสามารถที่ลูกค้าใช้ระหว่างนั่งโต๊ะ</p>
                </div>
                <button className="btn new-table">
                  <Save />
                  บันทึก
                </button>
              </div>
              <input type="hidden" name="section" value="ordering" />
              {(
                [
                  [
                    "allowNotes",
                    "อนุญาตหมายเหตุ",
                    "ลูกค้าเขียนหมายเหตุแยกในแต่ละเมนู",
                    configuration.settings.allowNotes,
                  ],
                  [
                    "enableStaffCall",
                    "เรียกพนักงาน",
                    "แสดงปุ่มเรียกพนักงานบนหน้าเมนู",
                    configuration.settings.enableStaffCall,
                  ],
                  [
                    "enableBillRequest",
                    "ขอเช็กบิล",
                    "ลูกค้าส่งคำขอเช็กบิลจากโต๊ะ",
                    configuration.settings.enableBillRequest,
                  ],
                  [
                    "enableStockTracking",
                    "ติดตามสต็อก",
                    "ตัดสต็อกเมนูเมื่อออเดอร์สำเร็จ",
                    configuration.settings.enableStockTracking,
                  ],
                  [
                    "showSoldOutItems",
                    "แสดงเมนูหมด",
                    "แสดงรายการที่หมดแทนการซ่อน",
                    configuration.settings.showSoldOutItems,
                  ],
                  [
                    "requirePaymentBeforeClose",
                    "ยืนยันชำระก่อนปิดโต๊ะ",
                    "ลดโอกาสปิดโต๊ะโดยยังไม่ได้รับเงิน",
                    configuration.settings.requirePaymentBeforeClose,
                  ],
                ] as const
              ).map(([name, title, description, checked]) => (
                <label className="setting-toggle" key={name}>
                  <span>
                    <b>{title}</b>
                    <small>{description}</small>
                  </span>
                  <input name={name} type="checkbox" defaultChecked={checked} />
                </label>
              ))}
            </form>
          )}
          {tab === "zones" && (
            <>
              <div className="settings-head">
                <div>
                  <h2>โซนและพื้นที่</h2>
                  <p>โต๊ะจำนวนมากจะถูกแบ่งแสดงตามโซนเหล่านี้โดยอัตโนมัติ</p>
                </div>
                <button
                  className="btn new-table"
                  onClick={() => setZoneDialog(true)}
                >
                  <Plus />
                  เพิ่มโซน
                </button>
              </div>
              <div className="zone-management-list">
                {configuration.zones.map((zone, index) => (
                  <div className="zone-management-row" key={zone.id}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <input
                      defaultValue={zone.name}
                      onBlur={(event) =>
                        event.target.value !== zone.name &&
                        void updateZone(zone.id, { name: event.target.value })
                      }
                    />
                    <b>{zone.tableCount} โต๊ะ</b>
                    <button
                      className="icon-btn"
                      disabled={index === 0}
                      aria-label="เลื่อนขึ้น"
                      onClick={() =>
                        void updateZone(zone.id, { direction: -1 })
                      }
                    >
                      <ChevronUp />
                    </button>
                    <button
                      className="icon-btn"
                      disabled={index === configuration.zones.length - 1}
                      aria-label="เลื่อนลง"
                      onClick={() => void updateZone(zone.id, { direction: 1 })}
                    >
                      <ChevronDown />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
      {zoneDialog && (
        <div
          className="modal-backdrop admin-modal-backdrop"
          onMouseDown={() => setZoneDialog(false)}
        >
          <form
            className="admin-form-modal"
            action={addZone}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="sheet-head">
              <div>
                <div className="eyebrow dark">Dining zone</div>
                <div className="section-title">เพิ่มโซน</div>
              </div>
              <button
                type="button"
                className="icon-btn"
                aria-label="ปิด"
                onClick={() => setZoneDialog(false)}
              >
                <X />
              </button>
            </div>
            <label className="form-field">
              <span>ชื่อโซน</span>
              <input
                name="name"
                placeholder="เช่น ห้องแอร์, Outdoor"
                maxLength={80}
                required
              />
            </label>
            <button className="btn confirm-order">บันทึกโซน</button>
          </form>
        </div>
      )}
    </>
  );
}
