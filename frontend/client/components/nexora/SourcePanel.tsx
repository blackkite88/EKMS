import { X, FileText, Zap, Mail, ListChecks } from "lucide-react";
import { motion } from "framer-motion";
import { SOURCE_META, type Source } from "./types";

const actions = [
  { label: "Generate Report", icon: FileText },
  { label: "Create Ticket", icon: Zap },
  { label: "Draft Email", icon: Mail },
  { label: "Extract Action Items", icon: ListChecks },
];

export default function SourcePanel({
  source, onClose,
}: { source: Source | null; onClose: () => void }) {
  return (
    <motion.aside
      initial={{ x: 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="w-96 shrink-0 bg-[#0d0d0d] border-l border-zinc-900 h-screen flex flex-col"
    >
      <div className="p-5 border-b border-zinc-900 flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-widest text-zinc-500">Source Viewer</div>
        <button onClick={onClose} className="p-1.5 rounded-full hover:bg-zinc-900">
          <X className="w-4 h-4 text-zinc-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto nexora-scroll p-5 space-y-6">
        {source ? (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full ${SOURCE_META[source.type].bg} text-white`}>
                {SOURCE_META[source.type].label}
              </span>
              <span className="text-[11px] text-zinc-500">{source.subtitle}</span>
            </div>
            <h3 className="font-display font-bold text-xl mb-4">{source.title}</h3>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 text-sm leading-relaxed text-zinc-300">
              {renderHighlighted(source.excerpt, source.highlight)}
            </div>
          </div>
        ) : (
          <div className="text-sm text-zinc-500">Select a source citation to inspect its raw context.</div>
        )}

        <div>
          <div className="text-[11px] uppercase tracking-widest text-zinc-500 mb-3">Actions</div>
          <div className="space-y-2">
            {actions.map((a) => (
              <button
                key={a.label}
                className="group w-full flex items-center justify-between rounded-full border border-zinc-800 bg-zinc-900/60 px-5 py-3 text-sm font-medium text-zinc-200 hover:bg-accent-lime hover:text-black hover:border-accent-lime transition-colors"
              >
                <span className="flex items-center gap-2.5">
                  <a.icon className="w-4 h-4" />
                  {a.label}
                </span>
                <span className="text-xs opacity-60 group-hover:opacity-100">Run →</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.aside>
  );
}

function renderHighlighted(text: string, highlight: string) {
  if (!highlight) return text;
  const idx = text.toLowerCase().indexOf(highlight.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-accent-lime/20 text-[#d6ff7a] rounded px-1 py-0.5 border border-accent-lime/30">
        {text.slice(idx, idx + highlight.length)}
      </mark>
      {text.slice(idx + highlight.length)}
    </>
  );
}
