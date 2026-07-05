import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Landing from "@/components/nexora/Landing";
import Dashboard from "@/components/nexora/Dashboard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nexora · The Unified Intelligence Layer" },
      {
        name: "description",
        content:
          "Enterprise RAG that connects emails, Jira, wikis, and Slack into one verifiable query layer with citations and agentic actions.",
      },
      { property: "og:title", content: "Nexora · The Unified Intelligence Layer" },
      {
        property: "og:description",
        content: "Knowledge Brain for modern enterprises. Grounded answers with citations.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const [view, setView] = useState<"landing" | "app">("landing");
  return (
    <AnimatePresence mode="wait">
      {view === "landing" ? (
        <motion.div key="l" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
          <Landing onEnter={() => setView("app")} />
        </motion.div>
      ) : (
        <motion.div key="a" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
          <Dashboard onExit={() => setView("landing")} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
