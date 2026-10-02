"use client";

import {
  Bell,
  ChevronRight,
  ClipboardList,
  Minus,
  Plus,
  ReceiptText,
  Search,
  ShoppingCart,
  Trash2,
  UtensilsCrossed,
  X,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

import type { CustomerMenuData, CustomerOrder, MenuItem } from "@/lib/types";
import { formatBaht } from "@/lib/types";

interface CartLine {
  quantity: number;
  note: string;
  modifierIds: string[];
}

const statusLabels = {
  NEW: "ส่งเข้าร้านแล้ว",
  ACCEPTED: "ร้านรับออเดอร์แล้ว",
  PREPARING: "กำลังเตรียม",
  READY: "พร้อมเสิร์ฟ",
  SERVED: "เสิร์ฟแล้ว",
  CANCELLED: "ยกเลิกแล้ว",
} as const;

export function CustomerMenu({
  token,
  initialData,
}: {
  token: string;
  initialData: CustomerMenuData;
}) {
  const [activeView, setActiveView] = useState<"menu" | "orders">("menu");
  const [category, setCategory] = useState("recommended");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [detailQuantity, setDetailQuantity] = useState(1);
  const [detailNote, setDetailNote] = useState("");
  const [detailModifiers, setDetailModifiers] = useState<string[]>([]);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const cartLoaded = useRef(false);

  const storageKey = `savour-cart:${token}`;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) {
        try {
          setCart(JSON.parse(saved) as Record<string, CartLine>);
        } catch {
          window.localStorage.removeItem(storageKey);
        }
      }
      cartLoaded.current = true;
    }, 0);
    return () => window.clearTimeout(timer);
  }, [storageKey]);

  useEffect(() => {
    if (!cartLoaded.current) return;
    window.localStorage.setItem(storageKey, JSON.stringify(cart));
  }, [cart, storageKey]);

  useEffect(() => {
    let active = true;
    const loadOrders = async () => {
      const response = await fetch(
        `/api/order/${encodeURIComponent(token)}/orders`,
        { cache: "no-store" },
      );
      if (!response.ok || !active) return;
      const body = (await response.json()) as { orders: CustomerOrder[] };
      setOrders(body.orders);
    };
    void loadOrders();
    const interval = window.setInterval(loadOrders, 10_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [token]);

  const flash = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2800);
  };

  const filteredItems = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("th");
    return initialData.items.filter((item) => {
      const categoryMatch =
        category === "recommended"
          ? item.recommended
          : item.categoryId === category;
      const searchMatch =
        !query ||
        `${item.name} ${item.description}`
          .toLocaleLowerCase("th")
          .includes(query);
      return categoryMatch && searchMatch;
    });
  }, [category, initialData.items, search]);

  const itemById = useMemo(
    () => new Map(initialData.items.map((item) => [item.id, item])),
    [initialData.items],
  );
  const cartCount = Object.values(cart).reduce(
    (sum, line) => sum + line.quantity,
    0,
  );
  const cartTotal = Object.entries(cart).reduce((sum, [id, line]) => {
    const item = itemById.get(id);
    if (!item) return sum;
    const modifierTotal = line.modifierIds.reduce((modifierSum, modifierId) => {
      const option = item.modifierGroups
        .flatMap((group) => group.options)
        .find((candidate) => candidate.id === modifierId);
      return modifierSum + (option?.priceDeltaSatang ?? 0);
    }, 0);
    return sum + (item.priceSatang + modifierTotal) * line.quantity;
  }, 0);

  const openDetail = (item: MenuItem) => {
    setSelectedItem(item);
    setDetailQuantity(1);
    setDetailNote("");
    setDetailModifiers([]);
  };

  const addSimpleItem = (item: MenuItem) => {
    if (item.modifierGroups.length) return openDetail(item);
    setCart((current) => ({
      ...current,
      [item.id]: {
        quantity: (current[item.id]?.quantity ?? 0) + 1,
        note: current[item.id]?.note ?? "",
        modifierIds: current[item.id]?.modifierIds ?? [],
      },
    }));
  };

  const changeQuantity = (id: string, delta: number) => {
    setCart((current) => {
      const nextQuantity = (current[id]?.quantity ?? 0) + delta;
      if (nextQuantity <= 0) {
        const next = { ...current };
        delete next[id];
        return next;
      }
      return { ...current, [id]: { ...current[id], quantity: nextQuantity } };
    });
  };

  const modifierSelectionValid =
    selectedItem?.modifierGroups.every((group) => {
      const count = group.options.filter((option) =>
        detailModifiers.includes(option.id),
      ).length;
      return count >= group.minSelections && count <= group.maxSelections;
    }) ?? false;

  const addDetailedItem = () => {
    if (!selectedItem || !modifierSelectionValid) return;
    setCart((current) => ({
      ...current,
      [selectedItem.id]: {
        quantity: (current[selectedItem.id]?.quantity ?? 0) + detailQuantity,
        note: detailNote.trim(),
        modifierIds: detailModifiers,
      },
    }));
    setSelectedItem(null);
  };

  const chooseModifier = (
    item: MenuItem,
    groupId: string,
    optionId: string,
    maxSelections: number,
  ) => {
    const group = item.modifierGroups.find(
      (candidate) => candidate.id === groupId,
    );
    if (!group) return;
    setDetailModifiers((current) => {
      if (current.includes(optionId))
        return current.filter((id) => id !== optionId);
      const withoutGroup =
        maxSelections === 1
          ? current.filter(
              (id) => !group.options.some((option) => option.id === id),
            )
          : current;
      const groupCount = withoutGroup.filter((id) =>
        group.options.some((option) => option.id === id),
      ).length;
      return groupCount >= maxSelections
        ? withoutGroup
        : [...withoutGroup, optionId];
    });
  };

  const submitOrder = async () => {
    if (!cartCount || submitting) return;
    setSubmitting(true);
    const response = await fetch(
      `/api/order/${encodeURIComponent(token)}/submit`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          items: Object.entries(cart).map(([menuItemId, line]) => ({
            menuItemId,
            quantity: line.quantity,
            note: line.note,
            modifierIds: line.modifierIds,
          })),
        }),
      },
    );
    const body = (await response.json()) as { message?: string };
    setSubmitting(false);
    if (!response.ok)
      return flash(body.message ?? "ส่งออเดอร์ไม่สำเร็จ กรุณาลองใหม่");
    setCart({});
    setCartOpen(false);
    setActiveView("orders");
    flash("ส่งออเดอร์เข้าร้านเรียบร้อยแล้ว");
  };

  const createRequest = async (type: "ASSISTANCE" | "BILL") => {
    const response = await fetch(
      `/api/order/${encodeURIComponent(token)}/request`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type }),
      },
    );
    const body = (await response.json()) as { message?: string };
    flash(
      response.ok
        ? type === "BILL"
          ? "แจ้งขอเช็กบิลแล้ว"
          : "ส่งคำขอเรียกพนักงานแล้ว"
        : (body.message ?? "ดำเนินการไม่สำเร็จ"),
    );
  };

  return (
    <main className="customer">
      {notice && (
        <div className="toast">
          <Bell size={18} />
          {notice}
        </div>
      )}
      <header className="customer-header">
        <div className="customer-top">
          <div className="mini-brand">
            <span className="mini-mark">S</span>
            <span>
              <b>{initialData.restaurant.name}</b>
              <small>Restaurant ordering</small>
            </span>
          </div>
          <div className="table-pill">
            <span className="live-dot" />
            <span>โต๊ะ</span>
            <b>{initialData.session.tableName}</b>
          </div>
          <div className="header-actions">
            {initialData.settings.enableStaffCall && (
              <button
                className="btn quiet-action"
                onClick={() => void createRequest("ASSISTANCE")}
              >
                <Bell size={18} />
                เรียกพนักงาน
              </button>
            )}
            {initialData.settings.enableBillRequest && (
              <button
                className="btn quiet-action"
                onClick={() => void createRequest("BILL")}
              >
                <ReceiptText size={18} />
                เช็กบิล
              </button>
            )}
          </div>
        </div>
        {activeView === "menu" && (
          <>
            <div className="menu-intro">
              <div>
                <div className="eyebrow dark">Our selection</div>
                <div className="page-title">เลือกความอร่อยของคุณ</div>
                <p>ปรุงสดใหม่ทุกจาน ด้วยวัตถุดิบที่เราคัดสรร</p>
              </div>
              <label className="search-box">
                <Search size={19} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="ค้นหาเมนูอาหาร..."
                />
              </label>
            </div>
            <nav className="category-nav" aria-label="หมวดหมู่อาหาร">
              <button
                className={category === "recommended" ? "active" : ""}
                onClick={() => setCategory("recommended")}
              >
                แนะนำ
              </button>
              {initialData.categories
                .filter(
                  (item) => item.id !== "recommended" && item.name !== "แนะนำ",
                )
                .map((item) => (
                  <button
                    className={category === item.id ? "active" : ""}
                    onClick={() => setCategory(item.id)}
                    key={item.id}
                  >
                    {item.name}
                  </button>
                ))}
            </nav>
          </>
        )}
      </header>

      {activeView === "menu" ? (
        <div className="customer-content">
          <div className="section-row">
            <div>
              <div className="section-title">
                {category === "recommended"
                  ? "เมนูแนะนำ"
                  : initialData.categories.find((item) => item.id === category)
                      ?.name}
              </div>
              <p>แตะรายการเพื่อดูรายละเอียดและตัวเลือก</p>
            </div>
            <span className="count-label">{filteredItems.length} รายการ</span>
          </div>
          {filteredItems.length ? (
            <div className="food-grid">
              {filteredItems.map((item) => (
                <article
                  className={`food-card ${item.soldOut || !item.available ? "sold-out" : ""}`}
                  key={item.id}
                >
                  <button
                    className="food-card-main"
                    onClick={() => openDetail(item)}
                    disabled={item.soldOut || !item.available}
                  >
                    <div className="food-image">
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.name}
                          fill
                          sizes="(max-width: 560px) 50vw, 33vw"
                        />
                      ) : (
                        <div className="food-placeholder">
                          <UtensilsCrossed />
                        </div>
                      )}
                      {item.recommended && (
                        <span className="food-tag">Recommended</span>
                      )}
                      {(item.soldOut || !item.available) && (
                        <span className="sold-out-label">หมด</span>
                      )}
                    </div>
                    <div className="food-info">
                      <div>
                        <strong>{item.name}</strong>
                        <small>{item.description}</small>
                      </div>
                    </div>
                  </button>
                  <div className="food-bottom">
                    <b>{formatBaht(item.priceSatang)}</b>
                    {cart[item.id] ? (
                      <div className="stepper">
                        <button
                          className="icon-btn"
                          aria-label="ลดจำนวน"
                          onClick={() => changeQuantity(item.id, -1)}
                        >
                          <Minus size={17} />
                        </button>
                        <span>{cart[item.id].quantity}</span>
                        <button
                          className="icon-btn"
                          aria-label="เพิ่มจำนวน"
                          onClick={() => addSimpleItem(item)}
                        >
                          <Plus size={17} />
                        </button>
                      </div>
                    ) : (
                      <button
                        className="icon-btn add-btn"
                        aria-label="เพิ่มลงตะกร้า"
                        disabled={item.soldOut || !item.available}
                        onClick={() => addSimpleItem(item)}
                      >
                        <Plus size={19} />
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="customer-empty">
              <Search />
              <strong>ไม่พบเมนูที่ค้นหา</strong>
              <span>ลองใช้คำค้นอื่นหรือเลือกหมวดหมู่ใหม่</span>
            </div>
          )}
        </div>
      ) : (
        <CustomerOrders orders={orders} />
      )}

      {cartCount > 0 && (
        <div className="cart-dock">
          <div className="cart-summary">
            <span className="cart-icon">
              <ShoppingCart />
              <i>{cartCount}</i>
            </span>
            <span>
              <small>ยอดรวม · {cartCount} รายการ</small>
              <strong>{formatBaht(cartTotal)}</strong>
            </span>
          </div>
          <button className="btn cart-button" onClick={() => setCartOpen(true)}>
            ดูตะกร้า <ChevronRight />
          </button>
        </div>
      )}
      <nav className="mobile-nav customer-mobile-nav">
        <button
          className={activeView === "menu" ? "active" : ""}
          onClick={() => setActiveView("menu")}
        >
          <UtensilsCrossed />
          <span>เมนู</span>
        </button>
        <button
          className={activeView === "orders" ? "active" : ""}
          onClick={() => setActiveView("orders")}
        >
          <ClipboardList />
          <span>ออเดอร์</span>
        </button>
        <button onClick={() => setCartOpen(true)}>
          <ShoppingCart />
          <span>ตะกร้า</span>
          {cartCount > 0 && <i>{cartCount}</i>}
        </button>
      </nav>

      {selectedItem && (
        <div
          className="modal-backdrop"
          onMouseDown={() => setSelectedItem(null)}
        >
          <section
            className="cart-sheet food-detail-sheet"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="sheet-handle" />
            <div className="sheet-head">
              <div>
                <div className="eyebrow dark">Menu detail</div>
                <div className="section-title">{selectedItem.name}</div>
              </div>
              <button
                className="icon-btn"
                aria-label="ปิด"
                onClick={() => setSelectedItem(null)}
              >
                <X />
              </button>
            </div>
            {selectedItem.imageUrl && (
              <div className="detail-image">
                <Image
                  src={selectedItem.imageUrl}
                  alt={selectedItem.name}
                  fill
                  sizes="560px"
                />
              </div>
            )}
            <p className="detail-description">{selectedItem.description}</p>
            {selectedItem.modifierGroups.map((group) => (
              <fieldset className="modifier-group" key={group.id}>
                <legend>
                  {group.name}
                  <span>{group.required ? "จำเป็น" : "ไม่บังคับ"}</span>
                </legend>
                {group.options.map((option) => (
                  <label key={option.id}>
                    <input
                      type={group.maxSelections === 1 ? "radio" : "checkbox"}
                      name={group.id}
                      checked={detailModifiers.includes(option.id)}
                      onChange={() =>
                        chooseModifier(
                          selectedItem,
                          group.id,
                          option.id,
                          group.maxSelections,
                        )
                      }
                    />
                    <span>{option.name}</span>
                    {option.priceDeltaSatang !== 0 && (
                      <b>+{formatBaht(option.priceDeltaSatang)}</b>
                    )}
                  </label>
                ))}
              </fieldset>
            ))}
            {initialData.settings.allowNotes && (
              <label className="note-box">
                หมายเหตุถึงร้าน
                <input
                  value={detailNote}
                  maxLength={300}
                  onChange={(event) => setDetailNote(event.target.value)}
                  placeholder="เช่น ไม่ใส่ผัก, แยกน้ำ..."
                />
              </label>
            )}
            <div className="detail-submit">
              <div className="stepper">
                <button
                  className="icon-btn"
                  aria-label="ลดจำนวน"
                  onClick={() =>
                    setDetailQuantity((current) => Math.max(1, current - 1))
                  }
                >
                  <Minus />
                </button>
                <span>{detailQuantity}</span>
                <button
                  className="icon-btn"
                  aria-label="เพิ่มจำนวน"
                  onClick={() =>
                    setDetailQuantity((current) => Math.min(99, current + 1))
                  }
                >
                  <Plus />
                </button>
              </div>
              <button
                className="btn confirm-order"
                disabled={!modifierSelectionValid}
                onClick={addDetailedItem}
              >
                เพิ่มลงตะกร้า ·{" "}
                {formatBaht(selectedItem.priceSatang * detailQuantity)}
              </button>
            </div>
          </section>
        </div>
      )}

      {cartOpen && (
        <div className="modal-backdrop" onMouseDown={() => setCartOpen(false)}>
          <section
            className="cart-sheet"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="sheet-handle" />
            <div className="sheet-head">
              <div>
                <div className="eyebrow dark">
                  Table {initialData.session.tableName}
                </div>
                <div className="section-title">ตะกร้าของคุณ</div>
              </div>
              <button
                className="icon-btn"
                aria-label="ปิด"
                onClick={() => setCartOpen(false)}
              >
                <X />
              </button>
            </div>
            <div className="cart-lines">
              {Object.entries(cart).map(([id, line]) => {
                const item = itemById.get(id);
                if (!item) return null;
                return (
                  <div className="cart-line" key={id}>
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt=""
                        width={70}
                        height={66}
                      />
                    ) : (
                      <div className="cart-image-empty" />
                    )}
                    <div>
                      <strong>{item.name}</strong>
                      {line.modifierIds.length > 0 && (
                        <small>
                          {line.modifierIds
                            .map(
                              (modifierId) =>
                                item.modifierGroups
                                  .flatMap((group) => group.options)
                                  .find((option) => option.id === modifierId)
                                  ?.name,
                            )
                            .filter(Boolean)
                            .join(", ")}
                        </small>
                      )}
                      {line.note && <small>“{line.note}”</small>}
                      <b>{formatBaht(item.priceSatang * line.quantity)}</b>
                    </div>
                    <div className="cart-line-actions">
                      <div className="stepper">
                        <button
                          className="icon-btn"
                          aria-label="ลด"
                          onClick={() => changeQuantity(id, -1)}
                        >
                          <Minus />
                        </button>
                        <span>{line.quantity}</span>
                        <button
                          className="icon-btn"
                          aria-label="เพิ่ม"
                          onClick={() => changeQuantity(id, 1)}
                        >
                          <Plus />
                        </button>
                      </div>
                      <button
                        className="icon-btn remove-line"
                        aria-label="นำออก"
                        onClick={() =>
                          setCart((current) => {
                            const next = { ...current };
                            delete next[id];
                            return next;
                          })
                        }
                      >
                        <Trash2 />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            {cartCount === 0 && (
              <div className="customer-empty">
                <ShoppingCart />
                <strong>ยังไม่มีรายการในตะกร้า</strong>
              </div>
            )}
            <div className="total-line">
              <span>ยอดรวมทั้งหมด</span>
              <strong>{formatBaht(cartTotal)}</strong>
            </div>
            <button
              className="btn confirm-order"
              disabled={!cartCount || submitting}
              onClick={() => void submitOrder()}
            >
              {submitting ? "กำลังส่งออเดอร์..." : "ยืนยันการสั่งอาหาร"}{" "}
              {!submitting && <ChevronRight />}
            </button>
          </section>
        </div>
      )}
    </main>
  );
}

function CustomerOrders({ orders }: { orders: CustomerOrder[] }) {
  const runningTotal = orders
    .filter((order) => order.status !== "CANCELLED")
    .reduce(
      (orderTotal, order) =>
        orderTotal +
        order.items.reduce(
          (itemTotal, item) =>
            itemTotal +
            (item.unitPriceSatang +
              item.modifiers.reduce(
                (sum, modifier) => sum + modifier.priceDeltaSatang,
                0,
              )) *
              item.quantity,
          0,
        ),
      0,
    );
  return (
    <div className="customer-content customer-orders">
      <div className="section-row">
        <div>
          <div className="section-title">ออเดอร์ของโต๊ะนี้</div>
          <p>ติดตามสถานะอาหารทุกครั้งที่สั่ง</p>
        </div>
        <strong className="running-total">{formatBaht(runningTotal)}</strong>
      </div>
      {orders.length ? (
        <div className="customer-order-list">
          {orders.map((order) => (
            <article className="customer-order-card" key={order.id}>
              <header>
                <span>
                  <small>ORDER</small>
                  <strong>#{order.number}</strong>
                </span>
                <i
                  className={`order-status status-${order.status.toLowerCase()}`}
                >
                  {statusLabels[order.status]}
                </i>
              </header>
              <time>
                {new Intl.DateTimeFormat("th-TH", {
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(new Date(order.createdAt))}
              </time>
              <ul>
                {order.items.map((item, index) => (
                  <li key={`${item.name}-${index}`}>
                    <span>
                      <b>{item.quantity}×</b>
                      {item.name}
                      {item.note && <small>{item.note}</small>}
                    </span>
                    <strong>
                      {formatBaht(
                        (item.unitPriceSatang +
                          item.modifiers.reduce(
                            (sum, modifier) => sum + modifier.priceDeltaSatang,
                            0,
                          )) *
                          item.quantity,
                      )}
                    </strong>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      ) : (
        <div className="customer-empty">
          <ClipboardList />
          <strong>ยังไม่มีออเดอร์</strong>
          <span>รายการที่ยืนยันแล้วจะแสดงที่นี่</span>
        </div>
      )}
    </div>
  );
}
