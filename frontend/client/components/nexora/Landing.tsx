import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Search, ShieldCheck, Network, Github, Mail, FileText, Ticket, Lock, Zap, GitBranch, MessagesSquare, Quote } from "lucide-react";


const NavLink = ({ children }: { children: React.ReactNode }) => (
  <button className="text-sm text-zinc-400 hover:text-white transition-colors px-3 py-2">
    {children}
  </button>
);

export default function Landing({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="min-h-screen bg-background text-white nexora-scroll overflow-y-auto">
      <nav className="max-w-7xl mx-auto px-6 pt-6">
        <div className="flex items-center justify-between bg-zinc-900/60 backdrop-blur border border-zinc-800 rounded-full px-3 py-2">
          <div className="flex items-center gap-2 pl-3">
            <Sparkles className="w-5 h-5 text-accent-lime" strokeWidth={2.5} />
            <span className="font-display font-bold text-lg tracking-tight">Nexora</span>
          </div>
          <div className="hidden md:flex items-center gap-1">
            <NavLink>Features</NavLink>
            <NavLink>Security</NavLink>
            <NavLink>Integrations</NavLink>
            <NavLink>Pricing</NavLink>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-4 py-2 text-sm rounded-full text-zinc-300 hover:text-white">Sign In</button>
            <button
              onClick={onEnter}
              className="px-4 py-2 text-sm rounded-full bg-accent-lime text-black font-semibold hover:bg-[#b6ff3a] transition-all lime-glow-sm"
            >
              Launch Sandbox
            </button>
          </div>
        </div>
      </nav>

      <section className="relative max-w-6xl mx-auto px-6 pt-28 pb-28 text-center md:pt-32 md:pb-32">
        <div className="absolute inset-x-0 top-32 mx-auto h-105 w-105 radial-lime opacity-50 blur-2xl z-0" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="relative z-10"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/60 px-4 py-1.5 text-xs text-zinc-300 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-lime lime-glow-sm" />
            Enterprise RAG · Now in Sandbox
          </div>
          <h1 className="font-display font-bold text-5xl md:text-7xl leading-[1.05] tracking-tight">
            The{" "}
            <span className="text-accent-lime text-glow">Unified Intelligence</span>
            <br />
            Layer for Modern Enterprises.
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-zinc-400 text-lg">
            Nexora connects company emails, Jira, internal wikis, and Slack into an
            immediate, verifiable query framework — answers you can trust, with citations.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <div className="relative">
              <div className="absolute -inset-6 radial-lime opacity-70 blur-xl -z-10" />
              <button
                onClick={onEnter}
                className="group inline-flex items-center gap-2 px-7 py-4 rounded-full bg-accent-lime text-black font-semibold text-base hover:bg-white transition-all lime-glow"
              >
                Enter Knowledge Brain
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
            <button className="px-6 py-4 rounded-full border border-zinc-800 hover:border-zinc-600 text-sm font-medium">
              Watch demo
            </button>
          </div>
        </motion.div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-24 md:pt-4">
        <div className="grid md:grid-cols-3 gap-4">
          <BentoCard
            title="Hybrid Search"
            desc="BM25 keyword and dense vectors merge into one ranked result set."
            badge="Retrieval"
          >
            <div className="flex items-center justify-center gap-3 h-32">
              <div className="px-3 py-1.5 rounded-full bg-zinc-800 text-xs text-zinc-300">keyword</div>
              <Search className="w-5 h-5 text-accent-lime" />
              <div className="px-3 py-1.5 rounded-full bg-accent-lime/15 text-xs text-accent-lime border border-accent-lime/30">vector</div>
              <span className="text-zinc-600">=</span>
              <div className="px-3 py-1.5 rounded-full bg-white text-black text-xs font-semibold">match</div>
            </div>
          </BentoCard>
          <BentoCard
            title="Deterministic Context"
            desc="Answers strictly from provided context. Zero hallucinations."
            badge="Trust"
          >
            <div className="flex items-center justify-center h-32">
              <div className="relative">
                <ShieldCheck className="w-20 h-20 text-accent-lime" strokeWidth={1.2} />
                <div className="absolute inset-0 radial-lime opacity-50 blur-xl -z-10" />
              </div>
            </div>
          </BentoCard>
          <BentoCard
            title="Connected Ecosystem"
            desc="One brain across every tool your team already uses."
            badge="Integrations"
          >
            <div className="relative h-32 flex items-center justify-center">
              <div className="grid grid-cols-3 gap-3 text-zinc-500">
                <Github className="w-6 h-6" />
                <Ticket className="w-6 h-6" />
                <Mail className="w-6 h-6" />
                <FileText className="w-6 h-6" />
                <Network className="w-7 h-7 text-accent-lime" />
                <FileText className="w-6 h-6" />
              </div>
            </div>
          </BentoCard>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="text-center mb-12">
          <div className="text-[10px] uppercase tracking-widest text-accent-lime mb-3">Workflow</div>
          <h2 className="font-display font-bold text-4xl md:text-5xl tracking-tight">From query to <span className="text-accent-lime text-glow">grounded action</span></h2>
          <p className="mt-4 text-zinc-400 max-w-xl mx-auto">Four deterministic stages. Every answer is traceable to its source.</p>
        </div>
        <div className="grid md:grid-cols-4 gap-4">
          {[
            { icon: GitBranch, title: "Connect", desc: "Index Gmail, Jira, Confluence, Slack." },
            { icon: Search, title: "Retrieve", desc: "Hybrid BM25 + vector search ranks chunks." },
            { icon: ShieldCheck, title: "Ground", desc: "LLM answers strictly from cited context." },
            { icon: Zap, title: "Act", desc: "Trigger tickets, drafts, and reports inline." },
          ].map((s, i) => (
            <div key={i} className="relative rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
              <div className="absolute -top-3 left-5 text-[10px] font-mono text-zinc-500 bg-background px-2">0{i + 1}</div>
              <s.icon className="w-5 h-5 text-accent-lime mb-4" />
              <h3 className="font-display font-bold text-lg">{s.title}</h3>
              <p className="text-sm text-zinc-400 mt-1">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="grid md:grid-cols-5 gap-4">
          <div className="md:col-span-3 rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900/80 to-zinc-900/20 p-8 relative overflow-hidden">
            <div className="absolute -right-16 -top-16 w-64 h-64 radial-lime opacity-30 blur-2xl" />
            <Quote className="w-8 h-8 text-accent-lime mb-4" />
            <p className="font-display text-2xl md:text-3xl leading-snug tracking-tight">
              "Nexora cut our internal ticket triage time by <span className="text-accent-lime">73%</span>. The citations made our legal team trust AI for the first time."
            </p>
            <div className="mt-6 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-zinc-700" />
              <div>
                <div className="text-sm font-semibold">Mira Okonkwo</div>
                <div className="text-xs text-zinc-500">Head of Engineering, Helix Labs</div>
              </div>
            </div>
          </div>
          <div className="md:col-span-2 grid grid-cols-2 gap-4">
            {[
              { icon: Lock, k: "SOC 2", v: "Type II Certified" },
              { icon: ShieldCheck, k: "Zero", v: "Data Retention" },
              { icon: MessagesSquare, k: "120ms", v: "Median Latency" },
              { icon: Network, k: "40+", v: "Integrations" },
            ].map((m, i) => (
              <div key={i} className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 flex flex-col justify-between">
                <m.icon className="w-4 h-4 text-accent-lime" />
                <div>
                  <div className="font-display font-bold text-xl">{m.k}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">{m.v}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-zinc-900">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent-lime" strokeWidth={2.5} />
            <span className="font-display font-bold text-sm">Nexora</span>
            <span className="text-xs text-zinc-600 ml-2">© 2026 · Innovate + Inspire + Create</span>
          </div>
          <div className="flex items-center gap-5 text-xs text-zinc-500">
            <a className="hover:text-white transition-colors" href="#">Privacy</a>
            <a className="hover:text-white transition-colors" href="#">Terms</a>
            <a className="hover:text-white transition-colors" href="#">Security</a>
            <a className="hover:text-white transition-colors" href="#">Status</a>
          </div>
        </div>
      </footer>
    </div>
  );
}


function BentoCard({
  title, desc, badge, children,
}: { title: string; desc: string; badge: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-6 hover:border-accent-lime/40 transition-colors">
      <div className="text-[10px] uppercase tracking-widest text-accent-lime mb-3">{badge}</div>
      {children}
      <h3 className="font-display font-bold text-xl mt-4">{title}</h3>
      <p className="text-sm text-zinc-400 mt-2">{desc}</p>
    </div>
  );
}
