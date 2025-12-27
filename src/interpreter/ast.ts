import type { AnyNode } from "../engine/parse";

export function nodeLine(node: AnyNode): number {
  return node?.loc?.start?.line ?? 1;
}
