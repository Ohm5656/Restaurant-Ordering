import { Clock3 } from "lucide-react";

export function InvalidSession() {
  return (
    <main className="session-message">
      <div className="session-message-mark">
        <Clock3 />
      </div>
      <p className="eyebrow dark">Table session ended</p>
      <h1>โต๊ะนี้ปิดการให้บริการแล้ว</h1>
      <p>กรุณาติดต่อพนักงานเพื่อเปิดโต๊ะใหม่และรับ QR สำหรับรอบปัจจุบัน</p>
    </main>
  );
}
