import { describe, expect, it } from "vitest";
import extractActionableAdvice from "../extractActionableAdvice";

describe("extractActionableAdvice", () => {
  it("returns plain text when no json block exists", () => {
    const result = extractActionableAdvice("Hello world");
    expect(result.cleanedText).toBe("Hello world");
    expect(result.items).toEqual([]);
  });

  it("extracts items from json fence", () => {
    const input = `
Advice text.

\`\`\`json
{
  "items": [
    {
      "id": "1",
      "type": "specialization",
      "title": "Update pipe",
      "recordType": "pipe",
      "recordId": "pipe-1",
      "recordName": "Pipe 1",
      "proposedChanges": { "specialization": "Outdoor Rotation" }
    }
  ]
}
\`\`\`
`;

    const result = extractActionableAdvice(input);
    expect(result.cleanedText).toContain("Advice text");
    expect(result.items).toHaveLength(1);
    expect(result.items[0].recordId).toBe("pipe-1");
  });
});
