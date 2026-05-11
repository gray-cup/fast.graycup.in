"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingBag,
  FileText,
  PenLine,
  FolderOpen,
  Tag,
  Map,
  BarChart2,
  ExternalLink,
  type LucideIcon,
} from "lucide-react";

const navItems: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/",               label: "Dashboard",     icon: LayoutDashboard },
  { href: "/orders",         label: "Orders",        icon: ShoppingBag     },
  { href: "/invoices",       label: "Invoices",      icon: FileText        },
  { href: "/manual-invoice", label: "Manual Invoice",icon: PenLine         },
  { href: "/documents",      label: "Documents",     icon: FolderOpen      },
  { href: "/label-merge",    label: "Label Merge",   icon: Tag             },
  { href: "/order-map",      label: "Order Map",     icon: Map             },
  { href: "/state-orders",   label: "State Orders",  icon: BarChart2       },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="print:hidden fixed top-12 left-0 bottom-0 w-56 z-20 bg-white border-r border-gray-200 flex flex-col">
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-transparent"
              }`}
            >
              <Icon size={16} strokeWidth={2.5} />
              {label}
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
          <ExternalLink size={16} strokeWidth={2.5} />
          View Store
        </Link>
      </div>
    </aside>
  );
}
