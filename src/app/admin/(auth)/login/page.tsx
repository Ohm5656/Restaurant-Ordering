"use client";

import { LockKeyhole, Mail } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";

import { login } from "./actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, { message: "" });
  return (
    <main className="auth-page">
      <Link className="auth-brand" href="/">
        <span>S</span>
        <b>
          SAVOUR<small>Restaurant OS</small>
        </b>
      </Link>
      <form className="auth-form" action={action}>
        <div className="eyebrow dark">Staff access</div>
        <h1>เข้าสู่ระบบร้านอาหาร</h1>
        <p>สำหรับเจ้าของร้านและพนักงานที่ได้รับสิทธิ์</p>
        <label>
          <span>อีเมล</span>
          <div>
            <Mail />
            <input name="email" type="email" autoComplete="email" required />
          </div>
        </label>
        <label>
          <span>รหัสผ่าน</span>
          <div>
            <LockKeyhole />
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              minLength={8}
              required
            />
          </div>
        </label>
        {state.message && <div className="form-error">{state.message}</div>}
        <button className="btn confirm-order" disabled={pending}>
          {pending ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
        </button>
      </form>
    </main>
  );
}
