"use client";

import DashboardStats from "@/components/DashboardStats";
import { Building2, LayoutDashboard } from "lucide-react";

export default function SoftDashboardShell({
  title,
  eyebrow = "Pages / Dashboard",
  description,
  navItems,
  activeId,
  onSelect,
  statsType,
  children,
}) {
  const activeItem = navItems.find((item) => item.id === activeId) || navItems[0];
  const ActiveIcon = activeItem?.icon || LayoutDashboard;

  return (
    <div
      className="-mx-4 sm:-mx-6 lg:-mx-8 -my-5 sm:-my-6 min-h-[calc(100vh-180px)] bg-white px-4 sm:px-6 lg:px-8 py-5 sm:py-7"
      style={{
        backgroundImage:
          "linear-gradient(90deg, rgba(39,39,42,0.045) 1px, transparent 1px), linear-gradient(0deg, rgba(39,39,42,0.045) 1px, transparent 1px), linear-gradient(135deg, transparent 0 72%, rgba(255,107,18,0.08) 72% 73%, transparent 73%)",
        backgroundSize: "32px 32px, 32px 32px, 96px 96px",
      }}
    >
      <div className="grid grid-cols-1 xl:grid-cols-[304px_minmax(0,1fr)] gap-5 max-w-[1800px] mx-auto">
        <aside className="xl:sticky xl:top-28 self-start bg-white border border-zinc-950/10 rounded-[18px] shadow-[0_18px_42px_-24px_rgba(0,0,0,0.55)] p-4 xl:max-h-[calc(100vh-8rem)] xl:overflow-y-auto">
          <div className="flex items-center gap-3 px-2 py-2 mb-5">
            <div className="w-11 h-11 rounded-2xl bg-[#ff6b12] text-white flex items-center justify-center shadow-[0_10px_22px_-12px_rgba(255,107,18,0.9)]">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">EstateSync</p>
              <h1 className="text-base font-extrabold text-zinc-900 tracking-tight">Dashboard</h1>
            </div>
          </div>

          <nav className="flex xl:flex-col gap-2 overflow-x-auto xl:overflow-visible pb-2 xl:pb-0 pr-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeId === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelect(item.id)}
                  className={`group min-w-[220px] xl:min-w-0 w-full rounded-[14px] px-3 py-3 text-left transition-all duration-150 flex items-center gap-3 ${
                    isActive
                      ? "bg-white text-zinc-950 shadow-[0_12px_26px_-18px_rgba(0,0,0,0.75)] ring-1 ring-zinc-950/15"
                      : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950"
                  }`}
                  aria-pressed={isActive}
                >
                  <span
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                      isActive
                        ? "bg-[#ff6b12] text-white shadow-[0_10px_18px_-12px_rgba(255,107,18,0.95)]"
                        : "bg-white text-zinc-950 border border-zinc-950/10 group-hover:border-[#ff6b12] group-hover:text-[#ff6b12]"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-extrabold truncate">{item.shortLabel || item.label}</span>
                    {item.description && (
                      <span className="block text-[11px] font-semibold text-zinc-500 truncate">
                        {item.description}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </nav>

        </aside>

        <main className="space-y-5 min-w-0">
          <section className="bg-white border border-zinc-950/10 rounded-[20px] shadow-[0_18px_42px_-28px_rgba(0,0,0,0.55)] p-5 sm:p-6">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-500">
                {eyebrow.split("/").map((part, index, arr) => (
                  <span key={`${part}-${index}`} className={index === arr.length - 1 ? "text-zinc-900" : ""}>
                    {part.trim()}{index < arr.length - 1 ? " /" : ""}
                  </span>
                ))}
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 tracking-tight mt-2">{title}</h2>
              {description && <p className="text-sm text-zinc-700 mt-1 max-w-2xl">{description}</p>}
            </div>
          </section>

          {statsType && <DashboardStats type={statsType} />}

          <section className="bg-white border border-zinc-950/10 rounded-[20px] shadow-[0_18px_42px_-28px_rgba(0,0,0,0.55)] p-4 sm:p-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-zinc-950/10">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#27272a] text-white flex items-center justify-center shadow-[0_12px_22px_-18px_rgba(20,20,20,0.85)]">
                  <ActiveIcon className="w-5 h-5 text-[#ff6b12]" />
                </div>
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#ff6b12]">
                    Active Panel
                  </p>
                  <h3 className="text-xl font-extrabold text-zinc-950 tracking-tight">{activeItem.label}</h3>
                  {activeItem.description && <p className="text-sm text-zinc-700 mt-1">{activeItem.description}</p>}
                </div>
              </div>
            </div>

            <div className="pt-5">{children}</div>
          </section>
        </main>
      </div>
    </div>
  );
}
