import type { AnyNode } from "../engine/parse";
//מחזירה לי את המספר שורה בקוד המקורי של הצומת הנתון
export function nodeLine(node: AnyNode): number {
  return node?.loc?.start?.line ?? 1;
}
