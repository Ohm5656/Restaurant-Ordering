import { Clock3, ReceiptText } from "lucide-react";
import { notFound } from "next/navigation";

import { PrintButton } from "@/components/admin/print-button";
import { getSessionBill } from "@/lib/data/admin";
import { formatBaht } from "@/lib/types";

export default async function BillPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const bill = await getSessionBill(sessionId);
  if (!bill) notFound();
  return (
    <>
      <header className="admin-header no-print">
        <div className="admin-title">
          <div>
            <p>ยอดรวมจากทุกออเดอร์ในเซสชัน</p>
            <div className="page-title">บิลโต๊ะ {bill.tableName}</div>
          </div>
        </div>
        <PrintButton />
      </header>
      <main className="bill-page">
        <div className="bill-brand">
          <span>S</span>
          <strong>{bill.restaurantName}</strong>
          <small>RESTAURANT BILL</small>
        </div>
        <div className="bill-meta">
          <div>
            <span>โต๊ะ</span>
            <strong>{bill.tableName}</strong>
          </div>
          <div>
            <span>เริ่มใช้บริการ</span>
            <strong>
              <Clock3 />
              {new Intl.DateTimeFormat("th-TH", {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(bill.openedAt))}
            </strong>
          </div>
        </div>
        <div className="bill-items">
          <div className="bill-items-head">
            <span>รายการ</span>
            <span>จำนวน</span>
            <span>ราคา</span>
          </div>
          {bill.items.map((item, index) => (
            <div className="bill-item" key={`${item.name}-${index}`}>
              <span>
                {item.name}
                {item.modifierTotalSatang !== 0 && (
                  <small>
                    ตัวเลือกเพิ่มเติม {formatBaht(item.modifierTotalSatang)}
                  </small>
                )}
              </span>
              <b>{item.quantity}</b>
              <strong>
                {formatBaht(
                  (item.unitPriceSatang + item.modifierTotalSatang) *
                    item.quantity,
                )}
              </strong>
            </div>
          ))}
        </div>
        <div className="bill-total">
          <span>ยอดรวมสุทธิ</span>
          <strong>{formatBaht(bill.totalSatang)}</strong>
        </div>
        <footer>
          <ReceiptText />
          <span>
            กรุณาชำระเงินกับพนักงาน
            <br />
            ขอบคุณที่ใช้บริการ
          </span>
        </footer>
      </main>
    </>
  );
}
