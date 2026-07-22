'use client'

// Shares the live graph-traversal events from the active query stream between
// the ChatPanel (which drives the SSE request) and the GraphCanvas (which
// renders the lighting-up animation). Kept separate from chat state since the
// graph needs to reset/accumulate independently of message history.
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import type { SSEEvent } from './types'

export interface LiveGraphState {
  activeNodeIds: Set<string>
  activeEdges: { from: string; to: string; relation: string }[]
  seedIds: Set<string>
  highlightedNodeIds: Set<string>
  blockedCount: number
  isTraversing: boolean
  hoveredNodeId: string | null
}

interface GraphStreamContextValue {
  live: LiveGraphState
  reset: () => void
  applyEvent: (event: SSEEvent) => void
  setHoveredNode: (id: string | null) => void
}

const emptyState: LiveGraphState = {
  activeNodeIds: new Set(),
  activeEdges: [],
  seedIds: new Set(),
  highlightedNodeIds: new Set(),
  blockedCount: 0,
  isTraversing: false,
  hoveredNodeId: null,
}

const GraphStreamContext = createContext<GraphStreamContextValue | null>(null)

export function GraphStreamProvider({ children }: { children: ReactNode }) {
  const [live, setLive] = useState<LiveGraphState>(emptyState)

  const reset = useCallback(() => {
    setLive({
      activeNodeIds: new Set(),
      activeEdges: [],
      seedIds: new Set(),
      highlightedNodeIds: new Set(),
      blockedCount: 0,
      isTraversing: true,
      hoveredNodeId: null,
    })
  }, [])

  const setHoveredNode = useCallback((id: string | null) => {
    setLive((prev) => ({ ...prev, hoveredNodeId: id }))
  }, [])

  const applyEvent = useCallback((event: SSEEvent) => {
    setLive((prev) => {
      switch (event.type) {
        case 'graph_seed':
          return {
            ...prev,
            seedIds: new Set(prev.seedIds).add(event.node),
            activeNodeIds: new Set(prev.activeNodeIds).add(event.node),
          }
        case 'node_activated':
          return { ...prev, activeNodeIds: new Set(prev.activeNodeIds).add(event.node) }
        case 'edge_traversed':
          return {
            ...prev,
            activeEdges: [...prev.activeEdges, { from: event.from, to: event.to, relation: event.relation }],
          }
        case 'node_blocked':
          return { ...prev, blockedCount: prev.blockedCount + 1 }
        case 'traversal_complete':
          return { ...prev, isTraversing: false }
        case 'citation_highlight':
          return { ...prev, highlightedNodeIds: new Set(prev.highlightedNodeIds).add(event.node) }
        default:
          return prev
      }
    })
  }, [])

  return <GraphStreamContext.Provider value={{ live, reset, applyEvent, setHoveredNode }}>{children}</GraphStreamContext.Provider>
}

export function useGraphStream() {
  const ctx = useContext(GraphStreamContext)
  if (!ctx) throw new Error('useGraphStream must be used within GraphStreamProvider')
  return ctx
}
