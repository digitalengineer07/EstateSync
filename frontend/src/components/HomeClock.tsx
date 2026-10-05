"use client";

import { useEffect, useState } from "react";

const dateFormat = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata", weekday: "short", day: "2-digit", month: "long", year: "numeric",
});
const timeFormat = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true,
});

export default function HomeClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const update = () => setNow(new Date());
    const initial = window.setTimeout(update, 0);
    const interval = window.setInterval(update, 1000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, []);

  return (
    <div className="mt-6 border-t border-slate-300/60 pt-4 text-slate-600">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em]">India Standard Time</p>
      <time dateTime={now?.toISOString()} className="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="text-xs sm:text-sm">{now ? dateFormat.format(now) : "Loading date…"}</span>
        <span className="font-mono text-sm sm:text-base font-medium tabular-nums text-slate-900">
          {now ? timeFormat.format(now) : "—"} <span className="text-xs text-slate-500">IST</span>
        </span>
      </time>
    </div>
  );
}
