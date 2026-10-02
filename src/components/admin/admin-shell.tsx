"use client";

import {
  BookOpenText,
  ChefHat,
  Grid2X2,
  History,
  LogOut,
  Menu,
  PackageOpen,
  Settings,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { logout } from "@/app/admin/(dashboard)/actions";
import type { AdminContext } from "@/lib/data/admin";

const links = [
  { href: "/admin/tables", label: "ผังโต๊ะ", icon: Grid2X2 },
  { href: "/admin/orders", label: "ออเดอร์และครัว", icon: ChefHat },
  { href: "/admin/menu", label: "เมนูและสต็อก", icon: BookOpenText },
  { href: "/admin/history", label: "ประวัติ", icon: History },
  { href: "/admin/staff", label: "พนักงาน", icon: Users },
  { href: "/admin/settings", label: "ตั้งค่าร้าน", icon: Settings },
];

export function AdminShell({
  context,
  children,
}: {
  context: AdminContext;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <main className="admin">
      <aside className={`admin-sidebar ${open ? "mobile-open" : ""}`}>
        <div className="sidebar-mobile-head">
          <Link className="admin-brand" href="/">
            <span>S</span>
            <b>
              {context.restaurantName}
              <small>Restaurant OS</small>
            </b>
          </Link>
          <button
            className="icon-btn"
            aria-label="ปิดเมนู"
            onClick={() => setOpen(false)}
          >
            <X />
          </button>
        </div>
        <nav>
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              href={href}
              className={pathname.startsWith(href) ? "active" : ""}
              onClick={() => setOpen(false)}
              key={href}
            >
              <Icon />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="staff-profile">
            <span>{context.displayName.slice(0, 2).toUpperCase()}</span>
            <div>
              <b>{context.displayName}</b>
              <small>{context.role}</small>
            </div>
          </div>
          <form action={logout}>
            <button className="sidebar-logout" aria-label="ออกจากระบบ">
              <LogOut />
            </button>
          </form>
        </div>
      </aside>
      {open && (
        <button
          className="sidebar-scrim"
          aria-label="ปิดเมนู"
          onClick={() => setOpen(false)}
        />
      )}
      <section className="admin-main">
        <button
          className="icon-btn mobile-menu-float"
          aria-label="เปิดเมนู"
          onClick={() => setOpen(true)}
        >
          <Menu />
        </button>
        {children}
      </section>
      <nav className="admin-mobile-nav">
        {links.slice(0, 4).map(({ href, label, icon: Icon }) => (
          <Link
            href={href}
            className={pathname.startsWith(href) ? "active" : ""}
            key={href}
          >
            <Icon />
            <span>{label}</span>
          </Link>
        ))}
        <button onClick={() => setOpen(true)}>
          <PackageOpen />
          <span>เพิ่มเติม</span>
        </button>
      </nav>
    </main>
  );
}
