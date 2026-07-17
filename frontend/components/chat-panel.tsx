'use client'

import { useState } from 'react'
import { ArrowUp, CheckCircle2, FileText, Sparkles } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

export function ChatPanel() {
  const [question, setQuestion] = useState('')

  function submitQuestion() {
    if (!question.trim()) return
    setQuestion('')
  }

  return (
    <section className="flex min-h-[600px] flex-1 flex-col bg-background lg:min-h-0">
      <header className="flex h-16 items-center justify-between border-b px-5">
        <div>
          <h1 className="font-medium">Ask Nexora</h1>
          <p className="text-xs text-muted-foreground">Grounded in 28,431 indexed sources</p>
        </div>
        <Badge variant="secondary"><CheckCircle2 data-icon="inline-start" /> All systems ready</Badge>
      </header>

      <div className="flex flex-1 flex-col gap-7 overflow-y-auto p-5 md:p-8">
        <div className="flex max-w-2xl self-end gap-3">
          <div className="rounded-2xl rounded-tr-sm bg-secondary px-4 py-3 text-sm leading-relaxed">What are the key risks for the Orion launch, and who owns each mitigation?</div>
          <Avatar size="sm"><AvatarFallback>RP</AvatarFallback></Avatar>
        </div>

        <div className="flex max-w-3xl gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"><Sparkles aria-hidden="true" className="size-4" /></div>
          <div className="flex flex-col gap-3">
            <div className="rounded-2xl rounded-tl-sm border bg-card p-5 text-sm leading-relaxed">
              <p>Three material risks are currently tracked for the Orion launch:</p>
              <ol className="mt-3 flex list-decimal flex-col gap-2 pl-5">
                <li><strong>Enterprise migration readiness</strong> — owned by Maya Chen. Mitigation: complete the final migration rehearsal before August 8.</li>
                <li><strong>EU data residency certification</strong> — owned by Elena Rossi. Mitigation: close the remaining two audit findings.</li>
                <li><strong>Support coverage at launch</strong> — owned by Jordan Lee. Mitigation: confirm the follow-the-sun escalation roster.</li>
              </ol>
              <p className="mt-3 text-muted-foreground">The launch brief marks the first risk as highest impact, while the security review identifies the certification timeline as the most schedule-sensitive.</p>
              <span className="mt-4 inline-block h-4 w-1.5 animate-pulse rounded-full bg-primary" aria-label="Response streaming" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" render={<button type="button" />}><FileText data-icon="inline-start" />[DOC | launch_brief_07]</Badge>
              <Badge variant="outline" render={<button type="button" />}><FileText data-icon="inline-start" />[EMAIL | email_02]</Badge>
              <Badge variant="outline" render={<button type="button" />}><FileText data-icon="inline-start" />[WIKI | orion_risks]</Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t bg-card p-4 md:p-5">
        <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-xl border bg-background p-2 focus-within:ring-2 focus-within:ring-ring">
          <Textarea value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && event.keyCode !== 229) { event.preventDefault(); submitQuestion() } }} aria-label="Ask a question" placeholder="Ask a question across company knowledge..." className="min-h-12 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0" />
          <Button size="icon" onClick={submitQuestion} aria-label="Send question"><ArrowUp /></Button>
        </div>
        <p className="mt-2 text-center font-mono text-[10px] text-muted-foreground">ANSWERS MAY CONTAIN SENSITIVE INFORMATION · ACCESS POLICY APPLIED</p>
      </div>
    </section>
  )
}
