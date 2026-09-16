import { describe, expect, it } from "vitest";
import { parseArgs, flagString, flagBoolean } from "./args.js";

describe("parseArgs", () => {
  it("separates positionals from flags", () => {
    const { positionals, flags } = parseArgs(["report", "results.jsonl", "--out", "report.html"]);
    expect(positionals).toEqual(["report", "results.jsonl"]);
    expect(flagString(flags, "out")).toBe("report.html");
  });

  it("treats a flag with no following value as boolean true", () => {
    const { flags } = parseArgs(["attack", "--demo", "--shielded"]);
    expect(flagBoolean(flags, "demo")).toBe(true);
    expect(flagBoolean(flags, "shielded")).toBe(true);
  });

  it("does not swallow a following flag as a value", () => {
    const { flags } = parseArgs(["attack", "--demo", "--out", "x.jsonl"]);
    expect(flags.get("demo")).toBe(true);
    expect(flagString(flags, "out")).toBe("x.jsonl");
  });

  it("flagString returns undefined for a boolean flag", () => {
    const { flags } = parseArgs(["--demo"]);
    expect(flagString(flags, "demo")).toBeUndefined();
  });
});
