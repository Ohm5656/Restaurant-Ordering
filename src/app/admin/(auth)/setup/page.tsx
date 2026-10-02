"use client";

import { Building2, Link2, UserRound } from "lucide-react";
import { useActionState } from "react";

import { setupRestaurant } from "./actions";

export default function SetupPage() {
  const [state, action, pending] = useActionState(setupRestaurant, {
    message: "",
  });
  return (
    <main className="auth-page">
      <div className="auth-brand">
        <span>S</span>
        <b>
          SAVOUR<small>FIRST-TIME SETUP</small>
        </b>
      </div>
      <form className="auth-form" action={action}>
        <div className="eyebrow dark">Restaurant setup</div>
        <h1>ตั้งค่าร้านครั้งแรก</h1>
        <p>สร้างข้อมูลร้าน โซนเริ่มต้น และสิทธิ์เจ้าของร้าน</p>
        <label>
          <span>ชื่อร้าน</span>
          <div>
            <Building2 />
            <input name="restaurantName" required maxLength={120} />
          </div>
        </label>
        <label>
          <span>ชื่อภาษาอังกฤษสำหรับระบบ</span>
          <div>
            <Link2 />
            <input
              name="slug"
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              placeholder="my-restaurant"
              required
            />
          </div>
        </label>
        <label>
          <span>ชื่อผู้ดูแล</span>
          <div>
            <UserRound />
            <input name="ownerName" required maxLength={100} />
          </div>
        </label>
        {state.message && <div className="form-error">{state.message}</div>}
        <button className="btn confirm-order" disabled={pending}>
          {pending ? "กำลังตั้งค่า..." : "เริ่มใช้งานร้าน"}
        </button>
      </form>
    </main>
  );
}
