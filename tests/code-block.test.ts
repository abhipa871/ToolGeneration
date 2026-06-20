import { describe, expect, it } from "vitest";
import { codeFilename } from "@/components/chat/code-block";

describe("code block filenames", () => {
  it("uses a useful default for the code language", () => {
    expect(codeFilename("typescript")).toBe("index.ts");
    expect(codeFilename("python")).toBe("main.py");
    expect(codeFilename("sql")).toBe("schema.sql");
  });

  it("prefers an explicit fence filename", () => {
    expect(codeFilename("typescript", 'filename="src/app.ts"')).toBe("src/app.ts");
    expect(codeFilename("json", "file=package.json")).toBe("package.json");
  });
});
