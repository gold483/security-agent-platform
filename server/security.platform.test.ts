import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mockDb = vi.hoisted(() => ({
  createRegistrationToken: vi.fn(async (siteId: number, createdBy: number, expiresInHours: number) => ({
    rawToken: "sap_test_token_value",
    tokenPrefix: "sap_test",
    expiresAt: new Date("2026-08-13T00:00:00.000Z"),
    siteId,
    createdBy,
    expiresInHours,
  })),
  createInspectionCommand: vi.fn(async (agentId: number, commandType: string, requestedBy: number) => ({
    id: 41,
    agentId,
    commandType,
    status: "queued" as const,
    requestedBy,
  })),
  getDashboardSummary: vi.fn(async () => ({
    totalAgents: 12,
    onlineAgents: 9,
    offlineAgents: 3,
    degradedAgents: 0,
    defenderHealthy: 10,
    quarantinedThreats: 2,
    queuedCommands: 1,
    sites: [],
    generatedAt: new Date("2026-08-12T00:00:00.000Z"),
  })),
  listSites: vi.fn(async () => [{ id: 1, code: "hanam", name: "하남" }]),
  listAgents: vi.fn(async () => []),
  listQuarantine: vi.fn(async () => []),
  listInspectionCommands: vi.fn(async () => []),
  listRdpSessions: vi.fn(async () => []),
  listAuditLogs: vi.fn(async () => []),
  issueRdpToken: vi.fn(),
  registerAgent: vi.fn(),
  recordHeartbeat: vi.fn(),
}));

vi.mock("./db", () => mockDb);

const { appRouter } = await import("./routers");

function createContext(role: "admin" | "user"): TrpcContext {
  return {
    user: {
      id: role === "admin" ? 1 : 2,
      openId: `${role}-user`,
      name: role === "admin" ? "Security Admin" : "Viewer",
      email: `${role}@example.com`,
      loginMethod: "test",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("security platform authorization", () => {
  it("blocks non-admin users from issuing registration tokens", async () => {
    const caller = appRouter.createCaller(createContext("user"));
    await expect(caller.security.issueRegistrationToken({ siteId: 1, expiresInHours: 24 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows admins to read the dashboard summary", async () => {
    const caller = appRouter.createCaller(createContext("admin"));
    const result = await caller.security.dashboard();
    expect(result.onlineAgents).toBe(9);
    expect(mockDb.getDashboardSummary).toHaveBeenCalled();
  });

  it("issues a registration token through the admin procedure", async () => {
    const caller = appRouter.createCaller(createContext("admin"));
    const result = await caller.security.issueRegistrationToken({ siteId: 1, expiresInHours: 24 });
    expect(result.rawToken).toBe("sap_test_token_value");
    expect(mockDb.createRegistrationToken).toHaveBeenCalledWith(1, 1, 24);
  });

  it("creates a queued inspection command with the requested command type", async () => {
    const caller = appRouter.createCaller(createContext("admin"));
    const result = await caller.security.createCommand({ agentId: 8, commandType: "Quick Scan" });
    expect(result).toMatchObject({ id: 41, agentId: 8, commandType: "Quick Scan", status: "queued" });
    expect(mockDb.createInspectionCommand).toHaveBeenCalledWith(8, "Quick Scan", 1);
  });
});
