import { useMemo, useState } from "react";
import Sidebar from "./Sidebar";
import Chat from "./Chat";
import SourcePanel from "./SourcePanel";
import type { Message, Source } from "./types";

const SOURCES: Source[] = [
  {
    id: "s1",
    type: "ticket",
    title: "Jira PROJ-42",
    subtitle: "Payments / Blocker",
    excerpt:
      "PROJ-42 (Blocker): Stripe webhook signature verification failing in staging. Until the rotated webhook secret is propagated to all edge regions, the Payments v2 rollout cannot proceed. ETA 5 business days after secret rotation completes.",
    highlight: "rotated webhook secret is propagated to all edge regions",
  },
  {
    id: "s2",
    type: "meeting",
    title: "Sprint Review · Jun 18",
    subtitle: "Meeting transcript",
    excerpt:
      "Maya: We're pushing Payments out of this sprint. The compliance review for PCI scope expansion came back with three blockers, and infra needs another week on the webhook secret rotation. Realistically we're looking at the next release window.",
    highlight: "compliance review for PCI scope expansion came back with three blockers",
  },
  {
    id: "s3",
    type: "email",
    title: "Re: Payments timeline",
    subtitle: "from cto@nexora.com",
    excerpt:
      "Team — given the PCI findings and the unresolved webhook rotation, I'm formally moving the Payments GA to July 12. Please update the public roadmap and notify the three design-partner accounts today.",
    highlight: "moving the Payments GA to July 12",
  },
  {
    id: "s4",
    type: "doc",
    title: "RFC-021 Payments v2",
    subtitle: "Engineering wiki",
    excerpt:
      "Section 7 — Risks: Rotation of the Stripe webhook secret has a hard dependency on the edge config rollout (tracked in INFRA-118). Failure to sequence these correctly will cause signature verification to fail and silently drop payment events.",
    highlight: "hard dependency on the edge config rollout",
  },
];

const INITIAL_MESSAGES: Message[] = [
  {
    id: "m1",
    role: "user",
    content: "Why was the Payments feature delayed?",
  },
  {
    id: "m2",
    role: "assistant",
    streaming: true,
    content:
      "The Payments v2 launch slipped for two compounding reasons:\n\n1. Compliance — the PCI scope review returned three open blockers during the Jun 18 sprint review, which prevented sign-off for production rollout.\n\n2. Infrastructure — the Stripe webhook secret rotation is gated on the edge config rollout (INFRA-118). Until the rotated secret reaches every edge region, signature verification fails and payment events would be silently dropped.\n\nThe CTO has formally moved GA to July 12 and asked that the public roadmap and design-partner accounts be notified.",
    sources: SOURCES,
  },
];

export default function Dashboard({ onExit }: { onExit: () => void }) {
  const [messages] = useState<Message[]>(INITIAL_MESSAGES);
  const [selectedId, setSelectedId] = useState<string | null>(SOURCES[0].id);

  const selected = useMemo(
    () => SOURCES.find((s) => s.id === selectedId) ?? null,
    [selectedId]
  );

  return (
    <div className="flex h-screen bg-background text-white overflow-hidden">
      <Sidebar onExit={onExit} />
      <Chat
        messages={messages}
        onSelectSource={(s) => setSelectedId(s.id)}
        selectedSourceId={selectedId ?? undefined}
      />
      {selected && <SourcePanel source={selected} onClose={() => setSelectedId(null)} />}
    </div>
  );
}
