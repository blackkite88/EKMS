'use client'

import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { Loader2, Network } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/lib/auth-context'
import { useGraphStream } from '@/lib/graph-stream-context'
import { api } from '@/lib/api'
import type { GraphResponse } from '@/lib/types'

// Colors per node label (kept in sync with the backend's node tiers).
const LABEL_COLOR: Record<string, string> = {
  Equipment: '#f59e0b', // amber hub
  FailureReport: '#ef4444', // red
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

interface NodeDatum extends d3.SimulationNodeDatum {
  id: string
  label: string
  title: string
  shortLabel: string
  color: string
}

interface EdgeDatum extends d3.SimulationLinkDatum<NodeDatum> {
  id: string
  relation: string
  source: string | NodeDatum
  target: string | NodeDatum
}

export function GraphCanvas({ full = false }: { full?: boolean }) {
  const { token } = useAuth()
  const { live } = useGraphStream()
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  
  const [graph, setGraph] = useState<GraphResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const simulationRef = useRef<d3.Simulation<NodeDatum, EdgeDatum> | null>(null)
  const nodesMapRef = useRef<Map<string, NodeDatum>>(new Map())
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  
  const updateStylesRef = useRef<(currentLive: typeof live) => void>(() => {})

  // Load the full (access-filtered) graph backdrop once.
  useEffect(() => {
    if (!token) return
    api
      .graph(token)
      .then((g) => setGraph(g))
      .catch(() => setGraph({ nodes: [], edges: [], stats: { visible: 0, hidden: 0, total: 0 } }))
      .finally(() => setLoading(false))
  }, [token])

  // Initialize D3 graph
  useEffect(() => {
    if (!graph || !svgRef.current || !containerRef.current) return
    
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const width = containerRef.current.clientWidth || 800
    const height = containerRef.current.clientHeight || 600

    const container = svg.append('g').attr('class', 'graph-container')

    // Setup Zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        container.attr('transform', event.transform)
      })
    svg.call(zoom)
    zoomBehaviorRef.current = zoom

    // Prepare data
    const nodes: NodeDatum[] = graph.nodes.map(n => ({
      ...n,
      shortLabel: n.title?.slice(0, 22) || n.id,
      color: LABEL_COLOR[n.label] || '#94a3b8'
    }))
    
    const nodeMap = new Map(nodes.map(n => [n.id, n]))
    nodesMapRef.current = nodeMap

    const edges: EdgeDatum[] = graph.edges
      .filter(e => nodeMap.has(e.from) && nodeMap.has(e.to))
      .map(e => ({
        id: `${e.from}->${e.to}:${e.relation}`,
        source: e.from,
        target: e.to,
        relation: e.relation
      }))

    // Setup Simulation
    const simulation = d3.forceSimulation<NodeDatum, EdgeDatum>(nodes)
      .force('link', d3.forceLink<NodeDatum, EdgeDatum>(edges).id(d => d.id).distance(80))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('x', d3.forceX(width / 2).strength(0.03))
      .force('y', d3.forceY(height / 2).strength(0.03))
      .alphaDecay(0.02)

    simulationRef.current = simulation

    // Setup Markers
    const defs = svg.append('defs')
    
    defs.append('marker')
      .attr('id', 'arrow-inactive')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 18)
      .attr('refY', 0)
      .attr('markerWidth', 5)
      .attr('markerHeight', 5)
      .attr('orient', 'auto')
      .append('path')
      .attr('fill', '#1e293b')
      .attr('d', 'M0,-5L10,0L0,5')

    defs.append('marker')
      .attr('id', 'arrow-active')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 28)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('fill', '#38bdf8')
      .attr('d', 'M0,-5L10,0L0,5')

    // Draw Edges
    const link = container.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(edges)
      .enter().append('line')
      .attr('stroke', '#1e293b')
      .attr('stroke-width', 1)
      .attr('opacity', 0.15)
      .attr('marker-end', 'url(#arrow-inactive)')

    // Draw Edge Labels
    const edgeLabels = container.append('g')
      .attr('class', 'edge-labels')
      .selectAll('text')
      .data(edges)
      .enter().append('text')
      .text(d => d.relation)
      .attr('font-size', '5px')
      .attr('fill', '#475569')
      .attr('text-anchor', 'middle')
      .style('pointer-events', 'none')
      .attr('opacity', 0.4)

    // Draw Nodes
    const nodeGroup = container.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(nodes)
      .enter().append('g')

    const circles = nodeGroup.append('circle')
      .attr('r', 7)
      .attr('fill', d => d.color)
      .attr('stroke', '#334155')
      .attr('stroke-width', 1)
      .attr('opacity', 0.4)
      
    // Labels
    const labels = nodeGroup.append('text')
      .text(d => d.shortLabel)
      .attr('font-size', '7px')
      .attr('fill', '#94a3b8')
      .attr('dy', 14)
      .attr('text-anchor', 'middle')
      .style('pointer-events', 'none')
      .attr('opacity', 0.7)

    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as NodeDatum).x!)
        .attr('y1', d => (d.source as NodeDatum).y!)
        .attr('x2', d => (d.target as NodeDatum).x!)
        .attr('y2', d => (d.target as NodeDatum).y!)

      edgeLabels
        .attr('x', d => ((d.source as NodeDatum).x! + (d.target as NodeDatum).x!) / 2)
        .attr('y', d => ((d.source as NodeDatum).y! + (d.target as NodeDatum).y!) / 2 - 3)

      nodeGroup.attr('transform', d => `translate(${d.x},${d.y})`)
    })

    // Drag behavior
    nodeGroup.call(d3.drag<SVGGElement, NodeDatum>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart()
        d.fx = d.x
        d.fy = d.y
      })
      .on('drag', (event, d) => {
        d.fx = event.x
        d.fy = event.y
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0)
        d.fx = null
        d.fy = null
      })
    )

    // Define style updater for live traversal
    updateStylesRef.current = (currentLive) => {
      const activeNodeIds = currentLive.activeNodeIds
      const highlightedNodeIds = currentLive.highlightedNodeIds
      const seedIds = currentLive.seedIds
      const hoveredNodeId = currentLive.hoveredNodeId
      
      const activeEdges = new Set(currentLive.activeEdges.map((e) => `${e.from}->${e.to}:${e.relation}`))

      circles.transition().duration(250)
        .attr('fill', d => d.color)
        .attr('stroke', d => highlightedNodeIds.has(d.id) || d.id === hoveredNodeId ? '#fde047' : activeNodeIds.has(d.id) ? d.color : '#334155')
        .attr('stroke-width', d => highlightedNodeIds.has(d.id) || d.id === hoveredNodeId ? 4 : seedIds.has(d.id) ? 3 : activeNodeIds.has(d.id) ? 2 : 1)
        .attr('r', d => seedIds.has(d.id) || d.id === hoveredNodeId ? 18 : activeNodeIds.has(d.id) ? 13 : 7)
        .attr('opacity', d => activeNodeIds.has(d.id) || highlightedNodeIds.has(d.id) || d.id === hoveredNodeId ? 1 : 0.4)

      labels.transition().duration(250)
        .attr('font-size', d => seedIds.has(d.id) ? '10px' : activeNodeIds.has(d.id) ? '9px' : '7px')
        .attr('fill', d => activeNodeIds.has(d.id) ? '#f8fafc' : '#94a3b8')
        .attr('dy', d => seedIds.has(d.id) ? 26 : activeNodeIds.has(d.id) ? 20 : 14)
        .attr('opacity', d => activeNodeIds.has(d.id) ? 1 : 0.7)

      link.transition().duration(250)
        .attr('stroke', d => activeEdges.has(d.id) ? '#38bdf8' : '#1e293b')
        .attr('stroke-width', d => activeEdges.has(d.id) ? 2.5 : 1)
        .attr('opacity', d => activeEdges.has(d.id) ? 0.9 : 0.15)
        .attr('marker-end', d => activeEdges.has(d.id) ? 'url(#arrow-active)' : 'url(#arrow-inactive)')
        
      edgeLabels.transition().duration(250)
        .attr('fill', d => activeEdges.has(d.id) ? '#7dd3fc' : '#475569')
        .attr('font-size', d => activeEdges.has(d.id) ? '7px' : '5px')
        .attr('opacity', d => activeEdges.has(d.id) ? 1 : 0.4)
    }

    return () => {
      simulation.stop()
    }
  }, [graph]) // Rebuild on new graph data

  // React to live traversal state — light up active nodes/edges.
  useEffect(() => {
    if (!simulationRef.current || !updateStylesRef.current) return
    
    updateStylesRef.current(live)

    // Gently center on the active subgraph as it grows
    if (live.activeNodeIds.size > 0 && svgRef.current && containerRef.current && zoomBehaviorRef.current && nodesMapRef.current) {
      let sumX = 0, sumY = 0, count = 0
      live.activeNodeIds.forEach(id => {
        const node = nodesMapRef.current.get(id)
        if (node && node.x !== undefined && node.y !== undefined) {
          sumX += node.x
          sumY += node.y
          count++
        }
      })
      
      if (count > 0) {
        const avgX = sumX / count
        const avgY = sumY / count
        
        const width = containerRef.current.clientWidth
        const height = containerRef.current.clientHeight
        
        const svg = d3.select(svgRef.current)
        svg.transition().duration(750).call(
          zoomBehaviorRef.current.transform,
          d3.zoomIdentity.translate(width / 2 - avgX * 1.2, height / 2 - avgY * 1.2).scale(1.2)
        )
      }
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
        <div ref={containerRef} className="h-full w-full">
          <svg ref={svgRef} className="h-full w-full cursor-grab active:cursor-grabbing" />
        </div>
        <div className="pointer-events-none absolute right-3 bottom-3 font-mono text-[10px] text-muted-foreground">
          {activeCount} ACTIVE · {edgeCount} EDGES
          {live.blockedCount > 0 && <span className="text-destructive"> · {live.blockedCount} BLOCKED</span>}
        </div>
      </div>
    </section>
  )
}
