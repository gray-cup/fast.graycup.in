"use client";

import { useState, useEffect } from "react";

type Order = {
  id: number;
  orderNumber: number;
  orderRef: string;
  status: string;
  amount: number;
  variantLabel: string;
  quantity: number;
  weightCategory?: string;
  totalWeightGrams?: number;
  createdAt: string;
};
type Period = "today" | "week" | "lifetime";
type PatternTab = "hour" | "weekday" | "month";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// ─── Color scale ──────────────────────────────────────────────────────────────

function heatColor(count: number, max: number): string {
  if (count === 0 || max === 0) return "#f3f4f6";
  const t = Math.sqrt(count / max);
  if (t < 0.18) return "#fef3c7";
  if (t < 0.36) return "#fde68a";
  if (t < 0.54) return "#fbbf24";
  if (t < 0.72) return "#f59e0b";
  if (t < 0.88) return "#d97706";
  return "#92400e";
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────

type TT = { x: number; y: number; text: string } | null;

function Tip({ tt }: { tt: TT }) {
  if (!tt) return null;
  const flipLeft = typeof window !== "undefined" && tt.x > window.innerWidth - 220;
  return (
    <div
      className="fixed z-[200] pointer-events-none"
      style={flipLeft
        ? { right: window.innerWidth - tt.x + 8, top: tt.y - 40 }
        : { left: tt.x + 14, top: tt.y - 40 }}
    >
      <div className="bg-gray-950 text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-lg shadow-2xl whitespace-nowrap">
        {tt.text}
      </div>
    </div>
  );
}

function ttOn(set: React.Dispatch<React.SetStateAction<TT>>, text: string) {
  return {
    onMouseEnter: (e: React.MouseEvent) => set({ x: e.clientX, y: e.clientY, text }),
    onMouseMove: (e: React.MouseEvent) => set((t) => t ? { ...t, x: e.clientX, y: e.clientY } : t),
    onMouseLeave: () => set(null),
  };
}

// ─── Period helpers ───────────────────────────────────────────────────────────

function normalizeStatus(status: string) {
  return status?.trim().toUpperCase();
}
/** Total grams shipped for stats; prefers DB column, else variant heuristic. */
function totalGramsForOrder(order: Order): number {
  const g = order.totalWeightGrams;
  if (g != null && g > 0) return g;
  const match = order.variantLabel?.match(/150gm\s*x\s*(\d+)/i);
  if (match) return parseInt(match[1], 10) * 150;
  const label = (order.variantLabel || "").toLowerCase();
  const unit =
    label.includes("500gm") && !label.includes("150gm") ? 500 : 150;
  return unit * order.quantity;
}
function filterOrders(orders: Order[], period: Period): Order[] {
  if (period === "today") {
    const today = new Date().toISOString().slice(0, 10);
    return orders.filter((o) => o.createdAt.slice(0, 10) === today);
  }
  if (period === "week") {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 7);
    return orders.filter((o) => new Date(o.createdAt) >= cutoff);
  }
  return orders;
}

// ─── GitHub-style heatmap ─────────────────────────────────────────────────────

function GitHubHeatmap({ orders }: { orders: Order[] }) {
  const [tt, setTt] = useState<TT>(null);

  const countByDate: Record<string, number> = {};
  const expiredByDate: Record<string, number> = {};
  orders.forEach((o) => {
    const k = o.createdAt.slice(0, 10);
    countByDate[k] = (countByDate[k] || 0) + 1;
    if (isExpired(o)) expiredByDate[k] = (expiredByDate[k] || 0) + 1;
  });
  const maxCount = Math.max(1, ...Object.values(countByDate));

  // 53 weeks Mon→Sun
  const todayDate = new Date(); todayDate.setHours(0, 0, 0, 0);
  const dow = (todayDate.getDay() + 6) % 7;
  const gridStart = new Date(todayDate);
  gridStart.setDate(todayDate.getDate() - dow - 52 * 7);

  const weeks: { date: Date; count: number; future: boolean }[][] = [];
  const cur = new Date(gridStart);
  for (let w = 0; w < 53; w++) {
    const week: { date: Date; count: number; future: boolean }[] = [];
    for (let d = 0; d < 7; d++) {
      const ds = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`;
      week.push({ date: new Date(cur), count: countByDate[ds] || 0, future: cur > todayDate });
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(week);
  }

  const monthLabels: (string | null)[] = weeks.map((week, i) => {
    if (i === 0 || week[0].date.getMonth() !== weeks[i - 1][0].date.getMonth())
      return MONTHS_SHORT[week[0].date.getMonth()];
    return null;
  });

  // Callouts
  const peakEntry = Object.entries(countByDate).sort(([, a], [, b]) => b - a)[0];
  const hourBuckets = new Array(24).fill(0);
  orders.forEach((o) => hourBuckets[new Date(o.createdAt).getHours()]++);
  const peakHour = hourBuckets.indexOf(Math.max(...hourBuckets));
  const fmtH = (h: number) => h === 0 ? "12 am" : h < 12 ? `${h} am` : h === 12 ? "12 pm" : `${h - 12} pm`;

  const CELL = 11, GAP = 3;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <h2 className="text-sm font-black text-gray-900 tracking-tight">Order Activity</h2>
          <p className="text-[11px] text-gray-400 mt-1">
            {orders.length} orders · peak at <span className="font-semibold text-gray-600">{fmtH(peakHour)}</span>
            {peakEntry && <>
              {" · "}busiest <span className="font-semibold text-gray-600">
                {new Date(peakEntry[0]).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} ({peakEntry[1]})
              </span>
            </>}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-gray-400">Less</span>
          {[0, 0.15, 0.35, 0.65, 0.9, 1].map((t, i) => (
            <div key={i} style={{ width: CELL, height: CELL, borderRadius: 2, backgroundColor: heatColor(t * maxCount, maxCount) }} />
          ))}
          <span className="text-[10px] text-gray-400">More</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="flex" style={{ gap: GAP }}>
          {/* Day row labels */}
          <div className="flex flex-col shrink-0" style={{ gap: GAP, paddingTop: 18 }}>
            {["Mon", "", "Wed", "", "Fri", "", "Sun"].map((lbl, i) => (
              <div key={i} style={{ height: CELL, lineHeight: `${CELL}px`, fontSize: 9 }} className="text-gray-400 w-7 text-right pr-1">
                {lbl}
              </div>
            ))}
          </div>

          <div>
            {/* Month column labels */}
            <div className="flex" style={{ gap: GAP, height: 16, marginBottom: 2 }}>
              {weeks.map((_, wi) => (
                <div key={wi} style={{ width: CELL, fontSize: 9, overflow: "visible", whiteSpace: "nowrap" }} className="text-gray-400">
                  {monthLabels[wi] ?? ""}
                </div>
              ))}
            </div>
            {/* Cell grid */}
            <div className="flex" style={{ gap: GAP }}>
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col" style={{ gap: GAP }}>
                  {week.map((day, di) => (
                    <div
                      key={di}
                      style={{
                        width: CELL, height: CELL, borderRadius: 2,
                        backgroundColor: day.future ? "transparent" : heatColor(day.count, maxCount),
                        cursor: day.future ? "default" : "crosshair",
                      }}
                      {...(!day.future ? ttOn(setTt, (() => {
                        const ds = `${day.date.getFullYear()}-${String(day.date.getMonth() + 1).padStart(2, "0")}-${String(day.date.getDate()).padStart(2, "0")}`;
                        const exp = expiredByDate[ds] || 0;
                        const succ = day.count - exp;
                        const parts: string[] = [];
                        if (succ > 0) parts.push(`${succ} order${succ !== 1 ? "s" : ""}`);
                        if (exp > 0) parts.push(`${exp} expired`);
                        const label = parts.length ? parts.join(" · ") : "0 orders";
                        return `${label} · ${day.date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}`;
                      })()) : {})}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <Tip tt={tt} />
    </div>
  );
}

// ─── Tooltip text helper ──────────────────────────────────────────────────────

function orderLabel(total: number, expired: number): string {
  const succ = total - expired;
  const parts: string[] = [];
  if (succ > 0) parts.push(`${succ} order${succ !== 1 ? "s" : ""}`);
  if (expired > 0) parts.push(`${expired} expired`);
  return parts.length ? parts.join(" · ") : "0 orders";
}

// ─── Hour × weekday heatmap ───────────────────────────────────────────────────

function HourHeatmap({ orders }: { orders: Order[] }) {
  const [tt, setTt] = useState<TT>(null);
  const grid: number[][] = Array.from({ length: 7 }, () => new Array(24).fill(0));
  const expiredGrid: number[][] = Array.from({ length: 7 }, () => new Array(24).fill(0));
  orders.forEach((o) => {
    const d = new Date(o.createdAt);
    const di = (d.getDay() + 6) % 7;
    const hi = d.getHours();
    grid[di][hi]++;
    if (isExpired(o)) expiredGrid[di][hi]++;
  });
  const max = Math.max(1, ...grid.flat());
  const fmtH = (h: number) => h === 0 ? "12am" : h < 12 ? `${h}am` : h === 12 ? "12pm" : `${h - 12}pm`;

  return (
    <div>
      <div className="flex mb-2" style={{ paddingLeft: 40 }}>
        {Array.from({ length: 24 }, (_, h) => (
          <div key={h} className="flex-1 text-center" style={{ fontSize: 8, color: "#9ca3af" }}>
            {h % 6 === 0 ? fmtH(h) : ""}
          </div>
        ))}
      </div>
      {grid.map((row, di) => (
        <div key={di} className="flex items-center mb-[3px] gap-[2px]">
          <div className="shrink-0 text-right pr-2" style={{ width: 38, fontSize: 9.5, color: "#9ca3af" }}>{DAYS[di]}</div>
          {row.map((count, hi) => (
            <div
              key={hi}
              className="flex-1 rounded-[2px]"
              style={{ height: 24, backgroundColor: heatColor(count, max) }}
              {...ttOn(setTt, `${DAYS[di]} ${fmtH(hi)} · ${orderLabel(count, expiredGrid[di][hi])}`)}
            />
          ))}
        </div>
      ))}
      <Tip tt={tt} />
    </div>
  );
}

// ─── Week-rows × day-columns heatmap ─────────────────────────────────────────

function WeekdayHeatmap({ orders }: { orders: Order[] }) {
  const [tt, setTt] = useState<TT>(null);
  const weekMap = new Map<string, number[]>();
  const expiredWeekMap = new Map<string, number[]>();
  orders.forEach((o) => {
    const d = new Date(o.createdAt);
    const di = (d.getDay() + 6) % 7;
    const mon = new Date(d); mon.setDate(d.getDate() - di); mon.setHours(0, 0, 0, 0);
    const k = `${mon.getFullYear()}-${String(mon.getMonth() + 1).padStart(2, "0")}-${String(mon.getDate()).padStart(2, "0")}`;
    if (!weekMap.has(k)) weekMap.set(k, new Array(7).fill(0));
    weekMap.get(k)![di]++;
    if (isExpired(o)) {
      if (!expiredWeekMap.has(k)) expiredWeekMap.set(k, new Array(7).fill(0));
      expiredWeekMap.get(k)![di]++;
    }
  });

  const weeks = Array.from(weekMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-24)
    .map(([k, counts]) => ({ start: new Date(k + "T00:00:00"), counts, expiredCounts: expiredWeekMap.get(k) ?? new Array(7).fill(0) }));

  const max = Math.max(1, ...weeks.flatMap((w) => w.counts));

  return (
    <div>
      <div className="flex mb-2" style={{ paddingLeft: 56 }}>
        {DAYS.map((d) => (
          <div key={d} className="flex-1 text-center" style={{ fontSize: 9, color: "#9ca3af" }}>{d}</div>
        ))}
      </div>
      {weeks.length === 0 && <p className="text-center text-xs text-gray-400 py-10">No data yet</p>}
      {weeks.map((week, i) => (
        <div key={i} className="flex items-center mb-[3px] gap-[2px]">
          <div className="shrink-0 text-right pr-2" style={{ width: 54, fontSize: 8.5, color: "#9ca3af" }}>
            {week.start.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
          </div>
          {week.counts.map((count, di) => {
            const day = new Date(week.start); day.setDate(week.start.getDate() + di);
            return (
              <div
                key={di}
                className="flex-1 rounded-[2px]"
                style={{ height: 18, backgroundColor: heatColor(count, max) }}
                {...ttOn(setTt,
                  `${day.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })} · ${orderLabel(count, week.expiredCounts[di])}`
                )}
              />
            );
          })}
        </div>
      ))}
      <Tip tt={tt} />
    </div>
  );
}

// ─── Month-col × week-of-month-row heatmap ───────────────────────────────────

function MonthWeekHeatmap({ orders }: { orders: Order[] }) {
  const [tt, setTt] = useState<TT>(null);
  const now = new Date();

  const colMonths: Date[] = Array.from({ length: 12 }, (_, i) =>
    new Date(now.getFullYear(), now.getMonth() - (11 - i), 1)
  );
  const grid: number[][] = Array.from({ length: 12 }, () => new Array(4).fill(0));
  const expiredGrid: number[][] = Array.from({ length: 12 }, () => new Array(4).fill(0));

  orders.forEach((o) => {
    const d = new Date(o.createdAt);
    const monthsAgo = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
    if (monthsAgo < 0 || monthsAgo > 11) return;
    const col = 11 - monthsAgo;
    const row = Math.min(3, Math.floor((d.getDate() - 1) / 7));
    grid[col][row]++;
    if (isExpired(o)) expiredGrid[col][row]++;
  });

  const max = Math.max(1, ...grid.flat());

  return (
    <div>
      <div className="flex mb-2" style={{ paddingLeft: 40 }}>
        {colMonths.map((m, i) => (
          <div key={i} className="flex-1 text-center" style={{ fontSize: 9, color: "#9ca3af" }}>
            {MONTHS_SHORT[m.getMonth()]}
          </div>
        ))}
      </div>
      {["W1", "W2", "W3", "W4"].map((label, wi) => (
        <div key={wi} className="flex items-center mb-[3px] gap-[2px]">
          <div className="shrink-0 text-right pr-2" style={{ width: 38, fontSize: 9.5, color: "#9ca3af" }}>{label}</div>
          {grid.map((col, mi) => {
            const count = col[wi];
            const m = colMonths[mi];
            return (
              <div
                key={mi}
                className="flex-1 rounded-[2px]"
                style={{ height: 30, backgroundColor: heatColor(count, max) }}
                {...ttOn(setTt,
                  `${label} · ${m.toLocaleString("default", { month: "long", year: "numeric" })} · ${orderLabel(count, expiredGrid[mi][wi])}`
                )}
              />
            );
          })}
        </div>
      ))}
      <Tip tt={tt} />
    </div>
  );
}

// ─── Pattern tabs ─────────────────────────────────────────────────────────────

const PTABS: { key: PatternTab; label: string; sub: string }[] = [
  { key: "hour", label: "Hour of Day", sub: "When during the day orders arrive" },
  { key: "weekday", label: "Weekly", sub: "Day-of-week patterns across weeks" },
  { key: "month", label: "Monthly", sub: "Which week of the month is busiest" },
];

function PatternTabs({ orders }: { orders: Order[] }) {
  const [tab, setTab] = useState<PatternTab>("hour");
  const active = PTABS.find((t) => t.key === tab)!;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
        <div>
          <h2 className="text-sm font-black text-gray-900 tracking-tight">{active.label}</h2>
          <p className="text-[11px] text-gray-400 mt-0.5">{active.sub}</p>
        </div>
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
          {PTABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                tab === t.key ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      {tab === "hour"    && <HourHeatmap orders={orders} />}
      {tab === "weekday" && <WeekdayHeatmap orders={orders} />}
      {tab === "month"   && <MonthWeekHeatmap orders={orders} />}
    </div>
  );
}

// ─── Stat cards ───────────────────────────────────────────────────────────────

const PERIODS: { key: Period; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "lifetime", label: "All Time" },
];

const SUCCESSFUL = ["PAID", "PAID_DISPATCH_PENDING", "DISPATCHED", "DELIVERED", "RETURNED", "CANCELLED"];

function isExpired(o: Order) {
  return normalizeStatus(o.status) === "PENDING" && Date.now() - new Date(o.createdAt).getTime() > 15 * 60 * 1000;
}

function StatCards({ orders, period }: { orders: Order[]; period: Period }) {
  const o = filterOrders(orders, period);

  const successful = o.filter((x) => SUCCESSFUL.includes(normalizeStatus(x.status)));
  const expired = o.filter(isExpired);
  const total = successful.length + expired.length;

  const revenue = successful.reduce((s, x) => s + x.amount, 0);
  const paid = o.filter((x) => ["PAID", "PAID_DISPATCH_PENDING"].includes(normalizeStatus(x.status))).length;
  const dispatched = o.filter((x) => normalizeStatus(x.status) === "DISPATCHED").length;
  const delivered = o.filter((x) => normalizeStatus(x.status) === "DELIVERED").length;

  const totalShippedGrams = successful.reduce((sum, order) => sum + totalGramsForOrder(order), 0);
  const totalShippedKg = totalShippedGrams / 1000;

  const successPct = total === 0 ? 0 : Math.round((successful.length / total) * 100);
  const expiredPct = total === 0 ? 0 : 100 - successPct;

  const maxVal = Math.max(1, successful.length);

  const metricCards = [
    { label: "Revenue", value: `₹${revenue.toLocaleString("en-IN")}`, sub: "from paid orders", color: "bg-emerald-500", track: "bg-emerald-50", num: revenue },
    { label: "Awaiting", value: paid, sub: "to dispatch", color: "bg-orange-400", track: "bg-orange-50", num: paid },
    { label: "Transit", value: dispatched, sub: "with courier", color: "bg-violet-500", track: "bg-violet-50", num: dispatched },
    { label: "Delivered", value: delivered, sub: "completed", color: "bg-green-500", track: "bg-green-50", num: delivered },
    {
      label: "Shipment weight",
      value: `${totalShippedKg.toFixed(2)} kg`,
      sub: `${totalShippedGrams.toLocaleString("en-IN")} g total`,
      color: "bg-amber-500",
      track: "bg-amber-50",
      num: totalShippedKg,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {/* Successful orders */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-col gap-3">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Successful</p>
        <p className="text-[26px] font-black leading-none text-gray-900">{successful.length}</p>
        <div className="h-1 rounded-full bg-gray-100 overflow-hidden">
          <div className="h-full bg-gray-900 rounded-full transition-all duration-700" style={{ width: `${successPct}%` }} />
        </div>
        <p className="text-[10px] text-gray-400">{successPct}% of all orders</p>
      </div>

      {/* Expired orders */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-col gap-3">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Expired</p>
        <p className="text-[26px] font-black leading-none text-gray-400">{expired.length}</p>
        <div className="h-1 rounded-full bg-gray-100 overflow-hidden">
          <div className="h-full bg-gray-300 rounded-full transition-all duration-700" style={{ width: `${expiredPct}%` }} />
        </div>
        <p className="text-[10px] text-gray-400">{expiredPct}% of all orders</p>
      </div>

      {/* Metric cards */}
      {metricCards.map((c) => {
        const pct = Math.round((c.num / maxVal) * 100);
        return (
          <div key={c.label} className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-col gap-3">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{c.label}</p>
            <p className="text-[26px] font-black leading-none text-gray-900">{c.value}</p>
            <div className={`h-1 rounded-full ${c.track} overflow-hidden`}>
              <div className={`h-full rounded-full ${c.color} transition-all duration-700`} style={{ width: `${pct}%` }} />
            </div>
            <p className="text-[10px] text-gray-400">{c.sub}</p>
          </div>
        );
      })}

      {/* Success rate */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-col gap-3">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Conversion Rate</p>
        <p className="text-[26px] font-black leading-none text-gray-900">{successPct}%</p>
        <div className="h-1 rounded-full bg-gray-100 overflow-hidden">
          <div className="h-full rounded-full bg-teal-500 transition-all duration-700" style={{ width: `${successPct}%` }} />
        </div>
        <p className="text-[10px] text-gray-400">{successful.length} of {total} successful conversions</p>
      </div>
    </div>
  );
}

// ─── Recent orders strip ──────────────────────────────────────────────────────

const STATUS_DOT: Record<string, string> = {
  PENDING: "bg-yellow-400", EXPIRED: "bg-gray-300", PAID: "bg-blue-500",
  PAID_DISPATCH_PENDING: "bg-orange-400", DISPATCHED: "bg-violet-500",
  DELIVERED: "bg-green-500", RETURNED: "bg-red-400", CANCELLED: "bg-gray-300",
};

function RecentOrders({ orders, period }: { orders: Order[]; period: Period }) {
  const visible = filterOrders(orders, period).slice(0, 8);
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Recent Orders</h2>
        <a href="/orders" className="text-[11px] font-semibold text-amber-600 hover:text-amber-800 transition-colors">View all →</a>
      </div>
      {visible.length === 0
        ? <p className="text-center py-10 text-sm text-gray-400">No orders in this period</p>
        : (
          <div className="divide-y divide-gray-50">
            {visible.map((o) => {
              const status = normalizeStatus(o.status);
              const st = status === "PENDING" && Date.now() - new Date(o.createdAt).getTime() > 15 * 60 * 1000 ? "EXPIRED" : status;
              return (
                <div key={o.id} className="flex items-center gap-3 px-5 py-2.5 hover:bg-gray-50/60 transition-colors">
                  <span className="text-[10px] font-bold text-gray-300 tabular-nums w-6 shrink-0">#{o.orderNumber}</span>
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[st] ?? "bg-gray-300"}`} />
                  <span className="font-mono text-xs font-bold text-gray-700 flex-1 truncate">{o.orderRef}</span>
                  <span className="text-[10px] text-gray-400 tabular-nums shrink-0">
                    {new Date(o.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                  </span>
                  <span className="text-sm font-black text-gray-900 shrink-0">₹{o.amount.toLocaleString("en-IN")}</span>
                </div>
              );
            })}
          </div>
        )}
    </div>
  );
}

// ─── Expired Orders ───────────────────────────────────────────────────────────

function ExpiredOrders({ orders }: { orders: Order[] }) {
  const expired = orders
    .filter(isExpired)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (expired.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Expired Orders</h2>
          <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-2 py-0.5 rounded-full">{expired.length}</span>
        </div>
        <span className="text-[11px] text-gray-400">PENDING &gt; 15 min</span>
      </div>
      <div className="divide-y divide-gray-50">
        {expired.map((o) => {
          const age = Date.now() - new Date(o.createdAt).getTime();
          const mins = Math.floor(age / 60000);
          const ageLabel = mins < 60 ? `${mins}m ago` : `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
          return (
            <div key={o.id} className="flex items-center gap-3 px-5 py-2.5 hover:bg-gray-50/60 transition-colors">
              <span className="text-[10px] font-bold text-gray-300 tabular-nums w-6 shrink-0">#{o.orderNumber}</span>
              <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-gray-300" />
              <span className="font-mono text-xs font-bold text-gray-700 flex-1 truncate">{o.orderRef}</span>
              <span className="text-[10px] text-gray-400 tabular-nums shrink-0">{ageLabel}</span>
              <span className="text-sm font-black text-gray-400 shrink-0">₹{o.amount.toLocaleString("en-IN")}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AdminHome() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("lifetime");

  useEffect(() => {
    fetch("/api/orders")
      .then((r) => r.json())
      .then((data) => { setOrders(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="h-full overflow-y-auto pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h1 className="text-xl font-black text-gray-900 tracking-tight">Dashboard</h1>
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                period === p.key ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-32">
          <div className="w-8 h-8 border-[3px] border-amber-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <StatCards orders={orders} period={period} />
          <GitHubHeatmap orders={orders} />
          <PatternTabs orders={orders} />
          <RecentOrders orders={orders} period={period} />
          <ExpiredOrders orders={orders} />
        </div>
      )}
    </div>
  );
}
