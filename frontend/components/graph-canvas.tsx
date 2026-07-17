import { Maximize2, Network } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export function GraphCanvas({ full = false }: { full?: boolean }) {
  return (
    <section className={full ? 'flex min-h-0 flex-1 flex-col bg-background p-5' : 'flex min-h-[520px] flex-col border-t bg-card p-4 lg:w-[40%] lg:border-t-0 lg:border-l xl:w-[44%]'}>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium">Knowledge Graph</h2>
          <p className="text-xs text-muted-foreground">Live context for this conversation</p>
        </div>
        <Button variant="ghost" size="icon" aria-label="Expand graph"><Maximize2 /></Button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-xl border bg-graph-canvas">
        <div className="pointer-events-none absolute inset-0 graph-grid opacity-40" />
        <div className="relative flex max-w-xs flex-col items-center gap-3 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl border bg-background"><Network aria-hidden="true" className="size-5 text-primary" /></div>
          <div>
            <p className="text-sm font-medium">Knowledge Graph</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Graph visualization mounts here. This canvas is intentionally empty.</p>
          </div>
          <Badge variant="outline" className="font-mono">CANVAS READY</Badge>
        </div>
        <div className="absolute right-3 bottom-3 font-mono text-[10px] text-muted-foreground">0 NODES · 0 EDGES</div>
      </div>
    </section>
  )
}
