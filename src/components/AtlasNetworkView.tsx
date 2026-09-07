"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { AtlasGraph, AtlasGraphEdge } from "@/lib/atlas/atlasGraph";
import { getKnowledgeRole } from "@/lib/display";
import type { Institution, KnowledgeRole, Resource } from "@/types";

type AtlasNetworkViewProps = {
  graph: AtlasGraph;
  resources: Resource[];
  institutions: Institution[];
  showResearchLeads: boolean;
  activeEdgeId: string;
  focusedNodeId: string;
  onEdgeClick: (edgeId: string) => void;
  onNodeClick: (nodeId: string) => void;
  onBackgroundClick: () => void;
};

type NetworkPosition = { x: number; y: number };

const networkRoleCenters: Record<KnowledgeRole, NetworkPosition> = {
  institutional_norm: { x: 420, y: 330 },
  policy_strategy: { x: 780, y: 330 },
  method_standard: { x: 600, y: 510 },
  platform_system: { x: 600, y: 230 },
  project_practice: { x: 370, y: 610 },
  public_participation: { x: 830, y: 610 },
};

function getNodeYear(resourceById: Map<string, Resource>, nodeId: string) {
  const resource = resourceById.get(nodeId);

  return resource?.publishDate.slice(0, 4) || "年份未记录";
}

function getNodeLabel(
  node: AtlasGraph["nodes"][number],
  resourceById: Map<string, Resource>,
  institutionById: Map<string, Institution>,
) {
  const resource = resourceById.get(node.id);

  if (resource) {
    return [resource.titleZh, resource.titleEn, getNodeYear(resourceById, node.id)]
      .filter(Boolean)
      .join(" · ");
  }

  const institution = institutionById.get(node.id);

  return [
    institution?.nameZh || institution?.nameEn || node.label,
    institution?.shortName || institution?.nameEn || "",
  ]
    .filter(Boolean)
    .join(" · ");
}

function getNodeRole(
  resourceById: Map<string, Resource>,
  nodeId: string,
): KnowledgeRole | "institution" {
  const resource = resourceById.get(nodeId);

  if (resource) {
    return getKnowledgeRole(resource);
  }

  return "institution";
}

function getInitialNodePositions(graph: AtlasGraph, resourceById: Map<string, Resource>) {
  const positions: Record<string, NetworkPosition> = {};
  const roleIndexes = new Map<string, number>();

  graph.nodes.forEach((node) => {
    const role = getNodeRole(resourceById, node.id);

    if (role === "institution") {
      const index = roleIndexes.get("institution") ?? 0;
      roleIndexes.set("institution", index + 1);
      positions[node.id] = {
        x: 210 + (index % 12) * 76,
        y: 98 + Math.floor(index / 12) * 54,
      };
      return;
    }

    const index = roleIndexes.get(role) ?? 0;
    roleIndexes.set(role, index + 1);
    const center = networkRoleCenters[role];
    const angle = (index / 24) * Math.PI * 2;
    const radius = 72 + (index % 4) * 36;

    positions[node.id] = {
      x: center.x + Math.cos(angle) * radius,
      y: center.y + Math.sin(angle) * radius,
    };
  });

  return positions;
}

function getEdgePath(source: NetworkPosition, target: NetworkPosition, edgeId: string) {
  const jitter = edgeId.length % 5;
  const middleX = (source.x + target.x) / 2;
  const middleY = (source.y + target.y) / 2;

  return `M ${source.x} ${source.y} C ${middleX - 18 + jitter} ${
    middleY - 10 + jitter
  }, ${middleX + 18 - jitter} ${middleY + 10 - jitter}, ${target.x} ${target.y}`;
}

function isEdgeVisible(edge: AtlasGraphEdge, showResearchLeads: boolean) {
  return edge.status === "verified" || showResearchLeads;
}

export function AtlasNetworkView({
  graph,
  resources,
  institutions,
  showResearchLeads,
  activeEdgeId,
  focusedNodeId,
  onEdgeClick,
  onNodeClick,
  onBackgroundClick,
}: AtlasNetworkViewProps) {
  const resourceById = useMemo(
    () => new Map(resources.map((resource) => [resource.id, resource])),
    [resources],
  );
  const institutionById = useMemo(
    () => new Map(institutions.map((institution) => [institution.id, institution])),
    [institutions],
  );
  const [nodePositions, setNodePositions] = useState(() =>
    getInitialNodePositions(graph, resourceById),
  );
  const [viewTransform, setViewTransform] = useState({
    x: 0,
    y: 0,
    scale: 0.78,
  });
  const dragState = useRef<{
    nodeId?: string;
    lastClientX: number;
    lastClientY: number;
    isBackground: boolean;
    moved: boolean;
  } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const visibleEdges = graph.edges.filter((edge) =>
    isEdgeVisible(edge, showResearchLeads),
  );
  const focusedEdgeIds = new Set(
    focusedNodeId
      ? graph.edges
          .filter((edge) => edge.source === focusedNodeId || edge.target === focusedNodeId)
          .map((edge) => edge.id)
      : [],
  );

  useEffect(() => {
    const svg = svgRef.current;

    if (!svg) {
      return;
    }

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const bounds = svg.getBoundingClientRect();
      const localX = event.clientX - bounds.left;
      const localY = event.clientY - bounds.top;
      setViewTransform((current) => {
        const nextScale = Math.min(
          2,
          Math.max(0.45, current.scale * (event.deltaY > 0 ? 0.92 : 1.08)),
        );

        return {
          scale: nextScale,
          x: localX - ((localX - current.x) * nextScale) / current.scale,
          y: localY - ((localY - current.y) * nextScale) / current.scale,
        };
      });
    };

    svg.addEventListener("wheel", handleWheel, { passive: false });
    return () => svg.removeEventListener("wheel", handleWheel);
  }, [viewTransform.scale]);

  const handlePointerDown = (
    event: React.PointerEvent<SVGElement>,
    nodeId?: string,
  ) => {
    dragState.current = {
      nodeId,
      lastClientX: event.clientX,
      lastClientY: event.clientY,
      isBackground: !nodeId,
      moved: false,
    };
  };

  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const drag = dragState.current;

    if (!drag) {
      return;
    }

    const deltaX = event.clientX - drag.lastClientX;
    const deltaY = event.clientY - drag.lastClientY;

    if (Math.abs(deltaX) + Math.abs(deltaY) > 2) {
      drag.moved = true;
    }

    if (drag.nodeId) {
      setNodePositions((current) => ({
        ...current,
        [drag.nodeId as string]: {
          x: (current[drag.nodeId as string]?.x ?? 0) + deltaX / viewTransform.scale,
          y: (current[drag.nodeId as string]?.y ?? 0) + deltaY / viewTransform.scale,
        },
      }));
    } else {
      setViewTransform((current) => ({
        ...current,
        x: current.x + deltaX,
        y: current.y + deltaY,
      }));
    }

    drag.lastClientX = event.clientX;
    drag.lastClientY = event.clientY;
  };

  const handlePointerUp = () => {
    const drag = dragState.current;
    dragState.current = null;

    if (drag?.isBackground && !drag.moved) {
      onBackgroundClick();
    }
  };

  return (
    <div className="atlas-network-view">
      <svg
        viewBox="0 0 1200 760"
        role="application"
        aria-label="知识图谱网络视图"
        ref={svgRef}
        onPointerDown={(event) => handlePointerDown(event)}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <defs>
          <marker
            id="atlas-network-arrow"
            markerHeight="8"
            markerWidth="8"
            orient="auto"
            refX="7"
            refY="4"
          >
            <path d="M 0 1 L 7 4 L 0 7 Z" />
          </marker>
        </defs>

        <g
          transform={`translate(${viewTransform.x}, ${viewTransform.y}) scale(${viewTransform.scale})`}
        >
          {visibleEdges.map((edge) => {
            const source = nodePositions[edge.source];
            const target = nodePositions[edge.target];

            if (!source || !target) {
              return null;
            }

            return (
              <g
                key={edge.id}
                role="button"
                tabIndex={0}
                className={[
                  "atlas-network-edge",
                  edge.status === "inferred" ? "is-inferred" : "",
                  activeEdgeId === edge.id ? "is-active" : "",
                  focusedNodeId && !focusedEdgeIds.has(edge.id) ? "is-muted" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={(event) => {
                  event.stopPropagation();
                  onEdgeClick(edge.id);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onEdgeClick(edge.id);
                  }
                }}
              >
                <path
                  d={getEdgePath(source, target, edge.id)}
                  markerEnd="url(#atlas-network-arrow)"
                />
                <text x={(source.x + target.x) / 2} y={(source.y + target.y) / 2 - 6}>
                  {`${edge.labelZh} ${edge.labelEn}`}
                </text>
                <title>{`${edge.labelZh} ${edge.labelEn} · ${edge.status}`}</title>
              </g>
            );
          })}

          {graph.nodes.map((node) => {
            const position = nodePositions[node.id];
            const resource = resourceById.get(node.id);
            const label = resource?.titleZh || resource?.titleEn || node.label;
            const shortLabel =
              label.length > 18 ? `${label.slice(0, 17)}…` : label;
            const isFocused = focusedNodeId === node.id;
            const isNeighbor = focusedEdgeIds.size > 0 && graph.edges.some(
              (edge) =>
                focusedEdgeIds.has(edge.id) &&
                (edge.source === node.id || edge.target === node.id),
            );
            const isMuted = Boolean(focusedNodeId) && !isFocused && !isNeighbor;

            if (!position) {
              return null;
            }

            return (
              <g
                key={node.id}
                className={[
                  "atlas-network-node",
                  node.kind === "institution" ? "is-institution" : "",
                  isFocused ? "is-focused" : "",
                  isMuted ? "is-muted" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                transform={`translate(${position.x}, ${position.y})`}
                role="button"
                tabIndex={0}
                onPointerDown={(event) => {
                  event.stopPropagation();
                  handlePointerDown(event, node.id);
                }}
                onClick={(event) => {
                  event.stopPropagation();
                  onNodeClick(node.id);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onNodeClick(node.id);
                  }
                }}
              >
                <rect
                  x={node.kind === "institution" ? -44 : -58}
                  y={-17}
                  width={node.kind === "institution" ? 88 : 116}
                  height={34}
                  rx={node.kind === "institution" ? 1 : 2}
                />
                <text y={node.kind === "institution" ? -3 : 0}>
                  {shortLabel}
                </text>
                {node.kind === "institution" ? (
                  <text className="atlas-network-node__meta" y={10}>
                    INSTITUTION
                  </text>
                ) : (
                  <text className="atlas-network-node__meta" y={11}>
                    {getNodeYear(resourceById, node.id)}
                  </text>
                )}
                <title>
                  {getNodeLabel(node, resourceById, institutionById)}
                </title>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
