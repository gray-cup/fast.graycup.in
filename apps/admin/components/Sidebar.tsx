"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Dashboard", icon: "⊞" },
  { href: "/orders", label: "Orders", icon: "☰" },
  { href: "/invoices", label: "Invoices", icon: "📄" },
  { href: "/manual-invoice", label: "Manual Invoice", icon: "✍️" },
  { href: "/documents", label: "Documents", icon: "📁" },
  { href: "/label-merge", label: "Label Merge", icon: "🏷️" },
  { href: "/order-map", label: "Order Map", icon: "🗺️" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="print:hidden fixed top-12 left-0 bottom-0 w-56 z-20 bg-white border-r border-gray-200 flex flex-col">
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-transparent"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-3 py-4 border-t border-gray-200">
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
        >
          <span className="text-base">↗</span>
          View Store
        </Link>
      </div>
    </aside>
  );
}