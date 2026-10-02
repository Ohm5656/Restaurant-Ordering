import { ArrowRight, ConciergeBell, Users } from "lucide-react";
import Link from "next/link";

const hero =
  "https://images.unsplash.com/photo-1679541946014-a47f1ec0dc1a?auto=format&fit=crop&w=1800&q=88";

export default function HomePage() {
  return (
    <main
      className="landing"
      style={{
        backgroundImage: `linear-gradient(105deg, rgba(4,12,19,.94), rgba(4,12,19,.7)), url(${hero})`,
      }}
    >
      <div className="landing-grain" />
      <div className="landing-wrap landing-simple">
        <section
          className="entry-panel floating-entry"
          aria-label="เลือกทางเข้าสู่ระบบ"
        >
          <Link className="entry-card primary" href="/order/demo">
            <span className="entry-icon">
              <ConciergeBell size={26} />
            </span>
            <span className="entry-text">
              <strong>ดูตัวอย่างเมนูอาหาร</strong>
              <small>ลูกค้าจริงจะเข้าสู่หน้านี้จาก QR ประจำโต๊ะ</small>
            </span>
            <span className="entry-arrow">
              <ArrowRight />
            </span>
          </Link>
          <Link className="entry-card" href="/admin/tables">
            <span className="entry-icon">
              <Users size={25} />
            </span>
            <span className="entry-text">
              <strong>เข้าสู่ระบบร้านอาหาร</strong>
              <small>สำหรับพนักงานและผู้ดูแลร้าน</small>
            </span>
            <span className="entry-arrow">
              <ArrowRight />
            </span>
          </Link>
        </section>
      </div>
    </main>
  );
}
