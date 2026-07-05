import { ArrowUp, Paperclip, Mic, Sparkles, Mail, Ticket, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { SOURCE_META, type Message, type Source } from "./types";

const iconFor = (t: Source["type"]) => {
  switch (t) {
    case "email": return Mail;
    case "ticket": return Ticket;
    case "doc": return FileText;
    case "meeting": return Mic;
  }
};

export default function Chat({
  messages,
  onSelectSource,
  selectedSourceId,
}: {
  messages: Message[];
  onSelectSource: (s: Source) => void;
  selectedSourceId?: string;
}) {
  const [input, setInput] = useState("");

  return (
    <div className="flex-1 flex flex-col h-screen bg-zinc-950 min-w-0">
      {/* Top bar */}
      <div className="px-8 py-4 border-b border-zinc-900 flex items-center justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-widest text-zinc-500">Thread</div>
          <h1 className="font-display font-bold text-lg">Payments feature delay analysis</h1>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <span className="w-1.5 h-1.5 rounded-full bg-[#a3ff12]" />
          40 sources indexed
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto nexora-scroll px-8 py-8 space-y-8">
        <div className="max-w-3xl mx-auto w-full space-y-8">
          {messages.map((m) => (
            <MessageBlock
              key={m.id}
              message={m}
              onSelectSource={onSelectSource}
              selectedSourceId={selectedSourceId}
            />
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="px-8 pb-6 pt-2">
        <div className="max-w-3xl mx-auto">
          <div className="relative flex items-center bg-zinc-900 border border-zinc-800 rounded-full pl-5 pr-2 py-2 focus-within:border-accent-lime/50 transition-colors">
            <button className="p-2 text-zinc-500 hover:text-white">
              <Paperclip className="w-4 h-4" />
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask the Knowledge Brain anything…"
              className="flex-1 bg-transparent outline-none text-sm py-2 placeholder:text-zinc-500"
            />
            <button className="p-2 text-zinc-500 hover:text-white">
              <Mic className="w-4 h-4" />
            </button>
            <button className="ml-1 w-10 h-10 rounded-full bg-accent-lime text-black grid place-items-center hover:bg-white transition-colors lime-glow-sm">
              <ArrowUp className="w-4 h-4" strokeWidth={2.8} />
            </button>
          </div>
          <div className="text-center text-[11px] text-zinc-600 mt-3">
            Nexora cites every claim. Answers grounded only in your data.
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageBlock({
  message, onSelectSource, selectedSourceId,
}: {
  message: Message;
  onSelectSource: (s: Source) => void;
  selectedSourceId?: string;
}) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-xl rounded-3xl rounded-tr-md bg-zinc-900 border border-zinc-800 px-5 py-3 text-sm">
          {message.content}
        </div>
      </div>
    );
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex gap-4"
    >
      <div className="shrink-0 w-9 h-9 rounded-full bg-zinc-900 border border-zinc-800 grid place-items-center">
        <Sparkles className="w-4 h-4 text-accent-lime" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] uppercase tracking-widest text-zinc-500 mb-2">Nexora · grounded answer</div>
        <div className={`text-[15px] leading-relaxed text-zinc-100 whitespace-pre-wrap ${message.streaming ? "caret-blink" : ""}`}>
          {message.content}
        </div>

        {message.sources && message.sources.length > 0 && (
          <>
            <div className="mt-5 text-[11px] uppercase tracking-widest text-zinc-500 mb-2">
              {message.sources.length} sources
            </div>
            <div className="flex flex-wrap gap-2">
              {message.sources.map((s) => {
                const meta = SOURCE_META[s.type];
                const Icon = iconFor(s.type);
                const active = s.id === selectedSourceId;
                return (
                  <button
                    key={s.id}
                    onClick={() => onSelectSource(s)}
                    className={`group flex items-center gap-2.5 rounded-2xl border px-3 py-2 text-left transition-all w-56 ${
                      active
                        ? "border-accent-lime/60 bg-accent-lime/5 lime-glow-sm"
                        : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-700"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-xl ${meta.bg} grid place-items-center shrink-0`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium truncate">{s.title}</div>
                      <div className="text-[10px] text-zinc-500 truncate">{s.subtitle}</div>
                    </div>
                    <span className={`w-1.5 h-1.5 rounded-full ${meta.color}`} />
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
