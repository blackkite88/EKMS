# AssetBrain — 3–4 Minute Demo Script

**For the recorder:** Follow this top to bottom. Each block has **[SAY]** (voice-over) and **[DO]** (on-screen action). Total ≈ 3.5 min. Speak calmly; let each answer finish streaming before moving on.

**One-time setup before recording (do NOT film this):**
- Backend running on `http://localhost:3001`, frontend on `http://localhost:3000`.
- Backend needs a working `GROQ_API_KEY` in `backend/.env` (the answers are live LLM — make sure the daily token cap isn't exhausted; if answers show a "rate limit" error, swap in a fresh key and restart).
- Have the login page open at `http://localhost:3000`, signed **out**.
- Demo logins (password for all: `demo`): `manager@bpi.com`, `technician@bpi.com`, `operator@bpi.com`.

---

## 0:00 – 0:20 — The Problem (hook)

**[SAY]** "In asset-heavy industries, engineers spend a third of their time hunting for information scattered across a dozen disconnected systems — drawings here, work orders there, failure history somewhere else. When an experienced engineer retires, that knowledge is gone. AssetBrain fixes this: it unifies a plant's fragmented documents into one brain you can ask, reason with, and act on."

**[DO]** Show the login screen. Point to the list of demo roles (Manager, Technician, Operator) — mention "role-based access is built in."

---

## 0:20 – 0:35 — Sign in

**[DO]** Log in as **manager@bpi.com** / `demo`.
**[SAY]** "I'll sign in as the Plant Manager. Everything I see is scoped to my clearance and department — access control is enforced on every answer."

**[DO]** Land on the **Copilot** panel. Briefly point to the left nav: Copilot, Knowledge Graph, Work Orders, Reports, Notifications, Compliance.

---

## 0:35 – 1:20 — The Copilot: Root-Cause Analysis (the hero moment)

**[DO]** In the Copilot, type: **`why did pump P-101 fail?`** — press enter.

**[SAY]** *(while the graph lights up and the answer streams)* "Watch the knowledge graph light up in real time as it reasons — pulling the failure record, the work orders, inspections, operating logs, and past failures. It doesn't just retrieve; it reasons like a reliability engineer."

**[DO]** Let the full RCA render. Scroll slowly through the sections: **Immediate Cause → Contributing Factors → Systemic Root Cause → Similar Past Failures → Recommendations → Responsible & Who Can Fix It.**

**[SAY]** "Every line is cited back to a real source document. It found the systemic root cause — a missing shaft-alignment step in the SOP — and connected it to a *previous* failure on a different pump that had the same cause. And it names the actual person responsible, not a vague department."

**[DO]** Click one inline citation (e.g. `[WO | WO-2041]`) → the source document drawer slides open.
**[SAY]** "One click opens the original source — full traceability."  *(Close the drawer.)*

---

## 1:20 – 1:50 — Ask "who", and the people graph

**[DO]** Type: **`who is R. Kulkarni?`**
**[SAY]** "It knows the people too. Kulkarni is the senior maintenance technician who owns these pumps — cited from his record."

**[DO]** *(optional, if time)* Type: **`name all the employees in the maintenance team`** — show it lists the maintenance crew only.

---

## 1:50 – 2:50 — Governed Action: guided compliance-to-work-order flow

**[SAY]** "It's not just answers — it takes governed actions. Watch this guided flow."

**[DO]** Type: **`generate a work order for one of the compliance gaps`**
**[SAY]** "Instead of guessing, it detects the open compliance gaps and asks which one." *(The bot lists ~8 overdue items with equipment, regulation, and days overdue.)*

**[DO]** Type: **`the P-230 one`**
**[SAY]** "Now it asks *who* to assign it to — and recommends the best match from the graph: S. Iyer, the rotating-equipment engineer who owns P-230. I can name someone, or ask it to decide."

**[DO]** Type: **`who is the best person for this?`**
**[SAY]** "I bounce the question back — and it reasons over the graph and recommends Iyer, with citations."

**[DO]** Type: **`yes assign it to them`** → a **Create Work Order** tile appears. **Click the tile.**
**[SAY]** "Nothing happens automatically — it *proposes*, and only when I click does the action execute. The work order is now filed and assigned to Iyer."

**[DO]** Go to the **Work Orders** section in the nav → show the new work order at the top, assigned to S. Iyer.

---

## 2:50 – 3:15 — Access control is real (the differentiator)

**[DO]** Sign out. Sign back in as **operator@bpi.com** / `demo`.
**[SAY]** "Now I'm a field operator with the lowest clearance. Same system, same data —"

**[DO]** Open the **Work Orders** section.
**[SAY]** "— but the maintenance work orders I just saw are gone. Access control isn't a checkbox; it's enforced on every document, every graph node, every answer. The operator literally cannot see what they're not cleared for."

---

## 3:15 – 3:40 — Close (business impact)

**[DO]** Sign back in as **manager@bpi.com**, land on Copilot.
**[SAY]** "AssetBrain turns a dozen disconnected systems into one reasoning brain — grounded in real documents, permission-aware, and able to act. It cuts the time-to-answer from hours of searching to seconds, catches compliance gaps before they escalate, and captures the retiring expert's knowledge before it walks out the door. That's a structural advantage in how a plant operates, maintains, and improves its assets."

**[DO]** End on the Copilot screen (or the knowledge graph view for a strong final visual).

---

## Backup / if something breaks
- **Answer shows a rate-limit error** → the Groq daily token cap is hit. Swap a fresh `GROQ_API_KEY` into `backend/.env`, restart the backend, retry.
- **Graph looks empty** → make sure `npm run ingest:reset` was run in `backend/` before recording.
- **Keep it tight:** if running long, drop the "who is R. Kulkarni" (1:20–1:50) and the maintenance-team query — the RCA, the guided action flow, and the access-control contrast are the three must-show moments.

## The three moments that win
1. **RCA reasoning + live graph + citations** (1:20 mark) — Technical Excellence + Innovation.
2. **Guided compliance→assignee→work-order action flow** (2:50 mark) — Innovation + Business Impact + UX.
3. **Operator can't see the manager's data** (3:15 mark) — the trust/safety differentiator; Technical Excellence.
