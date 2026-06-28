import dagre from "dagre";
import type { Edge, Node } from "@xyflow/react";

export const LAYOUT_NODE_WIDTH = 220;
export const LAYOUT_NODE_HEIGHT = 96;
export const LAYOUT_RANK_SPACING = 80;
export const LAYOUT_NODE_SPACING = 36;

export interface LayoutOptions {
  direction?: "LR" | "TB";
  rankSpacing?: number;
  nodeSpacing?: number;
  width?: number;
  height?: number;
  padding?: number;
}

/**
 * Run Dagre auto-layout on a set of nodes + edges.
 *
 * - direction LR gives a clean left-to-right execution flow.
 * - Nodes without edges are stacked below the main flow.
 * - Ensures nodes never overlap and maintains consistent spacing.
 * - Preserves parent-child relationships while minimizing edge crossings.
 */
export function layoutWorkflow(
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions = {},
): { nodes: Node[]; edges: Edge[] } {
  if (nodes.length === 0) {
    return { nodes: [], edges };
  }

  const {
    direction = "LR",
    rankSpacing = LAYOUT_RANK_SPACING,
    nodeSpacing = LAYOUT_NODE_SPACING,
    width = LAYOUT_NODE_WIDTH,
    height = LAYOUT_NODE_HEIGHT,
  } = options;

  const g = new dagre.graphlib.Graph({ multigraph: false, compound: false });
  g.setGraph({
    rankdir: direction,
    ranksep: rankSpacing,
    nodesep: nodeSpacing,
    marginx: 40,
    marginy: 40,
    acyclicer: "greedy",
    ranker: "network-simplex",
  });
  g.setDefaultEdgeLabel(() => ({}));

  // Index nodes for stable loop-up.
  const nodeMap = new Map<string, Node>();
  for (const n of nodes) {
    nodeMap.set(n.id, n);
    g.setNode(n.id, { width, height });
  }

  // Track connected node IDs to identify orphans.
  const connectedIds = new Set<string>();

  // Edges — only include edges that reference known nodes.
  for (const e of edges) {
    if (nodeMap.has(e.source) && nodeMap.has(e.target)) {
      g.setEdge(e.source, e.target);
      connectedIds.add(e.source);
      connectedIds.add(e.target);
    }
  }

  dagre.layout(g);

  // Find the bounding box of laid-out nodes so orphans can go below.
  let maxY = 0;
  for (const n of nodes) {
    const dag = g.node(n.id);
    if (dag && connectedIds.has(n.id)) {
      maxY = Math.max(maxY, dag.y + height / 2);
    }
  }

  // Apply positions from dagre; orphan nodes are stacked below the main flow.
  let orphanCol = 0;
  const maxOrphansPerRow = 4;
  const orphanSpacing = width + nodeSpacing;
  const orphanStartY = maxY + nodeSpacing * 2;
  let orphanRow = 0;

  const laidOut = nodes.map((node) => {
    const dag = g.node(node.id);
    if (!dag || !connectedIds.has(node.id)) {
      // Orphan node — stack below the main flow in a grid.
      const x = orphanCol * orphanSpacing;
      const y = orphanStartY + orphanRow * (height + nodeSpacing);
      orphanCol += 1;
      if (orphanCol >= maxOrphansPerRow) {
        orphanCol = 0;
        orphanRow += 1;
      }
      return { ...node, position: { x, y } };
    }
    const cx = dag.x - width / 2;
    const cy = dag.y - height / 2;
    return { ...node, position: { x: cx, y: cy } };
  });

  // Stamp smoothstep type on edges.
  const styledEdges = edges.map((e) => ({
    ...e,
    type: "workflow",
    animated: true,
  }));

  return { nodes: laidOut, edges: styledEdges };
}

/**
 * Detect whether an imported workflow's nodes need an auto-layout pass.
 * Returns true when most nodes are missing positions or stacked at the
 * default fallback (250, 100).
 */
export function needsAutoLayout(nodes: Node[]): boolean {
  if (nodes.length === 0) return false;
  // If there's only 1 node, no need to layout.
  if (nodes.length === 1) return false;

  const defaults = nodes.filter(
    (n) =>
      !n.position ||
      (Math.abs(n.position.x - 250) < 1 && Math.abs(n.position.y - 100) < 1) ||
      (Math.abs(n.position.x - 250) < 1 && Math.abs(n.position.y - 80) < 1),
  );

  // Check if many nodes share the exact same position (piled up).
  const posKey = (n: Node) => `${Math.round(n.position?.x ?? 0)},${Math.round(n.position?.y ?? 0)}`;
  const posCount = new Map<string, number>();
  for (const n of nodes) {
    const key = posKey(n);
    posCount.set(key, (posCount.get(key) ?? 0) + 1);
  }
  const maxStackedCount = Math.max(...posCount.values());
  const stackedRatio = maxStackedCount / nodes.length;

  return defaults.length / nodes.length > 0.5 || stackedRatio > 0.5;
}