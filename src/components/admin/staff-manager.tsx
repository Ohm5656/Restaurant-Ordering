"use client";

import { Check, MailPlus, ShieldCheck, UserRound, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { StaffMember } from "@/lib/data/admin";
import type { StaffRole } from "@/lib/types";

const roleLabels: Record<StaffRole, string> = {
  OWNER: "เจ้าของร้าน",
  ADMIN: "ผู้ดูแล",
  STAFF: "พนักงาน",
  KITCHEN: "ครัว",
};

export function StaffManager({
  members,
  canManage,
  currentUserId,
}: {
  members: StaffMember[];
  canManage: boolean;
  currentUserId: string;
}) {
  const router = useRouter();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const flash = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2800);
  };
  const invite = async (formData: FormData) => {
    const response = await fetch("/api/admin/staff/invite", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(Object.fromEntries(formData.entries())),
    });
    const body = (await response.json()) as { message?: string };
    if (!response.ok) return flash(body.message ?? "เชิญพนักงานไม่สำเร็จ");
    setInviteOpen(false);
    flash("ส่งคำเชิญแล้ว");
    router.refresh();
  };
  const changeRole = async (userId: string, role: StaffRole) => {
    const response = await fetch(`/api/admin/staff/${userId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (!response.ok) return flash("เปลี่ยนสิทธิ์ไม่สำเร็จ");
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
            <p>บัญชีและสิทธิ์การใช้งาน</p>
            <div className="page-title">พนักงาน</div>
          </div>
        </div>
        {canManage && (
          <button className="btn new-table" onClick={() => setInviteOpen(true)}>
            <MailPlus />
            เชิญพนักงาน
          </button>
        )}
      </header>
      <div className="permission-note">
        <ShieldCheck />
        <span>
          <b>สิทธิ์ถูกบังคับใช้ที่ฐานข้อมูล</b>
          <small>การซ่อนปุ่มในหน้าจอไม่ใช่กลไกความปลอดภัยหลัก</small>
        </span>
      </div>
      <div className="staff-list">
        {members.map((member) => (
          <article className="staff-row" key={member.userId}>
            <span className="staff-avatar">
              <UserRound />
            </span>
            <div>
              <strong>
                {member.displayName}
                {member.userId === currentUserId && <i>คุณ</i>}
              </strong>
              <small>
                เพิ่มเมื่อ{" "}
                {new Intl.DateTimeFormat("th-TH", {
                  dateStyle: "medium",
                }).format(new Date(member.createdAt))}
              </small>
            </div>
            {canManage && member.role !== "OWNER" ? (
              <select
                value={member.role}
                onChange={(event) =>
                  void changeRole(
                    member.userId,
                    event.target.value as StaffRole,
                  )
                }
              >
                <option value="ADMIN">ผู้ดูแล</option>
                <option value="STAFF">พนักงาน</option>
                <option value="KITCHEN">ครัว</option>
              </select>
            ) : (
              <span className={`role-badge role-${member.role.toLowerCase()}`}>
                {roleLabels[member.role]}
              </span>
            )}
            <span
              className={member.active ? "member-active" : "member-inactive"}
            >
              {member.active ? "ใช้งาน" : "ปิดใช้งาน"}
            </span>
          </article>
        ))}
      </div>
      {inviteOpen && (
        <div
          className="modal-backdrop admin-modal-backdrop"
          onMouseDown={() => setInviteOpen(false)}
        >
          <form
            className="admin-form-modal"
            action={invite}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="sheet-head">
              <div>
                <div className="eyebrow dark">Invite staff</div>
                <div className="section-title">เชิญพนักงาน</div>
              </div>
              <button
                type="button"
                className="icon-btn"
                aria-label="ปิด"
                onClick={() => setInviteOpen(false)}
              >
                <X />
              </button>
            </div>
            <div className="form-grid">
              <label className="form-field full">
                <span>ชื่อที่แสดง</span>
                <input name="displayName" maxLength={100} required />
              </label>
              <label className="form-field full">
                <span>อีเมล</span>
                <input name="email" type="email" required />
              </label>
              <label className="form-field full">
                <span>สิทธิ์</span>
                <select name="role" defaultValue="STAFF">
                  <option value="ADMIN">ผู้ดูแล</option>
                  <option value="STAFF">พนักงาน</option>
                  <option value="KITCHEN">ครัว</option>
                </select>
              </label>
            </div>
            <button className="btn confirm-order">ส่งคำเชิญ</button>
          </form>
        </div>
      )}
    </>
  );
}
