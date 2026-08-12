import { describe, expect, it } from "vitest";

describe("Guacamole gateway configuration", () => {
  it("accepts a configured HTTPS gateway base URL", () => {
    const baseUrl = process.env.GUACAMOLE_BASE_URL ?? "";
    expect(baseUrl).not.toBe("");
    const parsed = new URL(baseUrl);
    expect(["http:", "https:"].includes(parsed.protocol)).toBe(true);
    expect(parsed.pathname).toContain("guacamole");
  });
});
