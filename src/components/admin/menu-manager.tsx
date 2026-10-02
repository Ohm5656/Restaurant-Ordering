"use client";

import {
  Archive,
  Check,
  ChevronDown,
  ChevronUp,
  ImagePlus,
  Layers3,
  Pencil,
  Plus,
  Search,
  Trash2,
  UtensilsCrossed,
  X,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import type { MenuCategory, MenuItem } from "@/lib/types";
import { formatBaht } from "@/lib/types";

interface ModifierDraftOption {
  key: string;
  name: string;
  priceBaht: number;
}

interface ModifierDraftGroup {
  key: string;
  name: string;
  required: boolean;
  minSelections: number;
  maxSelections: number;
  options: ModifierDraftOption[];
}

function modifierDrafts(item: MenuItem | "new"): ModifierDraftGroup[] {
  if (item === "new") return [];
  return item.modifierGroups.map((group) => ({
    key: group.id,
    name: group.name,
    required: group.required,
    minSelections: group.minSelections,
    maxSelections: group.maxSelections,
    options: group.options.map((option) => ({
      key: option.id,
      name: option.name,
      priceBaht: option.priceDeltaSatang / 100,
    })),
  }));
}

export function MenuManager({
  categories,
  items,
}: {
  categories: MenuCategory[];
  items: MenuItem[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"menu" | "categories">("menu");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");
  const [editing, setEditing] = useState<MenuItem | "new" | null>(null);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [modifierGroups, setModifierGroups] = useState<ModifierDraftGroup[]>(
    [],
  );

  const filtered = useMemo(
    () =>
      items.filter(
        (item) =>
          (category === "ALL" || item.categoryId === category) &&
          `${item.name} ${item.description}`
            .toLocaleLowerCase()
            .includes(search.trim().toLocaleLowerCase()),
      ),
    [category, items, search],
  );
  const flash = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2600);
  };

  const saveMenu = async (formData: FormData) => {
    setSaving(true);
    if (editing !== "new" && editing) formData.set("id", editing.id);
    formData.set(
      "modifierGroups",
      JSON.stringify(
        modifierGroups.map((group) => ({
          name: group.name,
          required: group.required,
          minSelections: group.required ? Math.max(1, group.minSelections) : 0,
          maxSelections: group.maxSelections,
          options: group.options.map((option) => ({
            name: option.name,
            priceDeltaSatang: Math.round(Number(option.priceBaht) * 100),
          })),
        })),
      ),
    );
    const response = await fetch("/api/admin/menu", {
      method: "POST",
      body: formData,
    });
    const body = (await response.json()) as { message?: string };
    setSaving(false);
    if (!response.ok) return flash(body.message ?? "บันทึกเมนูไม่สำเร็จ");
    setEditing(null);
    flash("บันทึกเมนูเรียบร้อยแล้ว");
    router.refresh();
  };

  const openEditor = (item: MenuItem | "new") => {
    setModifierGroups(modifierDrafts(item));
    setEditing(item);
  };

  const addModifierGroup = () => {
    setModifierGroups((groups) => [
      ...groups,
      {
        key: crypto.randomUUID(),
        name: "",
        required: false,
        minSelections: 0,
        maxSelections: 1,
        options: [{ key: crypto.randomUUID(), name: "", priceBaht: 0 }],
      },
    ]);
  };

  const updateModifierGroup = (
    groupKey: string,
    update: (group: ModifierDraftGroup) => ModifierDraftGroup,
  ) => {
    setModifierGroups((groups) =>
      groups.map((group) => (group.key === groupKey ? update(group) : group)),
    );
  };

  const archiveMenu = async (item: MenuItem) => {
    if (
      !window.confirm(
        `ซ่อนเมนู “${item.name}” หรือไม่? ประวัติออเดอร์เดิมจะยังอยู่`,
      )
    )
      return;
    const response = await fetch(`/api/admin/menu/${item.id}`, {
      method: "DELETE",
    });
    if (!response.ok) return flash("ซ่อนเมนูไม่สำเร็จ");
    flash("ซ่อนเมนูแล้ว");
    router.refresh();
  };

  const addCategory = async () => {
    if (!newCategory.trim()) return;
    const response = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: newCategory }),
    });
    const body = (await response.json()) as { message?: string };
    if (!response.ok) return flash(body.message ?? "เพิ่มหมวดหมู่ไม่สำเร็จ");
    setNewCategory("");
    router.refresh();
  };

  const updateCategory = async (
    id: string,
    values: Record<string, string | number | boolean>,
  ) => {
    const response = await fetch(`/api/admin/categories/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!response.ok) return flash("อัปเดตหมวดหมู่ไม่สำเร็จ");
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
            <p>รายการอาหารและสินค้าคงเหลือ</p>
            <div className="page-title">เมนูและสต็อก</div>
          </div>
        </div>
        <button className="btn new-table" onClick={() => openEditor("new")}>
          <Plus />
          เพิ่มเมนู
        </button>
      </header>
      <div className="management-tabs">
        <button
          className={tab === "menu" ? "active" : ""}
          onClick={() => setTab("menu")}
        >
          <UtensilsCrossed />
          รายการอาหาร
        </button>
        <button
          className={tab === "categories" ? "active" : ""}
          onClick={() => setTab("categories")}
        >
          <Layers3 />
          หมวดหมู่
        </button>
      </div>
      {tab === "menu" ? (
        <>
          <div className="management-toolbar">
            <label className="admin-search">
              <Search />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="ค้นหาเมนู..."
              />
            </label>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value="ALL">ทุกหมวดหมู่</option>
              {categories.map((entry) => (
                <option value={entry.id} key={entry.id}>
                  {entry.name}
                </option>
              ))}
            </select>
            <span>{filtered.length} รายการ</span>
          </div>
          <div className="menu-management-list">
            {filtered.map((item) => (
              <article className="menu-management-row" key={item.id}>
                <div className="management-image">
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.name}
                      fill
                      sizes="80px"
                    />
                  ) : (
                    <UtensilsCrossed />
                  )}
                </div>
                <div className="management-name">
                  <strong>{item.name}</strong>
                  <small>
                    {categories.find((entry) => entry.id === item.categoryId)
                      ?.name ?? "ไม่ระบุหมวด"}
                  </small>
                </div>
                <strong className="management-price">
                  {formatBaht(item.priceSatang)}
                </strong>
                <div className="stock-state">
                  {item.trackStock ? (
                    <>
                      <span
                        className={
                          item.soldOut
                            ? "sold"
                            : (item.stockQuantity ?? 0) <=
                                (item.lowStockThreshold ?? 0)
                              ? "low"
                              : "ok"
                        }
                      />{" "}
                      <b>
                        {item.soldOut ? "หมด" : `เหลือ ${item.stockQuantity}`}
                      </b>
                    </>
                  ) : (
                    <b>ไม่ติดตามสต็อก</b>
                  )}
                </div>
                <span
                  className={`availability ${
                    item.available ? "available" : "hidden"
                  }`}
                >
                  {item.available ? "พร้อมขาย" : "ปิดขาย"}
                </span>
                <div className="row-actions">
                  <button
                    className="icon-btn"
                    aria-label="แก้ไข"
                    onClick={() => openEditor(item)}
                  >
                    <Pencil />
                  </button>
                  <button
                    className="icon-btn danger"
                    aria-label="ซ่อนเมนู"
                    onClick={() => void archiveMenu(item)}
                  >
                    <Archive />
                  </button>
                </div>
              </article>
            ))}
            {filtered.length === 0 && (
              <div className="management-empty">
                <UtensilsCrossed />
                <strong>ยังไม่มีเมนูในรายการนี้</strong>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="category-manager">
          <div className="category-add">
            <input
              value={newCategory}
              onChange={(event) => setNewCategory(event.target.value)}
              placeholder="ชื่อหมวดหมู่ใหม่"
              maxLength={80}
            />
            <button
              className="btn new-table"
              onClick={() => void addCategory()}
            >
              <Plus />
              เพิ่มหมวดหมู่
            </button>
          </div>
          <div className="category-list">
            {categories.map((entry, index) => (
              <div className="category-row" key={entry.id}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <input
                  defaultValue={entry.name}
                  onBlur={(event) =>
                    event.target.value !== entry.name &&
                    void updateCategory(entry.id, { name: event.target.value })
                  }
                />
                <b>
                  {items.filter((item) => item.categoryId === entry.id).length}{" "}
                  เมนู
                </b>
                <button
                  className="icon-btn"
                  disabled={index === 0}
                  aria-label="เลื่อนขึ้น"
                  onClick={() =>
                    void updateCategory(entry.id, { direction: -1 })
                  }
                >
                  <ChevronUp />
                </button>
                <button
                  className="icon-btn"
                  disabled={index === categories.length - 1}
                  aria-label="เลื่อนลง"
                  onClick={() =>
                    void updateCategory(entry.id, { direction: 1 })
                  }
                >
                  <ChevronDown />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      {editing && (
        <div
          className="modal-backdrop admin-modal-backdrop"
          onMouseDown={() => setEditing(null)}
        >
          <form
            className="admin-form-modal menu-editor"
            action={saveMenu}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="sheet-head">
              <div>
                <div className="eyebrow dark">Menu editor</div>
                <div className="section-title">
                  {editing === "new" ? "เพิ่มเมนูใหม่" : "แก้ไขเมนู"}
                </div>
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
            <label className="image-upload">
              <ImagePlus />
              <span>
                เลือกรูปอาหาร
                <small>JPG, PNG, WebP หรือ AVIF ไม่เกิน 5 MB</small>
              </span>
              <input
                name="image"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
              />
            </label>
            <div className="form-grid">
              <label className="form-field full">
                <span>ชื่อเมนู</span>
                <input
                  name="name"
                  defaultValue={editing === "new" ? "" : editing.name}
                  maxLength={120}
                  required
                />
              </label>
              <label className="form-field full">
                <span>คำอธิบาย</span>
                <textarea
                  name="description"
                  defaultValue={editing === "new" ? "" : editing.description}
                  maxLength={1000}
                />
              </label>
              <label className="form-field">
                <span>ราคา (บาท)</span>
                <input
                  name="priceBaht"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={
                    editing === "new" ? "" : editing.priceSatang / 100
                  }
                  required
                />
              </label>
              <label className="form-field">
                <span>หมวดหมู่</span>
                <select
                  name="categoryId"
                  defaultValue={
                    editing === "new" ? categories[0]?.id : editing.categoryId
                  }
                  required
                >
                  {categories.map((entry) => (
                    <option value={entry.id} key={entry.id}>
                      {entry.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="stock-toggle full">
                <span>
                  <b>พร้อมขาย</b>
                  <small>ปิดชั่วคราวเมื่อไม่ต้องการให้ลูกค้าสั่ง</small>
                </span>
                <input
                  name="available"
                  type="checkbox"
                  defaultChecked={editing === "new" || editing.available}
                />
              </label>
              <label className="stock-toggle full">
                <span>
                  <b>เมนูแนะนำ</b>
                  <small>แสดงในหมวดแนะนำบนหน้าลูกค้า</small>
                </span>
                <input
                  name="recommended"
                  type="checkbox"
                  defaultChecked={editing !== "new" && editing.recommended}
                />
              </label>
              <label className="stock-toggle full">
                <span>
                  <b>ติดตามสต็อก</b>
                  <small>ระบบตัดจำนวนอัตโนมัติเมื่อสั่งสำเร็จ</small>
                </span>
                <input
                  name="trackStock"
                  type="checkbox"
                  defaultChecked={editing !== "new" && editing.trackStock}
                />
              </label>
              <label className="form-field">
                <span>จำนวนคงเหลือ</span>
                <input
                  name="stockQuantity"
                  type="number"
                  min="0"
                  defaultValue={
                    editing === "new" ? 0 : (editing.stockQuantity ?? 0)
                  }
                />
              </label>
              <label className="form-field">
                <span>แจ้งเตือนเมื่อเหลือ</span>
                <input
                  name="lowStockThreshold"
                  type="number"
                  min="0"
                  defaultValue={
                    editing === "new" ? 5 : (editing.lowStockThreshold ?? 5)
                  }
                />
              </label>
            </div>
            <section className="modifier-editor">
              <div className="modifier-editor-head">
                <div>
                  <strong>ตัวเลือกเพิ่มเติม</strong>
                  <small>เช่น ระดับความเผ็ด ขนาด หรือท็อปปิง</small>
                </div>
                <button
                  className="btn"
                  type="button"
                  onClick={addModifierGroup}
                >
                  <Plus />
                  เพิ่มกลุ่ม
                </button>
              </div>
              {modifierGroups.map((group, groupIndex) => (
                <div className="modifier-group-editor" key={group.key}>
                  <div className="modifier-group-head">
                    <label className="form-field">
                      <span>ชื่อกลุ่ม</span>
                      <input
                        value={group.name}
                        onChange={(event) =>
                          updateModifierGroup(group.key, (current) => ({
                            ...current,
                            name: event.target.value,
                          }))
                        }
                        placeholder="เช่น ระดับความเผ็ด"
                        maxLength={100}
                        required
                      />
                    </label>
                    <label className="form-field modifier-limit">
                      <span>เลือกได้สูงสุด</span>
                      <input
                        type="number"
                        min="1"
                        max={Math.max(1, group.options.length)}
                        value={group.maxSelections}
                        onChange={(event) =>
                          updateModifierGroup(group.key, (current) => ({
                            ...current,
                            maxSelections: Math.max(
                              1,
                              Math.min(
                                Number(event.target.value),
                                current.options.length,
                              ),
                            ),
                          }))
                        }
                        required
                      />
                    </label>
                    <button
                      type="button"
                      className="icon-btn danger"
                      aria-label={`ลบกลุ่มตัวเลือก ${groupIndex + 1}`}
                      onClick={() =>
                        setModifierGroups((groups) =>
                          groups.filter((entry) => entry.key !== group.key),
                        )
                      }
                    >
                      <Trash2 />
                    </button>
                  </div>
                  <label className="stock-toggle modifier-required">
                    <span>
                      <b>ลูกค้าต้องเลือก</b>
                      <small>บังคับอย่างน้อย 1 ตัวเลือกก่อนเพิ่มลงตะกร้า</small>
                    </span>
                    <input
                      type="checkbox"
                      checked={group.required}
                      onChange={(event) =>
                        updateModifierGroup(group.key, (current) => ({
                          ...current,
                          required: event.target.checked,
                          minSelections: event.target.checked ? 1 : 0,
                        }))
                      }
                    />
                  </label>
                  <div className="modifier-options-editor">
                    {group.options.map((option, optionIndex) => (
                      <div className="modifier-option-row" key={option.key}>
                        <span>{optionIndex + 1}</span>
                        <input
                          value={option.name}
                          onChange={(event) =>
                            updateModifierGroup(group.key, (current) => ({
                              ...current,
                              options: current.options.map((entry) =>
                                entry.key === option.key
                                  ? { ...entry, name: event.target.value }
                                  : entry,
                              ),
                            }))
                          }
                          placeholder="ชื่อตัวเลือก"
                          maxLength={100}
                          required
                        />
                        <label>
                          <span>+ ฿</span>
                          <input
                            type="number"
                            step="0.01"
                            value={option.priceBaht}
                            onChange={(event) =>
                              updateModifierGroup(group.key, (current) => ({
                                ...current,
                                options: current.options.map((entry) =>
                                  entry.key === option.key
                                    ? {
                                        ...entry,
                                        priceBaht: Number(event.target.value),
                                      }
                                    : entry,
                                ),
                              }))
                            }
                            aria-label={`ราคาเพิ่มตัวเลือก ${optionIndex + 1}`}
                          />
                        </label>
                        <button
                          type="button"
                          className="icon-btn"
                          disabled={group.options.length === 1}
                          aria-label={`ลบตัวเลือก ${optionIndex + 1}`}
                          onClick={() =>
                            updateModifierGroup(group.key, (current) => {
                              const options = current.options.filter(
                                (entry) => entry.key !== option.key,
                              );
                              return {
                                ...current,
                                options,
                                maxSelections: Math.min(
                                  current.maxSelections,
                                  options.length,
                                ),
                              };
                            })
                          }
                        >
                          <X />
                        </button>
                      </div>
                    ))}
                    <button
                      className="modifier-add-option"
                      type="button"
                      onClick={() =>
                        updateModifierGroup(group.key, (current) => ({
                          ...current,
                          options: [
                            ...current.options,
                            {
                              key: crypto.randomUUID(),
                              name: "",
                              priceBaht: 0,
                            },
                          ],
                        }))
                      }
                    >
                      <Plus /> เพิ่มตัวเลือก
                    </button>
                  </div>
                </div>
              ))}
              {modifierGroups.length === 0 && (
                <div className="modifier-empty">
                  เมนูนี้ไม่มีตัวเลือกเพิ่มเติม
                </div>
              )}
            </section>
            <button className="btn confirm-order" disabled={saving}>
              {saving ? "กำลังบันทึก..." : "บันทึกเมนู"}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
