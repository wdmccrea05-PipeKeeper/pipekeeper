import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

function readPage(fileName) {
  return fs.readFileSync(path.resolve(process.cwd(), "src/pages", fileName), "utf8");
}

describe("collection default sort states", () => {
  it("defaults major collection pages to name sorting", () => {
    const pipes = readPage("Pipes.jsx");
    const tobacco = readPage("Tobacco.jsx");
    const whiskey = readPage("Whiskey.jsx");
    const cigars = readPage("Cigars.jsx");

    expect(pipes).toContain("const [sortBy, setSortBy] = useState('name');");
    expect(tobacco).toContain("const [sortBy, setSortBy] = useState('name');");
    expect(whiskey).toContain("const [sortBy, setSortBy] = useState('name');");
    expect(cigars).toContain("const [sortBy, setSortBy] = useState('name');");
  });
});

