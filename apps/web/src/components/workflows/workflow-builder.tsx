"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { AiNodePanel } from "@/components/workflows/ai-node-panel";
import { CrmNodePanel, type CrmNodeConfig } from "@/components/workflows/crm-node-panel";
import { IntegrationNodePanel } from "@/components/workflows/integration-node-panel";
import { N8nNativeNodePanel } from "@/components/workflows/n8n-native-node-panel";
import { N8nNodePanel } from "@/components/workflows/n8n-node-panel";
import {
  createNodeId,
  getDefaultNodeLabel,
  NODE_META,
} from "@/components/workflows/node-config";
import { NodePalette } from "@/components/workflows/node-palette";
import { workflowNodeTypes } from "@/components/workflows/workflow-node";
import { workflowEdgeTypes } from "@/components/workflows/workflow-edge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { executeWorkflow } from "@/lib/agent";
import { layoutWorkflow, needsAutoLayout } from "@/lib/workflow-layout";
import { toastError, toastSuccess } from "@/lib/toast";
import { updateWorkflow } from "@/lib/workflows";
import type { AiNodeConfig } from "@/types/agent";
import type { N8nNodeConfig } from "@/types/n8n";
import type { Workflow, WorkflowDefinition, WorkflowNodeType } from "@/types/workflow";
import { Loader2, Play, Save, Trash2, LayoutGrid } from "lucide-react";

interface WorkflowBuilderProps {
  workflow: Workflow;
  token: string;
  onSaved: (workflow: Workflow) => void;
  onDelete: () => void;
}

function WorkflowBuilderCanvas({
  workflow,
  token,
  onSaved,
  onDelete,
}: WorkflowBuilderProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition, fitView } = useReactFlow();

  const [name, setName] = useState(workflow.name);
  const [isSaving, setIsSaving] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [runMessage, setRunMessage] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isLayouting, setIsLayouting] = useState(false);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(
    workflow.definition.nodes as Node[],
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(
    workflow.definition.edges as Edge[],
  );

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null;

  const runAutoLayout = useCallback(() => {
    setIsLayouting(true);
    // Defer one tick so loading state can paint before the blocking layout.
    requestAnimationFrame(() => {
      setTimeout(() => {
        setNodes((currentNodes) => {
          const { nodes: laidOut, edges: styled } = layoutWorkflow(
            currentNodes,
            edges,
            { direction: "LR" },
          );
          setEdges(styled);
          return laidOut;
        });
        setIsLayouting(false);
        // Fit and center after positions settle.
        setTimeout(() => {
          fitView({ padding: 0.2, duration: 400 });
        }, 60);
      }, 30);
    });
  }, [edges, setNodes, setEdges, fitView]);

  // Apply auto-layout once for freshly imported n8n workflows (most nodes still
  // at the converter's default fallback position) or any workflow whose nodes
  // are clearly un-laid-out.
  useEffect(() => {
    const isImportedFromN8n = workflow.n8n_metadata?.source === "n8n";
    if (
      (isImportedFromN8n || needsAutoLayout(workflow.definition.nodes as Node[])) &&
      workflow.definition.nodes.length > 1
    ) {
      runAutoLayout();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflow.id]);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) =>
        addEdge(
          { ...connection, type: "workflow", animated: true },
          eds,
        ),
      );
    },
    [setEdges],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const nodeType = event.dataTransfer.getData("application/reactflow") as WorkflowNodeType;
      if (!nodeType || !NODE_META[nodeType]) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const data: Node["data"] = { label: getDefaultNodeLabel(nodeType) };
      if (nodeType === "ai") {
        data.config = {
          template: "lead_qualification",
          provider: "openai",
          outputMode: "json",
          temperature: 0.7,
        } satisfies AiNodeConfig;
      } else if (nodeType === "crm") {
        data.config = {
          entity: "lead",
          action: "create",
          fields: {
            title: "{{name}}",
            email: "{{email}}",
            score: "{{score}}",
            status: "qualified",
            notes_summary: "{{next_action}}",
          },
        } satisfies CrmNodeConfig;
      } else if (nodeType === "n8n") {
        data.config = {
          payload: { input: "{{last_ai_output}}" },
        } satisfies N8nNodeConfig;
      } else if (nodeType === "gmail") {
        data.config = { action: "send", to: "{{email}}", subject: "Follow up", body: "{{last_ai_output}}" };
      } else if (nodeType === "google_sheets") {
        data.config = { action: "append", spreadsheetId: "", range: "Sheet1!A1" };
      } else if (nodeType === "webhook") {
        data.config = { direction: "outbound", method: "POST", url: "" };
      }

      const newNode: Node = {
        id: createNodeId(nodeType),
        type: nodeType,
        position,
        data,
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, setNodes],
  );

  const handleIntegrationNodeUpdate = useCallback(
    (nodeId: string, config: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, config } } : n,
        ),
      );
    },
    [setNodes],
  );

  const handleAiNodeUpdate = useCallback(
    (nodeId: string, config: AiNodeConfig, label?: string) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId
            ? { ...n, data: { ...n.data, config, ...(label ? { label } : {}) } }
            : n,
        ),
      );
    },
    [setNodes],
  );

  const handleCrmNodeUpdate = useCallback(
    (nodeId: string, config: CrmNodeConfig, label?: string) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId
            ? { ...n, data: { ...n.data, config, ...(label ? { label } : {}) } }
            : n,
        ),
      );
    },
    [setNodes],
  );

  const handleN8nNodeUpdate = useCallback(
    (nodeId: string, config: N8nNodeConfig, label?: string) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId
            ? { ...n, data: { ...n.data, config, ...(label ? { label } : {}) } }
            : n,
        ),
      );
    },
    [setNodes],
  );

  const buildDefinition = (): WorkflowDefinition => ({
    nodes: nodes.map((n) => ({
      id: n.id,
      type: n.type as WorkflowNodeType,
      position: n.position,
      data: n.data as WorkflowDefinition["nodes"][0]["data"],
    })),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
    })),
  });

  const handleN8nNativeNodeUpdate = useCallback(
    (nodeId: string, config: Record<string, unknown>, label?: string) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId
            ? { ...n, data: { ...n.data, config, ...(label ? { label } : {}) } }
            : n,
        ),
      );
    },
    [setNodes],
  );

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    try {
      const updated = await updateWorkflow(token, workflow.id, {
        name: name.trim() || "Untitled Workflow",
        definition: buildDefinition(),
      });
      onSaved(updated);
      toastSuccess("Workflow saved");
      setSaveMessage("Saved");
      setTimeout(() => setSaveMessage(null), 2000);
    } catch (err) {
      toastError(err, "Save failed");
      setSaveMessage("Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRun = async () => {
    setIsRunning(true);
    setRunMessage(null);
    try {
      await updateWorkflow(token, workflow.id, {
        name: name.trim() || "Untitled Workflow",
        definition: buildDefinition(),
      });
      const result = await executeWorkflow(token, workflow.id, {});
      const completed = result.steps.filter((s) => s.status === "completed").length;
      const failed = result.steps.filter((s) => s.status === "failed").length;
      const msg = `Ran ${result.total_steps} step(s): ${completed} completed${failed ? `, ${failed} failed` : ""}`;
      if (failed) {
        toastError(new Error(msg), "Workflow finished with errors");
      } else {
        toastSuccess(msg);
      }
      setRunMessage(`${msg} · ${result.workflow_execution.status}`);
      setTimeout(() => setRunMessage(null), 5000);
    } catch (err) {
      toastError(err, "Execution failed");
    } finally {
      setIsRunning(false);
    }
  };

  const handleDelete = () => {
    if (window.confirm("Delete this workflow? This cannot be undone.")) {
      onDelete();
    }
  };

  const selectedType = selectedNode?.type as WorkflowNodeType | undefined;
  const isN8nWrappedNode = selectedType === "n8n_native" || selectedType === "unsupported";

  return (
    <div className="flex h-[calc(100dvh-4rem)] min-h-0 flex-col lg:h-[calc(100vh-4rem)]">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b px-3 py-3 sm:gap-3 sm:px-4">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="min-w-0 flex-1 basis-full font-medium sm:max-w-xs sm:basis-auto"
          placeholder="Workflow name"
        />
        <div className="ml-auto flex items-center gap-2">
          {saveMessage && (
            <span className="text-sm text-muted-foreground">{saveMessage}</span>
          )}
          {runMessage && (
            <span className="text-sm text-muted-foreground">{runMessage}</span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={runAutoLayout}
            disabled={isLayouting || nodes.length === 0}
            title="Auto-arrange nodes with a clean left-to-right layout"
          >
            {isLayouting ? (
              <Loader2 className="mr-1.5 size-4 animate-spin" />
            ) : (
              <LayoutGrid className="mr-1.5 size-4" />
            )}
            Auto layout
          </Button>
          <Button variant="outline" size="sm" onClick={() => void handleRun()} disabled={isRunning}>
            {isRunning ? (
              <Loader2 className="mr-1.5 size-4 animate-spin" />
            ) : (
              <Play className="mr-1.5 size-4" />
            )}
            Run
          </Button>
          <Button variant="outline" size="sm" onClick={handleDelete}>
            <Trash2 className="mr-1.5 size-4" />
            Delete
          </Button>
          <Button size="sm" onClick={() => void handleSave()} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="mr-1.5 size-4 animate-spin" />
            ) : (
              <Save className="mr-1.5 size-4" />
            )}
            Save
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <NodePalette className="max-h-40 shrink-0 overflow-y-auto lg:max-h-none lg:w-56" />

        <div className="relative flex min-h-0 flex-1 flex-col">
          <div ref={reactFlowWrapper} className="relative min-h-0 flex-1">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onNodeClick={(_, node) => setSelectedNodeId(node.id)}
              onPaneClick={() => setSelectedNodeId(null)}
              nodeTypes={workflowNodeTypes}
              edgeTypes={workflowEdgeTypes}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              minZoom={0.2}
              maxZoom={2}
              defaultEdgeOptions={{ type: "workflow", animated: true }}
              deleteKeyCode={["Backspace", "Delete"]}
              className="bg-muted/20"
            >
              <Background gap={16} size={1} />
              <Controls />
              <MiniMap
                nodeStrokeWidth={3}
                className="!bg-card !border !border-border"
              />
            </ReactFlow>
          </div>
        </div>

        {selectedType === "ai" ? (
          <AiNodePanel node={selectedNode} token={token} onUpdate={handleAiNodeUpdate} />
        ) : selectedType === "crm" ? (
          <CrmNodePanel node={selectedNode} onUpdate={handleCrmNodeUpdate} />
        ) : selectedType === "n8n" ? (
          <N8nNodePanel node={selectedNode} onUpdate={handleN8nNodeUpdate} />
        ) : isN8nWrappedNode ? (
          <N8nNativeNodePanel node={selectedNode} onUpdate={handleN8nNativeNodeUpdate} />
        ) : ["gmail", "google_sheets", "webhook"].includes(selectedType ?? "") ? (
          <IntegrationNodePanel node={selectedNode} token={token} onUpdate={handleIntegrationNodeUpdate} />
        ) : (
          <aside className="flex w-64 shrink-0 flex-col border-l bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground">
              Select a node to configure its settings.
            </p>
          </aside>
        )}
      </div>
    </div>
  );
}

export function WorkflowBuilder(props: WorkflowBuilderProps) {
  return (
    <ReactFlowProvider>
      <WorkflowBuilderCanvas {...props} />
    </ReactFlowProvider>
  );
}
