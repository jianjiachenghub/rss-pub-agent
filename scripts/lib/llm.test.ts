import { describe, expect, it } from "vitest";
import { parseJsonResponse } from "./llm.js";

describe("parseJsonResponse", () => {
  it("parses a raw JSON array", () => {
    expect(parseJsonResponse('[{"id":"1","content":"ok"}]')).toEqual([
      { id: "1", content: "ok" },
    ]);
  });

  it("strips json code fences", () => {
    expect(
      parseJsonResponse('```json\n[{"id":"1","content":"ok"}]\n```')
    ).toEqual([{ id: "1", content: "ok" }]);
  });

  it("extracts embedded JSON from surrounding text", () => {
    expect(
      parseJsonResponse(
        '用户说明如下：\n[{"id":"1","content":"ok"}]\n以上是结果。'
      )
    ).toEqual([{ id: "1", content: "ok" }]);
  });

  it("unwraps the first array value from an object response", () => {
    expect(parseJsonResponse('{"items":[{"id":"1","content":"ok"}]}')).toEqual([
      { id: "1", content: "ok" },
    ]);
  });
});
