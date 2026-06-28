"""Convert between AgentFlow and n8n workflow formats with lossless n8n node support."""

from __future__ import annotations

import uuid
from copy import deepcopy
from typing import Any

from app.services.n8n_node_registry import (
    build_node_snapshot,
    extract_workflow_extras,
    get_node_metadata,
    normalize_n8n_type,
)

# Native AgentFlow types with first-class editor + local execution support.
N8N_TO_AGENTFLOW: dict[str, str] = {
    "n8n-nodes-base.manualTrigger": "trigger",
    "n8n-nodes-base.start": "trigger",
    "n8n-nodes-base.webhook": "webhook",
    "n8n-nodes-base.if": "condition",
    "n8n-nodes-base.gmail": "gmail",
    "n8n-nodes-base.googleSheets": "google_sheets",
    "@n8n/n8n-nodes-langchain.agent": "ai",
    "n8n-nodes-base.openAi": "ai",
    "@n8n/n8n-nodes-langchain.lmChatOpenAi": "ai",
    "n8n-nodes-base.httpRequest": "webhook",
    "n8n-nodes-base.noOp": "end",
}

AGENTFLOW_TO_N8N: dict[str, str] = {
    "trigger": "n8n-nodes-base.manualTrigger",
    "webhook": "n8n-nodes-base.webhook",
    "condition": "n8n-nodes-base.if",
    "gmail": "n8n-nodes-base.gmail",
    "google_sheets": "n8n-nodes-base.googleSheets",
    "ai": "@n8n/n8n-nodes-langchain.agent",
    "crm": "n8n-nodes-base.httpRequest",
    "n8n": "n8n-nodes-base.httpRequest",
    "end": "n8n-nodes-base.noOp",
    "n8n_native": "n8n-nodes-base.noOp",  # overridden by snapshot on export
    "unsupported": "n8n-nodes-base.noOp",  # legacy — overridden by snapshot
}


def _n8n_position(pos: list[float] | tuple[float, float] | None) -> dict[str, float]:
    if not pos or len(pos) < 2:
        return {"x": 250.0, "y": 100.0}
    return {"x": float(pos[0]), "y": float(pos[1])}


def _agentflow_config(node_type: str, n8n_node: dict[str, Any]) -> dict[str, Any]:
    params = n8n_node.get("parameters") or {}
    name = n8n_node.get("name", "")

    if node_type == "webhook":
        path = params.get("path", "")
        return {"direction": "inbound", "path": path, "label": name}
    if node_type == "ai":
        return {
            "template": "lead_qualification",
            "provider": "openai",
            "outputMode": "json",
            "temperature": 0.7,
            "userPrompt": str(params.get("text") or params.get("prompt") or "{{input}}"),
        }
    if node_type == "condition":
        conditions = params.get("conditions", {})
        return {
            "field": "condition_result",
            "operator": "equals",
            "value": "true",
            "n8nConditions": conditions,
        }
    if node_type == "gmail":
        return {
            "action": "send",
            "to": params.get("sendTo") or "{{email}}",
            "subject": params.get("subject") or "Follow up",
            "body": params.get("message") or "{{last_ai_output}}",
        }
    if node_type == "google_sheets":
        return {
            "action": "append",
            "spreadsheetId": params.get("documentId", {}).get("value", ""),
            "range": params.get("sheetName", "Sheet1") + "!A1",
        }
    return {"n8nType": n8n_node.get("type"), "n8nParameters": params}


def _build_n8n_native_config(n8n_node: dict[str, Any]) -> dict[str, Any]:
    n8n_type = normalize_n8n_type(str(n8n_node.get("type", "")))
    meta = get_node_metadata(n8n_type)
    snapshot = build_node_snapshot(n8n_node)
    return {
        "n8nSnapshot": snapshot,
        "n8nType": n8n_type,
        "n8nParameters": snapshot.get("parameters") or {},
        "n8nName": n8n_node.get("name", ""),
        "originalType": n8n_type,
        "displayName": meta["display_name"],
        "category": meta["category"],
        "official": meta["official"],
        "community": not meta["official"],
    }


def _source_handle_for_output(output_idx: int, output_count: int) -> str | None:
    if output_count <= 1:
        return None
    if output_idx == 0:
        return "true"
    if output_idx == 1:
        return "false"
    return str(output_idx)


def import_n8n_workflow(n8n_data: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
    """Return (agentflow_definition, import_stats)."""
    n8n_nodes = n8n_data.get("nodes") or []
    connections = n8n_data.get("connections") or {}

    name_to_id: dict[str, str] = {}
    af_nodes: list[dict[str, Any]] = []
    native_count = 0
    n8n_native_count = 0
    community_count = 0
    community_types: list[str] = []

    for n8n_node in n8n_nodes:
        raw_type = str(n8n_node.get("type", ""))
        n8n_type = normalize_n8n_type(raw_type)
        meta = get_node_metadata(n8n_type)
        snapshot = build_node_snapshot(n8n_node)

        af_type = N8N_TO_AGENTFLOW.get(n8n_type)
        if af_type:
            native_count += 1
            config = _agentflow_config(af_type, n8n_node)
            config["n8nSnapshot"] = snapshot
        else:
            af_type = "n8n_native"
            n8n_native_count += 1
            config = _build_n8n_native_config(n8n_node)
            if not meta["official"]:
                community_count += 1
                community_types.append(n8n_type)

        node_id = n8n_node.get("id") or str(uuid.uuid4())
        node_name = n8n_node.get("name") or config.get("displayName") or af_type
        name_to_id[node_name] = node_id
        position = _n8n_position(n8n_node.get("position"))

        af_nodes.append({
            "id": node_id,
            "type": af_type,
            "position": position,
            "data": {
                "label": node_name,
                "config": config,
                "n8nType": n8n_type,
                "n8nNodeName": node_name,
                "typeVersion": n8n_node.get("typeVersion"),
                "originalPosition": position,
                "imported": True,
                "category": meta["category"],
                "displayName": meta["display_name"],
            },
        })

    edges: list[dict[str, Any]] = []
    edge_idx = 0
    for source_name, outputs in connections.items():
        source_id = name_to_id.get(source_name)
        if not source_id or not isinstance(outputs, dict):
            continue
        main_outputs = outputs.get("main") or []
        if not isinstance(main_outputs, list):
            continue
        for output_idx, output_list in enumerate(main_outputs):
            if not isinstance(output_list, list):
                continue
            source_handle = _source_handle_for_output(output_idx, len(main_outputs))
            for conn in output_list:
                if not isinstance(conn, dict):
                    continue
                target_name = conn.get("node")
                target_id = name_to_id.get(target_name) if target_name else None
                if target_id:
                    edge: dict[str, Any] = {
                        "id": f"edge-{edge_idx}",
                        "source": source_id,
                        "target": target_id,
                    }
                    if source_handle:
                        edge["sourceHandle"] = source_handle
                    edges.append(edge)
                    edge_idx += 1

    if not af_nodes:
        af_nodes.append({
            "id": "trigger-1",
            "type": "trigger",
            "position": {"x": 250, "y": 80},
            "data": {"label": "Trigger"},
        })

    definition: dict[str, Any] = {
        "nodes": af_nodes,
        "edges": edges,
        "viewport": {"x": 0, "y": 0, "zoom": 1},
        "n8nWorkflow": extract_workflow_extras(n8n_data),
    }

    unique_community = sorted(set(community_types))
    stats = {
        "nodes_imported": len(af_nodes),
        "connections_imported": len(edges),
        "native_count": native_count,
        "n8n_native_count": n8n_native_count,
        "community_count": community_count,
        "community_types": unique_community,
        # Backward-compatible fields — no unsupported placeholders for official nodes.
        "unmapped_node_types": unique_community,
        "unmapped_count": len(unique_community),
        "unsupported_count": 0,
        "unsupported_types": [],
        "needs_layout": True,
    }
    return definition, stats


def extract_webhook_url(n8n_data: dict[str, Any], base_url: str) -> str | None:
    base = base_url.rstrip("/")
    for node in n8n_data.get("nodes") or []:
        if node.get("type") != "n8n-nodes-base.webhook":
            continue
        params = node.get("parameters") or {}
        path = (params.get("path") or "").strip()
        # Modern n8n assigns a webhookId (UUID) that becomes the production URL
        # segment: {base}/webhook/{webhookId}. The path parameter is often empty.
        webhook_id = (node.get("webhookId") or "").strip()
        if path:
            return f"{base}/webhook/{path.lstrip('/')}"
        if webhook_id:
            return f"{base}/webhook/{webhook_id}"
    return None


def _restore_n8n_node_from_af(af_node: dict[str, Any]) -> dict[str, Any]:
    af_type = af_node.get("type", "end")
    config = af_node.get("data", {}).get("config") or {}
    label = af_node.get("data", {}).get("label") or af_type
    pos = af_node.get("position") or {"x": 250, "y": 100}

    snapshot = config.get("n8nSnapshot")
    if isinstance(snapshot, dict) and snapshot.get("type"):
        restored = deepcopy(snapshot)
        restored["id"] = af_node.get("id") or restored.get("id") or str(uuid.uuid4())
        restored["name"] = label
        restored["position"] = [float(pos.get("x", 250)), float(pos.get("y", 100))]
        if isinstance(config.get("n8nParameters"), dict):
            restored["parameters"] = deepcopy(config["n8nParameters"])
        return restored

    # Legacy unsupported nodes without full snapshot.
    if af_type in ("n8n_native", "unsupported"):
        n8n_type = config.get("originalType") or config.get("n8nType") or "n8n-nodes-base.noOp"
        return {
            "id": af_node.get("id") or str(uuid.uuid4()),
            "name": label,
            "type": n8n_type,
            "typeVersion": af_node.get("data", {}).get("typeVersion") or 1,
            "position": [float(pos.get("x", 250)), float(pos.get("y", 100))],
            "parameters": deepcopy(config.get("n8nParameters") or {}),
        }

    n8n_type = AGENTFLOW_TO_N8N.get(af_type, "n8n-nodes-base.noOp")
    parameters: dict[str, Any] = {}
    if af_type == "webhook":
        parameters = {
            "path": config.get("path", f"agentflow-{af_node.get('id', '')[:8]}"),
            "httpMethod": "POST",
        }
    elif af_type == "ai":
        parameters = {"text": config.get("userPrompt") or "{{ $json.input }}"}
    elif af_type == "gmail":
        parameters = {
            "sendTo": config.get("to", ""),
            "subject": config.get("subject", ""),
            "message": config.get("body", ""),
        }
    elif af_type == "google_sheets":
        parameters = {
            "operation": "append",
            "documentId": {"value": config.get("spreadsheetId", "")},
            "sheetName": str(config.get("range", "Sheet1")).split("!")[0],
        }
    elif af_type == "crm":
        parameters = {
            "method": "POST",
            "url": "={{$env.AGENTFLOW_API_URL}}/api/v1/crm/actions",
            "sendBody": True,
            "specifyBody": "json",
            "jsonBody": str(config.get("fields", {})),
        }
    elif af_type == "n8n":
        parameters = {
            "method": "POST",
            "url": config.get("webhookUrl") or config.get("url", ""),
        }

    return {
        "id": af_node.get("id") or str(uuid.uuid4()),
        "name": label,
        "type": n8n_type,
        "typeVersion": af_node.get("data", {}).get("typeVersion") or 1,
        "position": [float(pos.get("x", 250)), float(pos.get("y", 100))],
        "parameters": parameters,
    }


def export_to_n8n(
    name: str,
    definition: dict[str, Any],
    *,
    existing_n8n_id: str | None = None,
) -> dict[str, Any]:
    """Convert AgentFlow definition to valid n8n workflow JSON (lossless when snapshots exist)."""
    af_nodes = definition.get("nodes") or []
    af_edges = definition.get("edges") or []
    workflow_extras = definition.get("n8nWorkflow") or {}

    id_to_name: dict[str, str] = {}
    n8n_nodes: list[dict[str, Any]] = []

    for af_node in af_nodes:
        restored = _restore_n8n_node_from_af(af_node)
        node_id = restored["id"]
        id_to_name[node_id] = restored["name"]
        n8n_nodes.append(restored)

    connections: dict[str, Any] = {}
    for edge in af_edges:
        source_id = edge.get("source")
        target_id = edge.get("target")
        source_name = id_to_name.get(source_id)
        target_name = id_to_name.get(target_id)
        if not source_name or not target_name:
            continue
        if source_name not in connections:
            connections[source_name] = {"main": []}

        source_handle = edge.get("sourceHandle")
        output_idx = 0
        if source_handle == "false":
            output_idx = 1
        elif source_handle and str(source_handle).isdigit():
            output_idx = int(source_handle)

        main = connections[source_name]["main"]
        while len(main) <= output_idx:
            main.append([])
        main[output_idx].append({
            "node": target_name,
            "type": "main",
            "index": 0,
        })

    payload: dict[str, Any] = {
        "name": name,
        "nodes": n8n_nodes,
        "connections": connections,
        "active": False,
        "settings": workflow_extras.get("settings") or {"executionOrder": "v1"},
    }
    for key in ("pinnedData", "meta", "staticData", "tags", "versionId", "hash"):
        if key in workflow_extras:
            payload[key] = workflow_extras[key]
    if existing_n8n_id:
        payload["id"] = existing_n8n_id
    return payload


def build_n8n_metadata(
    *,
    source: str,
    n8n_workflow_id: str | None = None,
    n8n_instance_id: str | None = None,
    n8n_webhook_url: str | None = None,
    remote_name: str | None = None,
    imported_at: str | None = None,
    exported_at: str | None = None,
) -> dict[str, Any]:
    meta: dict[str, Any] = {"source": source}
    if n8n_workflow_id:
        meta["n8n_workflow_id"] = n8n_workflow_id
    if n8n_instance_id:
        meta["n8n_instance_id"] = n8n_instance_id
    if n8n_webhook_url:
        meta["n8n_webhook_url"] = n8n_webhook_url
    if remote_name:
        meta["remote_name"] = remote_name
    if imported_at:
        meta["imported_at"] = imported_at
    if exported_at:
        meta["exported_at"] = exported_at
    return meta
