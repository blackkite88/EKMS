import { Sparkles, Mail, Ticket, FileText, Mic, Settings, Plus } from "lucide-react";

const stats = [
  { label: "Emails", value: 12, icon: Mail, color: "text-blue-400" },
  { label: "Tickets", value: 8, icon: Ticket, color: "text-accent-lime" },
  { label: "Docs", value: 15, icon: FileText, color: "text-purple-400" },
  { label: "Meetings", value: 5, icon: Mic, color: "text-orange-400" },
];

export default function Sidebar({ onExit }: { onExit: () => void }) {
  return (
    <aside className="w-72 shrink-0 bg-black border-r border-zinc-900 flex flex-col h-screen">
      <div className="p-5 flex items-center justify-between border-b border-zinc-900">
        <button onClick={onExit} className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-accent-lime" strokeWidth={2.5} />
          <span className="font-display font-bold text-lg">Nexora</span>
        </button>
        <button className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center hover:border-accent-lime/50">
          <Plus className="w-4 h-4 text-zinc-400" />
        </button>
      </div>

      <div className="p-5 flex-1 overflow-y-auto nexora-scroll">
        <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-3">Knowledge Explorer</div>
        <div className="grid grid-cols-2 gap-2.5">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3 hover:border-accent-lime/40 cursor-pointer transition-colors"
            >
              <s.icon className={`w-4 h-4 ${s.color}`} />
              <div className="mt-3 font-display font-bold text-2xl">{s.value}</div>
              <div className="text-[11px] text-zinc-400">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-3 mt-8">Recent</div>
        <div className="space-y-1.5">
          {["Payments delay analysis", "Q3 OKR summary", "Auth migration", "Customer churn"].map((t) => (
            <button
              key={t}
              className="w-full text-left text-sm text-zinc-300 hover:bg-zinc-900 px-3 py-2 rounded-xl truncate"
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 border-t border-zinc-900 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-linear-to-br from-accent-lime to-emerald-400 text-black grid place-items-center font-bold text-sm">
          AK
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">Ava Kim</div>
          <div className="text-[11px] text-zinc-500 truncate">Product · Pro plan</div>
        </div>
        <button className="p-2 rounded-full hover:bg-zinc-900">
          <Settings className="w-4 h-4 text-zinc-400" />
        </button>
      </div>
    </aside>
  );
}
