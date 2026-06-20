import type { ThreadItemUpdate } from "../types/server.js";
import { serializeWidget } from "./serialization.js";
import type { WidgetRoot } from "./types.js";

type WidgetNode = Record<string, unknown>;
type WidgetDiffUpdate = Extract<
  ThreadItemUpdate,
  { type: "widget.root.updated" | "widget.streaming_text.value_delta" }
>;

function asNode(value: unknown): WidgetNode {
  return value != null && typeof value === "object" && !Array.isArray(value)
    ? (value as WidgetNode)
    : {};
}

function childrenOf(node: WidgetNode): WidgetNode[] {
  const children = node.children;
  if (Array.isArray(children)) return children.map(asNode);
  if (children != null && typeof children === "object") return [asNode(children)];
  return [];
}

function isStreamingText(node: WidgetNode): boolean {
  return (node.type === "Text" || node.type === "Markdown") && typeof node.value === "string";
}

function jsonEqual(before: unknown, after: unknown): boolean {
  return JSON.stringify(before) === JSON.stringify(after);
}

function isObjectRecord(value: unknown): value is WidgetNode {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function canValidateStreamingTextUpdate(before: WidgetNode, after: WidgetNode): boolean {
  return (
    isStreamingText(before) &&
    isStreamingText(after) &&
    typeof after.id === "string" &&
    (before.id === after.id || before.id === undefined)
  );
}

function valueRequiresFullReplace(before: unknown, after: unknown, isWidgetNode: boolean): boolean {
  if (Array.isArray(before) && Array.isArray(after)) {
    if (before.length !== after.length) return true;
    for (let index = 0; index < before.length; index += 1) {
      if (valueRequiresFullReplace(before[index], after[index], isWidgetNode)) return true;
    }
    return false;
  }

  if (isObjectRecord(before) && isObjectRecord(after)) {
    return requiresFullReplace(before, after, isWidgetNode);
  }

  return !jsonEqual(before, after);
}

function requiresFullReplace(before: WidgetNode, after: WidgetNode, isWidgetNode: boolean): boolean {
  if (before.type !== after.type || before.key !== after.key) {
    return true;
  }

  const canValidateStreamingUpdate = isWidgetNode && canValidateStreamingTextUpdate(before, after);
  if (before.id !== after.id && !canValidateStreamingUpdate) {
    return true;
  }

  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of keys) {
    const beforeValue = before[key];
    const afterValue = after[key];

    if (canValidateStreamingUpdate && (key === "id" || key === "value")) continue;
    if (valueRequiresFullReplace(beforeValue, afterValue, isWidgetNode && key === "children")) {
      return true;
    }
  }

  return false;
}

function streamingTextById(root: WidgetNode): Map<string, WidgetNode> {
  const nodes = new Map<string, WidgetNode>();

  function visit(node: WidgetNode): void {
    if (isStreamingText(node) && typeof node.id === "string") {
      nodes.set(node.id, node);
    }
    for (const child of childrenOf(node)) visit(child);
  }

  visit(root);
  return nodes;
}

function validateStreamingTextUpdates(
  beforeNodes: Map<string, WidgetNode>,
  afterNodes: Map<string, WidgetNode>,
): void {
  for (const [id, afterNode] of afterNodes) {
    const beforeNode = beforeNodes.get(id);
    if (!beforeNode) {
      throw new Error(
        `Node ${id} was not present when the widget was initially rendered. All nodes with ID must persist across all widget updates.`,
      );
    }

    const beforeValue = String(beforeNode.value);
    const afterValue = String(afterNode.value);
    if (!afterValue.startsWith(beforeValue)) {
      throw new Error(
        `Node ${id} was updated with a new value that is not a prefix of the initial value. All widget updates must be cumulative.`,
      );
    }
  }
}

export function diffWidget(before: WidgetRoot, after: WidgetRoot): WidgetDiffUpdate[] {
  const beforeRoot = serializeWidget(before);
  const afterRoot = serializeWidget(after);
  const beforeNodes = streamingTextById(beforeRoot);
  const afterNodes = streamingTextById(afterRoot);

  if (requiresFullReplace(beforeRoot, afterRoot, true)) {
    return [{ type: "widget.root.updated", widget: afterRoot }];
  }

  validateStreamingTextUpdates(beforeNodes, afterNodes);

  const updates: WidgetDiffUpdate[] = [];
  for (const [id, afterNode] of afterNodes) {
    const beforeNode = beforeNodes.get(id);
    if (!beforeNode) continue;

    const beforeValue = String(beforeNode.value);
    const afterValue = String(afterNode.value);
    if (beforeValue === afterValue) continue;

    updates.push({
      type: "widget.streaming_text.value_delta",
      component_id: id,
      delta: afterValue.slice(beforeValue.length),
      done: afterNode.streaming !== true,
    });
  }

  return updates;
}
