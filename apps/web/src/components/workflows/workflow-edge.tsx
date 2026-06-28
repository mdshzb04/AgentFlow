"use client";

import { memo } from "react";
import { getBezierPath, type EdgeProps } from "@xyflow/react";

/**
 * Smooth curved workflow edge. Uses React Flow's bezier path generator with a
 * wider curvature so connections read clearly even when nodes are stacked
 * vertically. Selected edges get a brighter accent.
 */
function WorkflowEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  selected,
}: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: 0.35,
  });

  return (
    <path
      id={id}
      d={edgePath}
      markerEnd={markerEnd}
      style={{
        stroke: selected
          ? "rgb(139, 92, 246)"
          : "rgb(161, 161, 170)",
        strokeWidth: selected ? 2.5 : 1.75,
        ...style,
      }}
      fill="none"
      className="transition-[stroke] duration-200"
    />
  );
}

export const WorkflowEdge = memo(WorkflowEdgeComponent);

export const workflowEdgeTypes = {
  workflow: WorkflowEdge,
} as const;