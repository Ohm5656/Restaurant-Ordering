"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button className="btn new-table" onClick={() => window.print()}>
      <Printer />
      พิมพ์บิล
    </button>
  );
}
