'use client'

import { useEffect, useRef, useState } from 'react'
import cytoscape, { type Core, type ElementDefinition } from 'cytoscape'
import { Loader2, Network } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/lib/auth-context'
import { useGraphStream } from '@/lib/graph-stream-context'
import { api } from '@/lib/api'
import type { GraphResponse } from '@/lib/types'

// Colors per node label (kept in sync with the backend's node tiers).
const LABEL_COLOR: Record<string, string> = {
  Equipment: '#f59e0b', // amber hub — the central entity
  FailureReport: '#ef4444', // red — failures
  FailureMode: '#fb7185', // rose
  Inspection: '#a78bfa', // violet
  WorkOrder: '#60a5fa', // blue
  Manual: '#34d399', // green
  Procedure: '#2dd4bf', // teal
  Regulation: '#22d3ee', // cyan
  OperatingLog: '#facc15', // yellow
  Person: '#94a3b8', // slate
  Unit: '#c084fc', // purple
}

// Typed loosely: the cytoscape @types union for stylesheets is awkward to
// satisfy across versions; the object shape below is the documented CSS form.
const cyStyle = [
  {
    selector: 'node',
    style: {
      'background-color': '#1e293b',
      'border-width': 1,
      'border-color': '#334155',
      label: 'data(shortLabel)',
      color: '#64748b',
      'font-size': '7px',
      'text-valign': 'bottom',
      'text-margin-y': 3,
      width: 14,
      height: 14,
      'transition-property': 'background-color, border-color, width, height, opacity',
      'transition-duration': 0.25 as unknown as string,
      opacity: 0.35,
    },
  },
  {
    selector: 'node.active',
    style: {
      'background-color': 'data(color)',
      'border-color': 'data(color)',
      'border-width': 2,
      color: '#e2e8f0',
      'font-size': '9px',
      width: 26,
      height: 26,
      opacity: 1,
    },
  },
  {
    selector: 'node.seed',
    style: {
      width: 36,
      height: 36,
      'border-width': 3,
      'font-size': '10px',
    },
  },
  {
    selector: 'node.highlighted',
    style: {
      'border-color': '#fde047',
      'border-width': 4,
    },
  },
  {
    selector: 'edge',
    style: {
      width: 1,
      'line-color': '#1e293b',
      'target-arrow-color': '#1e293b',
      'target-arrow-shape': 'triangle',
      'arrow-scale': 0.6,
      'curve-style': 'bezier',
      opacity: 0.15,
      'transition-property': 'line-color, opacity, width',
      'transition-duration': 0.25 as unknown as string,
    },
  },
  {
    selector: 'edge.active',
    style: {
      width: 2.5,
      'line-color': '#38bdf8',
      'target-arrow-color': '#38bdf8',
      label: 'data(relation)',
      'font-size': '7px',
      color: '#7dd3fc',
      'text-rotation': 'autorotate',
      opacity: 0.9,
    },
  },
]

export function GraphCanvas({ full = false }: { full?: boolean }) {
  const { token } = useAuth()
  const { live } = useGraphStream()
  const containerRef = useRef<HTMLDivElement>(null)
  const cyRef = useRef<Core | null>(null)
  const [graph, setGraph] = useState<GraphResponse | null>(null)
  const [loading, setLoading] = useState(true)

  // Load the full (access-filtered) graph backdrop once.
  useEffect(() => {
    if (!token) return
    api
      .graph(token)
      .then((g) => setGraph(g))
      .catch(() => setGraph({ nodes: [], edges: [], stats: { visible: 0, hidden: 0, total: 0 } }))
      .finally(() => setLoading(false))
  }, [token])

  // Initialize Cytoscape when the graph data arrives.
  useEffect(() => {
    if (!graph || !containerRef.current) return

    const elements: ElementDefinition[] = [
      ...graph.nodes.map((n) => ({
        data: {
          id: n.id,
          shortLabel: n.title?.slice(0, 22) || n.id,
          color: LABEL_COLOR[n.label] || '#94a3b8',
          nodeLabel: n.label,
        },
      })),
      ...graph.edges
        // only edges whose endpoints exist as nodes
        .filter((e) => graph.nodes.some((n) => n.id === e.from) && graph.nodes.some((n) => n.id === e.to))
        .map((e) => ({
          data: { id: `${e.from}->${e.to}:${e.relation}`, source: e.from, target: e.to, relation: e.relation },
        })),
    ]

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: cyStyle as cytoscape.CytoscapeOptions['style'],
      layout: { name: 'cose', animate: false, nodeRepulsion: () => 8000, idealEdgeLength: () => 60, padding: 20 },
      minZoom: 0.2,
      maxZoom: 3,
      wheelSensitivity: 0.2,
    })
    cyRef.current = cy

    return () => {
      cy.destroy()
      cyRef.current = null
    }
  }, [graph])

  // React to live traversal state — light up active nodes/edges.
  useEffect(() => {
    const cy = cyRef.current
    if (!cy) return

    cy.batch(() => {
      cy.nodes().forEach((n) => {
        const id = n.id()
        n.toggleClass('active', live.activeNodeIds.has(id))
        n.toggleClass('seed', live.seedIds.has(id))
        n.toggleClass('highlighted', live.highlightedNodeIds.has(id))
      })
      const activeEdgeKeys = new Set(live.activeEdges.map((e) => `${e.from}->${e.to}:${e.relation}`))
      cy.edges().forEach((e) => {
        e.toggleClass('active', activeEdgeKeys.has(e.id()))
      })
    })

    // Gently center on the active subgraph as it grows.
    if (live.activeNodeIds.size > 0) {
      const active = cy.nodes().filter((n) => live.activeNodeIds.has(n.id()))
      if (active.length > 0) cy.animate({ fit: { eles: active, padding: 80 } }, { duration: 400 })
    }
  }, [live])

  const activeCount = live.activeNodeIds.size
  const edgeCount = live.activeEdges.length

  return (
    <section
      className={
        full
          ? 'flex min-h-0 flex-1 flex-col bg-background p-5'
          : 'flex min-h-[520px] flex-col border-t bg-card p-4 lg:w-[42%] lg:border-t-0 lg:border-l'
      }
    >
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium">Knowledge Graph</h2>
          <p className="text-xs text-muted-foreground">
            {live.isTraversing ? 'Reasoning through connections...' : 'Live context for this conversation'}
          </p>
        </div>
        {graph && (
          <Badge variant="outline" className="font-mono text-[10px]">
            {graph.stats.visible} visible · {graph.stats.hidden} restricted
          </Badge>
        )}
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl border bg-[#0b1120]">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        )}
        {!loading && graph && graph.nodes.length === 0 && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 text-center">
            <Network className="size-6 text-muted-foreground" aria-hidden="true" />
            <p className="text-xs text-muted-foreground">No accessible graph nodes</p>
          </div>
        )}
        <div ref={containerRef} className="h-full w-full" />
        <div className="pointer-events-none absolute right-3 bottom-3 font-mono text-[10px] text-muted-foreground">
          {activeCount} ACTIVE · {edgeCount} EDGES
          {live.blockedCount > 0 && <span className="text-destructive"> · {live.blockedCount} BLOCKED</span>}
        </div>
      </div>
    </section>
  )
}
