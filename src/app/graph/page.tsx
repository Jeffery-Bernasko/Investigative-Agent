"use client";

import { useCallback, useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Node,
  Edge,
  MarkerType,
  Panel,
  Handle,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Network,
  ZoomIn,
  ZoomOut,
  Maximize,
  Download,
  Filter,
  Search,
  RefreshCw,
  Users,
  Building2,
  Globe,
  Server,
  Mail,
  Phone,
  Plus,
} from "lucide-react";
import { DashboardShell } from "@/components/layout";
import { cn } from "@/lib/utils";

// Type for node data
interface EntityNodeData {
  label: string;
  type: string;
  description?: string;
  threatScore?: number;
}

// Custom Node Component
function EntityNode({ data, selected }: { data: any; selected?: boolean }) {
  const icons = {
    person: Users,
    organization: Building2,
    domain: Globe,
    ip: Server,
    email: Mail,
    phone: Phone,
  };
  
  const colors = {
    person: { 
      bg: "bg-electric/20", 
      border: selected ? "border-electric" : "border-electric/50", 
      text: "text-electric",
      glow: "shadow-glow-electric"
    },
    organization: { 
      bg: "bg-matrix/20", 
      border: selected ? "border-matrix" : "border-matrix/50", 
      text: "text-matrix",
      glow: "shadow-glow"
    },
    domain: { 
      bg: "bg-purple-500/20", 
      border: selected ? "border-purple-500" : "border-purple-500/50", 
      text: "text-purple-400",
      glow: "shadow-[0_0_20px_rgba(168,85,247,0.3)]"
    },
    ip: { 
      bg: "bg-orange-500/20", 
      border: selected ? "border-orange-500" : "border-orange-500/50", 
      text: "text-orange-400",
      glow: "shadow-[0_0_20px_rgba(255,149,0,0.3)]"
    },
    email: { 
      bg: "bg-pink-500/20", 
      border: selected ? "border-pink-500" : "border-pink-500/50", 
      text: "text-pink-400",
      glow: "shadow-[0_0_20px_rgba(236,72,153,0.3)]"
    },
    phone: { 
      bg: "bg-yellow-500/20", 
      border: selected ? "border-yellow-500" : "border-yellow-500/50", 
      text: "text-yellow-400",
      glow: "shadow-[0_0_20px_rgba(234,179,8,0.3)]"
    },
  };

  const Icon = icons[data.type as keyof typeof icons] || Users;
  const color = colors[data.type as keyof typeof colors] || colors.person;

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn(
        "px-4 py-3 rounded-xl border-2 backdrop-blur-md transition-all",
        color.bg,
        color.border,
        selected && color.glow
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-matrix !border-2 !border-obsidian"
      />
      
      <div className="flex items-center gap-3">
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", color.bg)}>
          <Icon className={cn("w-5 h-5", color.text)} />
        </div>
        <div>
          <p className="text-sm font-medium text-white">{data.label}</p>
          <p className="text-xs text-text-muted capitalize">{data.type}</p>
        </div>
      </div>
      
      {data.threatScore !== undefined && (
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 h-2 bg-void rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                data.threatScore >= 75 && "bg-critical",
                data.threatScore >= 50 && data.threatScore < 75 && "bg-warning",
                data.threatScore >= 25 && data.threatScore < 50 && "bg-yellow-400",
                data.threatScore < 25 && "bg-safe"
              )}
              style={{ width: `${data.threatScore}%` }}
            />
          </div>
          <span className="text-xs text-text-muted font-mono w-6">{data.threatScore}</span>
        </div>
      )}
      
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-matrix !border-2 !border-obsidian"
      />
    </motion.div>
  );
}

const nodeTypes = {
  entityNode: EntityNode,
};

// Demo data - more comprehensive
const initialNodes: Node[] = [
  {
    id: "1",
    type: "entityNode",
    position: { x: 100, y: 200 },
    data: { label: "John Doe", type: "person", threatScore: 15 },
  },
  {
    id: "2",
    type: "entityNode",
    position: { x: 400, y: 100 },
    data: { label: "TechCorp Industries", type: "organization", threatScore: 25 },
  },
  {
    id: "3",
    type: "entityNode",
    position: { x: 400, y: 300 },
    data: { label: "Jane Smith", type: "person", threatScore: 10 },
  },
  {
    id: "4",
    type: "entityNode",
    position: { x: 700, y: 50 },
    data: { label: "techcorp.io", type: "domain", threatScore: 5 },
  },
  {
    id: "5",
    type: "entityNode",
    position: { x: 700, y: 200 },
    data: { label: "192.168.1.100", type: "ip", threatScore: 45 },
  },
  {
    id: "6",
    type: "entityNode",
    position: { x: 700, y: 350 },
    data: { label: "john@techcorp.io", type: "email", threatScore: 8 },
  },
  {
    id: "7",
    type: "entityNode",
    position: { x: 1000, y: 150 },
    data: { label: "Suspicious Actor", type: "person", threatScore: 85 },
  },
  {
    id: "8",
    type: "entityNode",
    position: { x: 1000, y: 300 },
    data: { label: "malicious.com", type: "domain", threatScore: 92 },
  },
];

const initialEdges: Edge[] = [
  {
    id: "e1-2",
    source: "1",
    target: "2",
    animated: true,
    style: { stroke: "rgba(0, 255, 65, 0.6)", strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#00ff41" },
    label: "works_at",
    labelStyle: { fill: "#fff", fontSize: 11, fontWeight: 500 },
    labelBgStyle: { fill: "#1a1a1a", fillOpacity: 0.9 },
    labelBgPadding: [8, 4] as [number, number],
    labelBgBorderRadius: 4,
  },
  {
    id: "e3-2",
    source: "3",
    target: "2",
    animated: true,
    style: { stroke: "rgba(0, 255, 65, 0.6)", strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#00ff41" },
    label: "works_at",
    labelStyle: { fill: "#fff", fontSize: 11, fontWeight: 500 },
    labelBgStyle: { fill: "#1a1a1a", fillOpacity: 0.9 },
    labelBgPadding: [8, 4] as [number, number],
    labelBgBorderRadius: 4,
  },
  {
    id: "e2-4",
    source: "2",
    target: "4",
    style: { stroke: "rgba(0, 212, 255, 0.6)", strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#00d4ff" },
    label: "owns",
    labelStyle: { fill: "#fff", fontSize: 11, fontWeight: 500 },
    labelBgStyle: { fill: "#1a1a1a", fillOpacity: 0.9 },
    labelBgPadding: [8, 4] as [number, number],
    labelBgBorderRadius: 4,
  },
  {
    id: "e4-5",
    source: "4",
    target: "5",
    style: { stroke: "rgba(168, 85, 247, 0.6)", strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#a855f7" },
    label: "resolves_to",
    labelStyle: { fill: "#fff", fontSize: 11, fontWeight: 500 },
    labelBgStyle: { fill: "#1a1a1a", fillOpacity: 0.9 },
    labelBgPadding: [8, 4] as [number, number],
    labelBgBorderRadius: 4,
  },
  {
    id: "e1-6",
    source: "1",
    target: "6",
    style: { stroke: "rgba(236, 72, 153, 0.6)", strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#ec4899" },
    label: "uses",
    labelStyle: { fill: "#fff", fontSize: 11, fontWeight: 500 },
    labelBgStyle: { fill: "#1a1a1a", fillOpacity: 0.9 },
    labelBgPadding: [8, 4] as [number, number],
    labelBgBorderRadius: 4,
  },
  {
    id: "e5-7",
    source: "5",
    target: "7",
    style: { stroke: "rgba(255, 59, 59, 0.6)", strokeWidth: 2, strokeDasharray: "5,5" },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#ff3b3b" },
    label: "accessed_by",
    labelStyle: { fill: "#ff3b3b", fontSize: 11, fontWeight: 500 },
    labelBgStyle: { fill: "#1a1a1a", fillOpacity: 0.9 },
    labelBgPadding: [8, 4] as [number, number],
    labelBgBorderRadius: 4,
  },
  {
    id: "e7-8",
    source: "7",
    target: "8",
    animated: true,
    style: { stroke: "rgba(255, 59, 59, 0.6)", strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#ff3b3b" },
    label: "operates",
    labelStyle: { fill: "#ff3b3b", fontSize: 11, fontWeight: 500 },
    labelBgStyle: { fill: "#1a1a1a", fillOpacity: 0.9 },
    labelBgPadding: [8, 4] as [number, number],
    labelBgBorderRadius: 4,
  },
  {
    id: "e1-3",
    source: "1",
    target: "3",
    style: { stroke: "rgba(255, 255, 255, 0.3)", strokeWidth: 1, strokeDasharray: "5,5" },
    label: "connected",
    labelStyle: { fill: "#888", fontSize: 11 },
    labelBgStyle: { fill: "#1a1a1a", fillOpacity: 0.9 },
    labelBgPadding: [8, 4] as [number, number],
    labelBgBorderRadius: 4,
  },
];

const entityTypes = [
  { type: "person", icon: Users, label: "Person", color: "text-electric" },
  { type: "organization", icon: Building2, label: "Organization", color: "text-matrix" },
  { type: "domain", icon: Globe, label: "Domain", color: "text-purple-400" },
  { type: "ip", icon: Server, label: "IP Address", color: "text-orange-400" },
  { type: "email", icon: Mail, label: "Email", color: "text-pink-400" },
  { type: "phone", icon: Phone, label: "Phone", color: "text-yellow-400" },
];

export default function GraphPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const filteredNodes = useMemo(() => {
    return nodes.filter((node) => {
      const nodeData = node.data as { label: string; type: string; threatScore?: number };
      const matchesSearch = nodeData.label
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesType =
        selectedTypes.length === 0 || selectedTypes.includes(nodeData.type);
      return matchesSearch && matchesType;
    });
  }, [nodes, searchQuery, selectedTypes]);

  const filteredEdges = useMemo(() => {
    const filteredNodeIds = new Set(filteredNodes.map((n) => n.id));
    return edges.filter(
      (edge) =>
        filteredNodeIds.has(edge.source) && filteredNodeIds.has(edge.target)
    );
  }, [edges, filteredNodes]);

  const toggleTypeFilter = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type)
        ? prev.filter((t) => t !== type)
        : [...prev, type]
    );
  };

  return (
    <DashboardShell>
      <div className="h-[calc(100vh-64px)] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-glass-border bg-obsidian/50 backdrop-blur-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-matrix/10 flex items-center justify-center">
                <Network className="w-5 h-5 text-matrix" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-white">
                  Relationship Graph
                </h1>
                <p className="text-sm text-text-muted">
                  {filteredNodes.length} entities • {filteredEdges.length} connections
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="text"
                  placeholder="Search entities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 w-64 rounded-lg bg-void border border-glass-border text-sm text-white placeholder:text-text-muted focus:outline-none focus:border-matrix/50"
                />
              </div>

              <button className="btn-secondary flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>

              <button className="btn-primary flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add Entity
              </button>
            </div>
          </div>

          {/* Type Filters */}
          <div className="flex items-center gap-2 mt-4">
            <span className="text-sm text-text-muted mr-2">Filter:</span>
            {entityTypes.map((type) => (
              <button
                key={type.type}
                onClick={() => toggleTypeFilter(type.type)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all",
                  selectedTypes.includes(type.type)
                    ? "bg-matrix/20 text-matrix border border-matrix/30"
                    : "bg-glass-bg text-text-secondary border border-glass-border hover:border-glass-border-hover"
                )}
              >
                <type.icon className={cn("w-4 h-4", type.color)} />
                {type.label}
              </button>
            ))}
            {selectedTypes.length > 0 && (
              <button
                onClick={() => setSelectedTypes([])}
                className="text-xs text-text-muted hover:text-white ml-2"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Graph Canvas */}
        <div className="flex-1 bg-void">
          <ReactFlow
            nodes={filteredNodes}
            edges={filteredEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
            proOptions={{ hideAttribution: true }}
            minZoom={0.2}
            maxZoom={2}
            defaultEdgeOptions={{
              style: { stroke: "rgba(0, 255, 65, 0.5)", strokeWidth: 2 },
              markerEnd: { type: MarkerType.ArrowClosed, color: "#00ff41" },
            }}
          >
            <Background
              color="rgba(0, 255, 65, 0.03)"
              gap={30}
              size={1}
            />
            <Controls
              className="!bg-graphite !border-glass-border !rounded-xl !shadow-glass"
              showInteractive={false}
            />
            <MiniMap
              className="!bg-graphite !border-glass-border !rounded-xl"
              nodeColor={(node) => {
                const colors: Record<string, string> = {
                  person: "#00d4ff",
                  organization: "#00ff41",
                  domain: "#a855f7",
                  ip: "#ff9500",
                  email: "#ec4899",
                  phone: "#eab308",
                };
                const nodeData = node.data as { type?: string };
                return colors[nodeData.type || ""] || "#888";
              }}
              maskColor="rgba(0, 0, 0, 0.8)"
            />

            {/* Legend Panel */}
            <Panel position="bottom-left" className="!m-4">
              <div className="glass-panel rounded-xl p-4">
                <h4 className="text-sm font-medium text-white mb-3">Legend</h4>
                <div className="grid grid-cols-2 gap-2">
                  {entityTypes.map((type) => (
                    <div key={type.type} className="flex items-center gap-2">
                      <type.icon className={cn("w-4 h-4", type.color)} />
                      <span className="text-xs text-text-secondary">
                        {type.label}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-glass-border">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-0.5 bg-matrix" />
                    <span className="text-xs text-text-secondary">Normal</span>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-0.5 bg-critical" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #ff3b3b 0, #ff3b3b 4px, transparent 4px, transparent 8px)' }} />
                    <span className="text-xs text-text-secondary">Suspicious</span>
                  </div>
                </div>
              </div>
            </Panel>

            {/* Stats Panel */}
            <Panel position="top-right" className="!m-4">
              <div className="glass-panel rounded-xl p-4 w-48">
                <h4 className="text-sm font-medium text-white mb-3">Statistics</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-muted">Total Nodes</span>
                    <span className="text-sm font-mono text-white">{nodes.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-muted">Total Edges</span>
                    <span className="text-sm font-mono text-white">{edges.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-muted">High Risk</span>
                    <span className="text-sm font-mono text-critical">
                      {nodes.filter((n) => ((n.data as unknown as EntityNodeData).threatScore || 0) >= 75).length}
                    </span>
                  </div>
                </div>
              </div>
            </Panel>
          </ReactFlow>
        </div>
      </div>
    </DashboardShell>
  );
}

