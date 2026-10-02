"use client";

import {
  BellRing,
  Check,
  ChefHat,
  Clock3,
  CookingPot,
  Utensils,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { OrderStatus, OrderTicket } from "@/lib/types";

const columns: Array<{
  key: "NEW" | "PREPARING" | "READY";
  label: string;
  icon: typeof BellRing;
}> = [
  { key: "NEW", label: "ออเดอร์ใหม่", icon: BellRing },
  { key: "PREPARING", label: "กำลังเตรียม", icon: CookingPot },
  { key: "READY", label: "พร้อมเสิร์ฟ", icon: Utensils },
];

function columnFor(status: OrderStatus) {
  if (status === "NEW" || status === "ACCEPTED") return "NEW";
  if (status === "PREPARING") return "PREPARING";
  return "READY";
}

function actionFor(
  status: OrderStatus,
): { label: string; next: OrderStatus } | null {
  if (status === "NEW") return { label: "รับออเดอร์", next: "ACCEPTED" };
  if (status === "ACCEPTED") return { label: "เริ่มเตรียม", next: "PREPARING" };
  if (status === "PREPARING") return { label: "พร้อมเสิร์ฟ", next: "READY" };
  if (status === "READY") return { label: "เสิร์ฟแล้ว", next: "SERVED" };
  return null;
}

export function KitchenBoard({
  initialOrders,
  restaurantId,
}: {
  initialOrders: OrderTicket[];
  restaurantId: string;
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!isSupabaseConfigured || restaurantId === "demo") return;
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`kitchen:${restaurantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => {
          window.clearTimeout(timer.current);
          timer.current = window.setTimeout(() => router.refresh(), 200);
        },
      )
      .subscribe();
    return () => {
      window.clearTimeout(timer.current);
      void supabase.removeChannel(channel);
    };
  }, [restaurantId, router]);

  const transition = async (order: OrderTicket, status: OrderStatus) => {
    setPendingId(order.id);
    const response = await fetch(`/api/admin/orders/${order.id}/status`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const body = (await response.json()) as { message?: string };
    setPendingId(null);
    if (!response.ok) {
      setNotice(body.message ?? "เปลี่ยนสถานะไม่สำเร็จ");
      window.setTimeout(() => setNotice(""), 2600);
      return;
    }
    router.refresh();
  };

  const cancelOrder = (order: OrderTicket) => {
    if (
      !window.confirm(
        `ยกเลิก ORDER #${order.number} ของโต๊ะ ${order.tableName} หรือไม่? สต็อกจะถูกคืนอัตโนมัติ`,
      )
    )
      return;
    void transition(order, "CANCELLED");
  };

  return (
    <>
      {notice && (
        <div className="toast">
          <BellRing />
          {notice}
        </div>
      )}
      <header className="admin-header">
        <div className="admin-title">
          <div>
            <p>Kitchen display system</p>
            <div className="page-title">ออเดอร์และครัว</div>
          </div>
        </div>
        <div className="admin-actions">
          <div className="store-open">
            <span /> อัปเดตแบบเรียลไทม์
          </div>
        </div>
      </header>
      <div className="kds-summary">
        <span>
          <ChefHat />
          ออเดอร์ที่กำลังดำเนินการ <strong>{initialOrders.length}</strong>
        </span>
        <small>เรียงตามเวลาที่เข้าร้านก่อน</small>
      </div>
      <div className="kds-board">
        {columns.map(({ key, label, icon: Icon }) => {
          const items = initialOrders.filter(
            (order) => columnFor(order.status) === key,
          );
          return (
            <section
              className={`kds-column kds-${key.toLowerCase()}`}
              key={key}
            >
              <header>
                <span>
                  <Icon />
                  {label}
                </span>
                <i>{items.length}</i>
              </header>
              <div className="kds-tickets">
                {items.map((order) => {
                  const action = actionFor(order.status);
                  return (
                    <article className="kds-ticket" key={order.id}>
                      <div className="ticket-head">
                        <strong>โต๊ะ {order.tableName}</strong>
                        <span>
                          <Clock3 />
                          {Math.max(
                            1,
                            Math.floor(
                              (Date.now() -
                                new Date(order.createdAt).getTime()) /
                                60_000,
                            ),
                          )}{" "}
                          นาที
                        </span>
                      </div>
                      <small>ORDER #{order.number}</small>
                      <ul>
                        {order.items.map((item, index) => (
                          <li key={`${item.name}-${index}`}>
                            <b>{item.quantity}×</b>
                            <span>
                              {item.name}
                              {item.note && (
                                <small>หมายเหตุ: {item.note}</small>
                              )}
                            </span>
                          </li>
                        ))}
                      </ul>
                      {order.note && (
                        <div className="ticket-note">“{order.note}”</div>
                      )}
                      {action && (
                        <div className="ticket-actions">
                          {order.status !== "READY" && (
                            <button
                              className="btn ticket-cancel"
                              aria-label={`ยกเลิกออเดอร์ ${order.number}`}
                              disabled={pendingId === order.id}
                              onClick={() => cancelOrder(order)}
                            >
                              <XCircle />
                              ยกเลิก
                            </button>
                          )}
                          <button
                            className="btn ticket-action"
                            disabled={pendingId === order.id}
                            onClick={() => void transition(order, action.next)}
                          >
                            {pendingId === order.id
                              ? "กำลังอัปเดต..."
                              : action.label}
                            <Check />
                          </button>
                        </div>
                      )}
                    </article>
                  );
                })}
                {items.length === 0 && (
                  <div className="kds-empty">
                    <Check />
                    <span>ไม่มีรายการในสถานะนี้</span>
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
