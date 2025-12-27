import * as acorn from "acorn";
import type { Node } from "acorn";

export type AnyNode = Node & Record<string, any>;

export function parseProgram(code: string): AnyNode {
  return acorn.parse(code, {
    ecmaVersion: 2020,
    sourceType: "script",
    locations: true,
  }) as AnyNode;
}
