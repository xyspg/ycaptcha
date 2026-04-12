import { describe, expect, it } from "vitest";
import { domainSchema } from "@/lib/validators";

describe("domainSchema", () => {
  it("accepts example.com", () => {
    expect(domainSchema.parse("example.com")).toBe("example.com");
  });

  it("accepts sub.example.com", () => {
    expect(domainSchema.parse("sub.example.com")).toBe("sub.example.com");
  });

  it("accepts localhost", () => {
    expect(domainSchema.parse("localhost")).toBe("localhost");
  });

  it("strips https:// prefix", () => {
    expect(domainSchema.parse("https://example.com")).toBe("example.com");
  });

  it("strips port from localhost:3000", () => {
    expect(domainSchema.parse("localhost:3000")).toBe("localhost");
  });

  it("strips trailing slash", () => {
    expect(domainSchema.parse("example.com/")).toBe("example.com");
  });

  it("rejects empty string", () => {
    expect(() => domainSchema.parse("")).toThrow();
  });

  it("rejects spaces", () => {
    expect(() => domainSchema.parse("example .com")).toThrow();
  });

  it("rejects bare TLD (.com)", () => {
    expect(() => domainSchema.parse(".com")).toThrow();
  });

  it("rejects strings longer than 253 chars", () => {
    expect(() => domainSchema.parse(`${"a".repeat(254)}.com`)).toThrow();
  });
});
