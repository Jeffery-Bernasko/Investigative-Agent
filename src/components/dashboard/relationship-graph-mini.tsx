"use client";

import { useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  MarkerType,
  Handle,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Network, Maximize2, Users, Building2, Globe, Server } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

// Custom Node Component
function EntityNode({ data }: { data: any }) {
  const icons = {
    person: Users,
    organization: Building2,
    domain: Globe,
    ip: Server,
  };
  const colors = {
    person: { bg: "bg-electric/20", border: "border-electric/50", text: "text-electric" },
    organization: { bg: "bg-matrix/20", border: "border-matrix/50", text: "text-matrix" },
    domain: { bg: "bg-purple-500/20", border: "border-purple-500/50", text: "text-purple-400" },
    ip: { bg: "bg-orange-500/20", border: "border-orange-500/50", text: "text-orange-400" },
  };

  const Icon = icons[data.type as keyof typeof icons] || Users;
  const color = colors[data.type as keyof typeof colors] || colors.person;

  return (
    <div
      className={cn(
        "px-3 py-2 rounded-lg border backdrop-blur-sm",
        color.bg,
        color.border
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2 !h-2 !bg-matrix !border-0"
      />
      <div className="flex items-center gap-2">
        <Icon className={cn("w-4 h-4", color.text)} />
        <span className="text-xs font-medium text-white whitespace-nowrap">
          {data.label}
        </span>
      </div>
      {data.threatScore !== undefined && (
        <div className="mt-1 flex items-center gap-1">
          <div className="flex-1 h-1 bg-void/50 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full",
                data.threatScore >= 75 && "bg-critical",
                data.threatScore >= 50 && data.threatScore < 75 && "bg-warning",
                data.threatScore < 50 && "bg-safe"
              )}
              style={{ width: `${data.threatScore}%` }}
            />
          </div>
          <span className="text-2xs text-text-muted font-mono">
            {data.threatScore}
          </span>
        </div>
      )}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2 !h-2 !bg-matrix !border-0"
      />
    </div>
  );
}

const nodeTypes = {
  entityNode: EntityNode,
};

// No demo data - start fresh
const initialNodes: Node[] = [];

const initialEdges: Edge[] = [];

export function RelationshipGraphMini() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.6 }}
      className="glass-panel rounded-2xl overflow-hidden h-full"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-glass-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-matrix/10 flex items-center justify-center">
            <Network className="w-5 h-5 text-matrix" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">
              Relationship Graph
            </h3>
            <p className="text-xs text-text-muted">
              Entity connections overview
            </p>
          </div>
        </div>
        <Link
          href="/graph"
          className="flex items-center gap-1 text-xs text-matrix hover:underline font-medium"
        >
          <Maximize2 className="w-3 h-3" />
          Expand
        </Link>
      </div>

      {/* Graph */}
      <div className="h-[300px] bg-void/50">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          proOptions={{ hideAttribution: true }}
          minZoom={0.5}
          maxZoom={1.5}
        >
          <Background color="rgba(0, 255, 65, 0.03)" gap={20} />
        </ReactFlow>
      </div>

      {/* Stats Footer */}
      <div className="px-5 py-3 border-t border-glass-border bg-void/50 flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          <span className="text-text-muted">
            <span className="font-mono text-white">5</span> nodes
          </span>
          <span className="text-text-muted">
            <span className="font-mono text-white">5</span> edges
          </span>
        </div>
        <span className="flex items-center gap-1 text-text-muted">
          <span className="status-dot status-dot-active" />
          Interactive
        </span>
      </div>
    </motion.div>
  );
}

