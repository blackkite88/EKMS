export type SourceType = "email" | "ticket" | "doc" | "meeting";

export interface Source {
  id: string;
  type: SourceType;
  title: string;
  subtitle: string;
  excerpt: string;
  highlight: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  streaming?: boolean;
}

export const SOURCE_META: Record<SourceType, { color: string; bg: string; label: string }> = {
  email:   { color: "bg-blue-400",   bg: "bg-blue-400/10",   label: "Email" },
  ticket:  { color: "bg-[#a3ff12]",  bg: "bg-[#a3ff12]/10",  label: "Ticket" },
  doc:     { color: "bg-purple-400", bg: "bg-purple-400/10", label: "Doc" },
  meeting: { color: "bg-orange-400", bg: "bg-orange-400/10", label: "Meeting" },
};
