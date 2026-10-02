import { useMemo, useState } from "react";

type View = "landing" | "customer" | "admin";
type IconName =
  | "arrow"
  | "bell"
  | "bill"
  | "cart"
  | "chef"
  | "clock"
  | "close"
  | "grid"
  | "home"
  | "menu"
  | "minus"
  | "orders"
  | "plus"
  | "search"
  | "settings"
  | "sparkle"
  | "user"
  | "users"
  | "waiter";

const icons: Record<IconName, React.ReactNode> = {
  home: <><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10M9 20v-6h6v6"/></>,
  user: <><circle cx="12" cy="8" r="4"/><path d="M4 21c.7-4.1 3.4-6 8-6s7.3 1.9 8 6"/></>,
  users: <><circle cx="9" cy="8" r="3"/><path d="M3 20c.5-3.6 2.5-5.5 6-5.5s5.5 1.9 6 5.5M16 5.5a3 3 0 0 1 0 5.8M17 14c2.4.5 3.7 2.2 4 5"/></>,
  chef: <><path d="M7 11a4 4 0 0 1 1-7.9A5 5 0 0 1 17 4a4 4 0 0 1 0 7"/><path d="M7 10v10h10V10M7 16h10"/></>,
  arrow: <><path d="m9 18 6-6-6-6"/></>,
  search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
  bell: <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></>,
  cart: <><path d="M3 4h2l2.2 11h10.9l2-7H6"/><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/></>,
  plus: <><path d="M12 5v14M5 12h14"/></>,
  minus: <><path d="M5 12h14"/></>,
  close: <><path d="m6 6 12 12M18 6 6 18"/></>,
  sparkle: <><path d="m12 2 1.5 5.5L19 9l-5.5 1.5L12 16l-1.5-5.5L5 9l5.5-1.5L12 2Z"/><path d="m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15Z"/></>,
  waiter: <><path d="M4 15h16M6 15a6 6 0 0 1 12 0M12 7V5"/><path d="M3 19h18"/></>,
  bill: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z"/><path d="M9 8h6M9 12h6"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  menu: <><path d="M4 7h16M4 12h16M4 17h16"/></>,
  grid: <><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></>,
  orders: <><path d="M6 3h12v18H6zM9 8h6M9 12h6M9 16h4"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H3v-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6V3h4v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></>,
};

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icons[name]}</svg>;
}

function Button({ children, className = "", onClick, icon }: { children: React.ReactNode; className?: string; onClick?: () => void; icon?: IconName }) {
  return <button className={`btn ${className}`} onClick={onClick}>{icon && <Icon name={icon} />}{children}</button>;
}

function IconButton({ icon, label, className = "", onClick }: { icon: IconName; label: string; className?: string; onClick?: () => void }) {
  return <button className={`icon-btn ${className}`} onClick={onClick} aria-label={label}><Icon name={icon} /></button>;
}

const photos = {
  hero: "https://images.unsplash.com/photo-1679541946014-a47f1ec0dc1a?auto=format&fit=crop&w=1800&q=88",
  salmon: "https://images.unsplash.com/photo-1548943487-a2e4e43b4853?auto=format&fit=crop&w=900&q=85",
  beef: "https://images.unsplash.com/photo-1515668236457-83c3b8764839?auto=format&fit=crop&w=900&q=85",
  salad: "https://images.unsplash.com/photo-1588791167871-c1dc0ff28edd?auto=format&fit=crop&w=900&q=85",
  noodles: "https://images.unsplash.com/photo-1581691762074-a12a9799107e?auto=format&fit=crop&w=900&q=85",
  dessert: "https://images.unsplash.com/photo-1590741664176-7fbd7e2592a0?auto=format&fit=crop&w=900&q=85",
  drink: "https://images.unsplash.com/photo-1665989099287-3948d871232c?auto=format&fit=crop&w=900&q=85",
};

const menuItems = [
  { id: 1, name: "แซลมอนย่างซอสยูซุ", en: "Yuzu glazed salmon", price: 320, image: photos.salmon, tag: "Chef’s choice" },
  { id: 2, name: "เนื้อย่างวากิว", en: "Charcoal wagyu", price: 450, image: photos.beef, tag: "Recommended" },
  { id: 3, name: "สลัดผักย่าง", en: "Garden vegetable salad", price: 190, image: photos.salad, tag: "Fresh" },
  { id: 4, name: "ราเมนซีฟู้ด", en: "Spicy seafood ramen", price: 280, image: photos.noodles, tag: "Popular" },
  { id: 5, name: "ช็อกโกแลตเบอร์รี่", en: "Dark chocolate berry", price: 180, image: photos.dessert, tag: "Signature" },
  { id: 6, name: "Ruby Citrus", en: "Citrus & berry tonic", price: 150, image: photos.drink, tag: "New" },
];

function Landing({ onNavigate }: { onNavigate: (view: View) => void }) {
  return (
    <main className="landing" style={{ backgroundImage: `linear-gradient(105deg, rgba(4,12,19,.94), rgba(4,12,19,.7)), url(${photos.hero})` }}>
      <div className="landing-grain" />
      <div className="landing-wrap landing-simple">
        <section className="entry-panel floating-entry">
          <button className="entry-card primary" onClick={() => onNavigate("customer")}>
            <span className="entry-icon"><Icon name="waiter" size={26} /></span>
            <span className="entry-text"><strong>เข้าสู่เมนูอาหาร</strong><small>สำหรับลูกค้าที่สแกน QR</small></span>
            <span className="entry-arrow"><Icon name="arrow" /></span>
          </button>
          <button className="entry-card" onClick={() => onNavigate("admin")}>
            <span className="entry-icon"><Icon name="users" size={25} /></span>
            <span className="entry-text"><strong>เข้าสู่ระบบร้านอาหาร</strong><small>สำหรับพนักงานและผู้ดูแลร้าน</small></span>
            <span className="entry-arrow"><Icon name="arrow" /></span>
          </button>
        </section>
      </div>
    </main>
  );
}

function Customer({ onBack }: { onBack: () => void }) {
  const [category, setCategory] = useState("แนะนำ");
  const [cart, setCart] = useState<Record<number, number>>({ 1: 1, 2: 1 });
  const [cartOpen, setCartOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const count = Object.values(cart).reduce((a, b) => a + b, 0);
  const total = menuItems.reduce((sum, item) => sum + (cart[item.id] || 0) * item.price, 0);
  const add = (id: number) => setCart((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  const change = (id: number, delta: number) => setCart((prev) => ({ ...prev, [id]: Math.max(0, (prev[id] || 0) + delta) }));
  const flash = (text: string) => { setNotice(text); window.setTimeout(() => setNotice(""), 2600); };

  return (
    <main className="customer">
      {notice && <div className="toast"><Icon name="bell" />{notice}</div>}
      <header className="customer-header">
        <div className="customer-top">
          <button className="mini-brand" onClick={onBack}><span className="mini-mark">S</span><span><b>SAVOUR</b><small>Modern Thai Cuisine</small></span></button>
          <div className="table-pill"><span className="live-dot" /><span>โต๊ะ</span><b>A05</b></div>
          <div className="header-actions">
            <Button className="quiet-action" icon="waiter" onClick={() => flash("ส่งคำขอเรียกพนักงานแล้ว")}>เรียกพนักงาน</Button>
            <Button className="quiet-action" icon="bill" onClick={() => flash("แจ้งขอเช็กบิลแล้ว")}>เช็กบิล</Button>
          </div>
        </div>
        <div className="menu-intro">
          <div><div className="eyebrow dark">Our selection</div><div className="page-title">เลือกความอร่อยของคุณ</div><p>ปรุงสดใหม่ทุกจาน ด้วยวัตถุดิบที่เราคัดสรร</p></div>
          <label className="search-box"><Icon name="search" /><input placeholder="ค้นหาเมนูอาหาร..." /></label>
        </div>
        <nav className="category-nav">
          {["แนะนำ", "อาหารจานเดียว", "เนื้อ", "ทะเล", "ผัก", "เครื่องดื่ม", "ของหวาน"].map((item) => (
            <button className={category === item ? "active" : ""} onClick={() => setCategory(item)} key={item}>{item}</button>
          ))}
        </nav>
      </header>

      <div className="customer-content">
        <div className="section-row"><div><div className="section-title">เมนูแนะนำ</div><p>รายการยอดนิยมที่หลายคนหลงรัก</p></div><span className="count-label">{menuItems.length} รายการ</span></div>
        <div className="food-grid">
          {menuItems.map((item) => (
            <article className="food-card" key={item.id}>
              <div className="food-image">
                <img src={item.image} alt={item.name} />
                <span className="food-tag">{item.tag}</span>
              </div>
              <div className="food-info">
                <div><strong>{item.name}</strong><small>{item.en}</small></div>
                <div className="food-bottom"><b>฿{item.price}</b>
                  {cart[item.id] ? (
                    <div className="stepper"><IconButton icon="minus" label="ลดจำนวน" onClick={() => change(item.id, -1)} /><span>{cart[item.id]}</span><IconButton icon="plus" label="เพิ่มจำนวน" onClick={() => add(item.id)} /></div>
                  ) : <IconButton icon="plus" label="เพิ่มลงตะกร้า" className="add-btn" onClick={() => add(item.id)} />}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="cart-dock">
        <div className="cart-summary"><span className="cart-icon"><Icon name="cart" /><i>{count}</i></span><span><small>ยอดรวม · {count} รายการ</small><strong>฿{total.toLocaleString()}</strong></span></div>
        <Button className="cart-button" onClick={() => setCartOpen(true)}>ดูตะกร้า <Icon name="arrow" /></Button>
      </div>
      <nav className="mobile-nav">
        <button className="active"><Icon name="menu" /><span>เมนู</span></button>
        <button><Icon name="orders" /><span>ออเดอร์</span></button>
        <button onClick={() => setCartOpen(true)}><Icon name="cart" /><span>ตะกร้า</span></button>
      </nav>

      {cartOpen && <div className="modal-backdrop" onMouseDown={() => setCartOpen(false)}>
        <section className="cart-sheet" onMouseDown={(e) => e.stopPropagation()}>
          <div className="sheet-handle" />
          <div className="sheet-head"><div><div className="eyebrow dark">Table A05</div><div className="section-title">ตะกร้าของคุณ</div></div><IconButton icon="close" label="ปิด" onClick={() => setCartOpen(false)} /></div>
          <div className="cart-lines">
            {menuItems.filter((x) => cart[x.id]).map((item) => <div className="cart-line" key={item.id}><img src={item.image} alt="" /><div><strong>{item.name}</strong><small>รสชาติปกติ</small><b>฿{item.price * cart[item.id]}</b></div><div className="stepper"><IconButton icon="minus" label="ลด" onClick={() => change(item.id, -1)} /><span>{cart[item.id]}</span><IconButton icon="plus" label="เพิ่ม" onClick={() => add(item.id)} /></div></div>)}
          </div>
          <label className="note-box">หมายเหตุถึงร้าน<input placeholder="เช่น ไม่ใส่ผัก, แยกน้ำ..." /></label>
          <div className="total-line"><span>ยอดรวมทั้งหมด</span><strong>฿{total.toLocaleString()}</strong></div>
          <Button className="confirm-order" onClick={() => { setCartOpen(false); flash("ส่งออเดอร์เข้าครัวเรียบร้อยแล้ว"); }}>ยืนยันการสั่งอาหาร <Icon name="arrow" /></Button>
        </section>
      </div>}
    </main>
  );
}

type TableState = "free" | "dining" | "new" | "ready" | "call" | "bill";
const tableData: { id: string; seats: number; state: TableState; time?: string; total?: string; items?: string[] }[] = [
  { id: "A01", seats: 4, state: "free" },
  { id: "A02", seats: 2, state: "new", time: "03:42", total: "฿1,240", items: ["เนื้อย่างวากิว ×2", "สลัดผักย่าง ×1", "+3 รายการ"] },
  { id: "A03", seats: 4, state: "dining", time: "28:12", total: "฿980", items: ["แซลมอนย่าง ×1", "Ruby Citrus ×2"] },
  { id: "A04", seats: 6, state: "call", time: "41:09", total: "฿2,840", items: ["เรียกพนักงาน"] },
  { id: "A05", seats: 4, state: "ready", time: "17:30", total: "฿770", items: ["อาหารพร้อมเสิร์ฟ", "ราเมนซีฟู้ด ×2"] },
  { id: "A06", seats: 2, state: "bill", time: "52:18", total: "฿1,560", items: ["ขอเช็กบิล"] },
  { id: "A07", seats: 4, state: "dining", time: "09:14", total: "฿620", items: ["กำลังเตรียม 2 รายการ"] },
  { id: "A08", seats: 8, state: "free" },
];
const stateLabels: Record<TableState, string> = { free: "ว่าง", dining: "กำลังใช้บริการ", new: "ออเดอร์ใหม่", ready: "พร้อมเสิร์ฟ", call: "เรียกพนักงาน", bill: "ขอเช็กบิล" };

function Admin({ onBack }: { onBack: () => void }) {
  const [filter, setFilter] = useState<TableState | "all">("all");
  const [selected, setSelected] = useState("A02");
  const [adminModal, setAdminModal] = useState<"table" | "stock" | null>(null);
  const [notice, setNotice] = useState("");
  const tables = useMemo(() => filter === "all" ? tableData : tableData.filter((t) => t.state === filter), [filter]);
  const selectedTable = tableData.find((t) => t.id === selected)!;
  const saveAdminData = (message: string) => {
    setAdminModal(null);
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2600);
  };
  return (
    <main className="admin">
      {notice && <div className="toast"><Icon name="sparkle" />{notice}</div>}
      <aside className="admin-sidebar">
        <button className="admin-brand" onClick={onBack}><span>S</span><b>SAVOUR<small>Restaurant OS</small></b></button>
        <nav>
          <button className="active"><Icon name="grid" /><span>ผังโต๊ะ</span><i>3</i></button>
          <button><Icon name="orders" /><span>ออเดอร์</span><i>5</i></button>
          <button><Icon name="chef" /><span>หน้าจอครัว</span></button>
          <button onClick={() => setAdminModal("stock")}><Icon name="menu" /><span>เมนูและสต็อก</span></button>
          <button><Icon name="users" /><span>พนักงาน</span></button>
        </nav>
        <div className="sidebar-bottom"><button><Icon name="settings" /><span>ตั้งค่าร้าน</span></button><div className="staff-profile"><span>NP</span><div><b>Narin P.</b><small>ผู้ดูแลระบบ</small></div></div></div>
      </aside>
      <section className="admin-main">
        <header className="admin-header">
          <div className="admin-title"><IconButton icon="menu" label="เปิดเมนู" className="mobile-menu-btn" /><div><p>วันศุกร์ที่ 24 พฤษภาคม</p><div className="page-title">Table Operations</div></div></div>
          <div className="admin-actions"><div className="store-open"><span /> ร้านเปิดอยู่</div><Button className="stock-button" icon="menu" onClick={() => setAdminModal("stock")}>จัดการสต็อก</Button><IconButton icon="bell" label="การแจ้งเตือน" className="notification-btn" /><Button className="new-table" icon="plus" onClick={() => setAdminModal("table")}>เพิ่มโต๊ะ</Button></div>
        </header>
        <div className="status-summary">
          <div><span className="summary-icon neutral"><Icon name="grid" /></span><p>โต๊ะทั้งหมด<strong>24</strong></p></div>
          <div><span className="summary-icon green"><Icon name="waiter" /></span><p>กำลังใช้งาน<strong>12</strong></p></div>
          <div><span className="summary-icon amber"><Icon name="orders" /></span><p>ออเดอร์ใหม่<strong>3</strong></p></div>
          <div><span className="summary-icon red"><Icon name="bell" /></span><p>ต้องดูแล<strong>2</strong></p></div>
        </div>
        <div className="board-toolbar">
          <div className="filter-pills">
            {([["all", "ทั้งหมด"], ["dining", "ใช้งาน"], ["new", "ออเดอร์ใหม่"], ["ready", "พร้อมเสิร์ฟ"], ["call", "เรียกพนักงาน"], ["bill", "เช็กบิล"]] as const).map(([key, label]) => <button className={filter === key ? "active" : ""} onClick={() => setFilter(key)} key={key}>{label}{key !== "all" && <i>{tableData.filter((t) => t.state === key).length}</i>}</button>)}
          </div>
          <label className="admin-search"><Icon name="search" /><input placeholder="ค้นหาโต๊ะ..." /></label>
        </div>
        <div className="zone-heading"><div><span>ZONE A</span><strong>Main Dining</strong></div><small>8 โต๊ะ · 5 กำลังใช้งาน</small></div>
        <div className="operations-layout">
          <div className="table-board">
            {tables.map((table) => <button className={`game-table state-${table.state} ${selected === table.id ? "selected" : ""}`} onClick={() => setSelected(table.id)} key={table.id}>
              {table.state !== "free" && <div className={`order-bubble ${table.state}`}>
                <span className="bubble-label">{stateLabels[table.state]}</span>
                {table.items?.map((item) => <b key={item}>{item}</b>)}
              </div>}
              <div className="chair chair-top" /><div className="chair chair-left" /><div className="chair chair-right" />
              <div className="table-top"><span>{table.id}</span><small><Icon name="users" size={13} />{table.seats}</small></div>
              <div className="table-meta">{table.state === "free" ? <span>แตะเพื่อเปิดโต๊ะ</span> : <><b><Icon name="clock" size={13} /> {table.time}</b><strong>{table.total}</strong></>}</div>
            </button>)}
          </div>
          <aside className="table-panel">
            <div className="panel-head"><div><span className={`state-dot ${selectedTable.state}`} /><div><small>TABLE</small><strong>{selectedTable.id}</strong></div></div><IconButton icon="close" label="ปิดรายละเอียด" /></div>
            <div className="panel-status"><span className={selectedTable.state}>{stateLabels[selectedTable.state]}</span><small><Icon name="clock" size={14} /> เปิดมาแล้ว {selectedTable.time || "00:00"}</small></div>
            <div className="guest-row"><span><Icon name="users" /></span><div><small>จำนวนลูกค้า</small><strong>{selectedTable.state === "free" ? "—" : "3 คน"}</strong></div><button>แก้ไข</button></div>
            <div className="panel-section-title"><span>รายการล่าสุด</span><button>ดูทั้งหมด</button></div>
            <div className="order-card">
              <div className="order-head"><span><b>Order #1048</b><small>3 นาทีที่แล้ว</small></span><i>NEW</i></div>
              <ul><li><span><b>2×</b> เนื้อย่างวากิว</span><strong>฿900</strong></li><li><span><b>1×</b> สลัดผักย่าง</span><strong>฿190</strong></li><li><span><b>2×</b> Ruby Citrus</span><strong>฿300</strong></li></ul>
              <div className="order-note">“เนื้อ Medium rare · ไม่ใส่หอม”</div>
              <div className="order-total"><span>รวมออเดอร์</span><strong>฿1,390</strong></div>
            </div>
            <Button className="accept-order">รับออเดอร์ <Icon name="arrow" /></Button>
            <div className="panel-footer"><span>ยอดรวมโต๊ะนี้</span><strong>{selectedTable.total || "฿0"}</strong></div>
          </aside>
        </div>
      </section>
      {adminModal && <div className="modal-backdrop admin-modal-backdrop" onMouseDown={() => setAdminModal(null)}>
        <section className="admin-form-modal" onMouseDown={(event) => event.stopPropagation()}>
          <div className="sheet-head">
            <div><div className="eyebrow dark">{adminModal === "table" ? "Table setup" : "Inventory"}</div><div className="section-title">{adminModal === "table" ? "เพิ่มโต๊ะใหม่" : "อัปเดตสต็อกสินค้า"}</div></div>
            <IconButton icon="close" label="ปิด" onClick={() => setAdminModal(null)} />
          </div>
          {adminModal === "table" ? <>
            <div className="form-grid">
              <label className="form-field"><span>ชื่อโต๊ะ</span><input defaultValue="A09" placeholder="เช่น A09" /></label>
              <label className="form-field"><span>จำนวนที่นั่ง</span><input defaultValue="4" type="number" /></label>
              <label className="form-field full"><span>โซน</span><select defaultValue="a"><option value="a">Zone A · Main Dining</option><option value="b">Zone B · Private Room</option><option value="outdoor">Outdoor</option></select></label>
            </div>
            <div className="friendly-hint"><Icon name="sparkle" /><span>เมื่อเพิ่มโต๊ะแล้ว คุณสามารถเปิดโต๊ะและสร้าง QR ใหม่ได้ทันที</span></div>
            <Button className="confirm-order" onClick={() => saveAdminData("เพิ่มโต๊ะ A09 เรียบร้อยแล้ว")}>บันทึกโต๊ะ <Icon name="arrow" /></Button>
          </> : <>
            <div className="stock-product">
              <img src={photos.salmon} alt="แซลมอนย่างซอสยูซุ" />
              <div><strong>แซลมอนย่างซอสยูซุ</strong><small>SKU · FD-001</small><span>เหลือ 8 จาน</span></div>
            </div>
            <div className="form-grid">
              <label className="form-field"><span>จำนวนคงเหลือ</span><input defaultValue="8" type="number" /></label>
              <label className="form-field"><span>แจ้งเตือนเมื่อเหลือ</span><input defaultValue="5" type="number" /></label>
              <label className="stock-toggle full"><span><b>ติดตามสต็อกอัตโนมัติ</b><small>ตัดจำนวนเมื่อออเดอร์สำเร็จ</small></span><input type="checkbox" defaultChecked /></label>
            </div>
            <div className="friendly-hint"><Icon name="bell" /><span>เมื่อสต็อกเป็น 0 เมนูจะเปลี่ยนเป็น “หมด” และลูกค้าจะสั่งไม่ได้</span></div>
            <Button className="confirm-order" onClick={() => saveAdminData("อัปเดตสต็อกเรียบร้อยแล้ว")}>บันทึกสต็อก <Icon name="arrow" /></Button>
          </>}
        </section>
      </div>}
    </main>
  );
}

export default function App() {
  const [view, setView] = useState<View>("landing");
  if (view === "customer") return <Customer onBack={() => setView("landing")} />;
  if (view === "admin") return <Admin onBack={() => setView("landing")} />;
  return <Landing onNavigate={setView} />;
}
