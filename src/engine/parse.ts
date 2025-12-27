import * as acorn from "acorn";
// acorn ספריה שמפרקת קוד js לטוקנים ולעץ תחבירי
import type { Node } from "acorn";
//node של acorn, אבל אני מאפשר לעצמי לגשת לכל שדה נוסף בלי שts יחפור לי
export type AnyNode = Node & Record<string, any>;
//פונקציה שמפרקת קוד JS לעץ תחבירי
export function parseProgram(code: string): AnyNode {
  return acorn.parse(code, {
    ecmaVersion: 2020,
    sourceType: "script",
    locations: true,
  }) as AnyNode;
}
