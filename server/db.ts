import { createHash, randomBytes } from "node:crypto";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  agents,
  auditLogs,
  defenderStatus,
  inspectionCommands,
  quarantineRecords,
  rdpSessions,
  registrationTokens,
  sites,
  users,
  type InsertUser,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  type TextField = (typeof textFields)[number];

  for (const field of textFields) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  values.lastSignedIn ??= new Date();
  updateSet.lastSignedIn ??= new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export function hashSecret(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function createOpaqueToken(prefix: string) {
  return `${prefix}_${randomBytes(24).toString("base64url")}`;
}

function getEffectiveStatus(lastHeartbeatAt: Date | null, persistedStatus: "online" | "offline" | "degraded") {
  if (!lastHeartbeatAt) return "offline" as const;
  const ageMs = Date.now() - lastHeartbeatAt.getTime();
  if (ageMs > 3 * 60 * 1000) return "offline" as const;
  return persistedStatus;
}

export async function listSites() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(sites).orderBy(sites.name);
}

export async function listAgents(siteId?: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({ agent: agents, site: sites })
    .from(agents)
    .innerJoin(sites, eq(agents.siteId, sites.id))
    .where(siteId ? eq(agents.siteId, siteId) : undefined)
    .orderBy(desc(agents.updatedAt));

  return rows.map(({ agent, site }) => ({
    ...agent,
    siteName: site.name,
    effectiveStatus: getEffectiveStatus(agent.lastHeartbeatAt, agent.status),
  }));
}

export async function getDashboardSummary(siteId?: number) {
  const agentRows = await listAgents(siteId);
  const quarantine = await listQuarantine(siteId);
  const commands = await listInspectionCommands(siteId);
  const online = agentRows.filter(agent => agent.effectiveStatus === "online").length;
  const degraded = agentRows.filter(agent => agent.effectiveStatus === "degraded").length;
  const defenderHealthy = agentRows.filter(
    agent => agent.defenderEnabled && !!agent.signatureUpdatedAt && Date.now() - agent.signatureUpdatedAt.getTime() < 7 * 24 * 60 * 60 * 1000,
  ).length;

  return {
    totalAgents: agentRows.length,
    onlineAgents: online,
    offlineAgents: agentRows.length - online - degraded,
    degradedAgents: degraded,
    defenderHealthy,
    quarantinedThreats: quarantine.filter(item => item.record.status === "quarantined").length,
    queuedCommands: commands.filter(command => command.command.status === "queued" || command.command.status === "running").length,
    sites: await listSites(),
    generatedAt: new Date(),
  };
}

export async function createRegistrationToken(siteId: number, createdBy: number, expiresInHours: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rawToken = createOpaqueToken("sap");
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
  const tokenHash = hashSecret(rawToken);
  await db.insert(registrationTokens).values({
    tokenHash,
    tokenPrefix: rawToken.slice(0, 12),
    siteId,
    expiresAt,
    createdBy,
  });
  return { rawToken, tokenPrefix: rawToken.slice(0, 12), expiresAt };
}

export async function registerAgent(input: {
  registrationToken: string;
  agentKey: string;
  hostName: string;
  ipAddress?: string;
  osVersion?: string;
  agentVersion?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const tokenHash = hashSecret(input.registrationToken);
  const tokenRows = await db
    .select()
    .from(registrationTokens)
    .where(and(eq(registrationTokens.tokenHash, tokenHash), isNull(registrationTokens.usedAt)))
    .limit(1);
  const registration = tokenRows[0];
  if (!registration || registration.expiresAt.getTime() <= Date.now()) {
    throw new Error("Registration token is invalid or expired");
  }

  const apiToken = createOpaqueToken("agent");
  await db.insert(agents).values({
    agentKey: input.agentKey,
    apiTokenHash: hashSecret(apiToken),
    hostName: input.hostName,
    siteId: registration.siteId,
    ipAddress: input.ipAddress,
    osVersion: input.osVersion,
    agentVersion: input.agentVersion,
    status: "offline",
  });
  await db.update(registrationTokens).set({ usedAt: new Date() }).where(eq(registrationTokens.id, registration.id));
  return { agentKey: input.agentKey, apiToken, siteId: registration.siteId };
}

export async function recordHeartbeat(input: {
  agentKey: string;
  apiToken: string;
  hostName?: string;
  ipAddress?: string;
  osVersion?: string;
  agentVersion?: string;
  defender?: {
    realtimeProtection: boolean;
    antivirusEnabled: boolean;
    signatureVersion?: string;
    engineVersion?: string;
    lastUpdatedAt?: Date;
  };
  quarantine?: Array<{
    externalId?: string;
    fileName: string;
    originalPath?: string;
    threatName: string;
    detectedAt: Date;
    sha256?: string;
    status?: "quarantined" | "removed" | "restored" | "unknown";
  }>;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const agentRows = await db.select().from(agents).where(eq(agents.agentKey, input.agentKey)).limit(1);
  const agent = agentRows[0];
  if (!agent || hashSecret(input.apiToken) !== agent.apiTokenHash) {
    throw new Error("Agent credentials are invalid");
  }

  const now = new Date();
  await db.update(agents).set({
    hostName: input.hostName ?? agent.hostName,
    ipAddress: input.ipAddress ?? agent.ipAddress,
    osVersion: input.osVersion ?? agent.osVersion,
    agentVersion: input.agentVersion ?? agent.agentVersion,
    status: "online",
    defenderEnabled: input.defender?.antivirusEnabled ?? agent.defenderEnabled,
    signatureVersion: input.defender?.signatureVersion ?? agent.signatureVersion,
    signatureUpdatedAt: input.defender?.lastUpdatedAt ?? agent.signatureUpdatedAt,
    lastHeartbeatAt: now,
  }).where(eq(agents.id, agent.id));

  if (input.defender) {
    await db.insert(defenderStatus).values({
      agentId: agent.id,
      realtimeProtection: input.defender.realtimeProtection,
      antivirusEnabled: input.defender.antivirusEnabled,
      signatureVersion: input.defender.signatureVersion,
      engineVersion: input.defender.engineVersion,
      lastUpdatedAt: input.defender.lastUpdatedAt,
      collectedAt: now,
    });
  }

  for (const record of input.quarantine ?? []) {
    const existing = record.externalId
      ? await db.select({ id: quarantineRecords.id }).from(quarantineRecords).where(
          and(eq(quarantineRecords.agentId, agent.id), eq(quarantineRecords.externalId, record.externalId)),
        ).limit(1)
      : [];
    if (!existing[0]) {
      await db.insert(quarantineRecords).values({
        agentId: agent.id,
        externalId: record.externalId,
        fileName: record.fileName,
        originalPath: record.originalPath,
        threatName: record.threatName,
        detectedAt: record.detectedAt,
        sha256: record.sha256,
        status: record.status ?? "quarantined",
      });
    }
  }

  return { acceptedAt: now, agentId: agent.id };
}

export async function listQuarantine(siteId?: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ record: quarantineRecords, agent: agents, site: sites })
    .from(quarantineRecords)
    .innerJoin(agents, eq(quarantineRecords.agentId, agents.id))
    .innerJoin(sites, eq(agents.siteId, sites.id))
    .where(siteId ? eq(agents.siteId, siteId) : undefined)
    .orderBy(desc(quarantineRecords.detectedAt));
}

export async function getAgentDetail(agentId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const agentRows = await db.select({ agent: agents, site: sites }).from(agents).innerJoin(sites, eq(agents.siteId, sites.id)).where(eq(agents.id, agentId)).limit(1);
  const base = agentRows[0];
  if (!base) return undefined;
  const [defenderHistory, quarantine, commands, sessions] = await Promise.all([
    db.select().from(defenderStatus).where(eq(defenderStatus.agentId, agentId)).orderBy(desc(defenderStatus.collectedAt)).limit(20),
    db.select().from(quarantineRecords).where(eq(quarantineRecords.agentId, agentId)).orderBy(desc(quarantineRecords.detectedAt)).limit(20),
    db.select().from(inspectionCommands).where(eq(inspectionCommands.agentId, agentId)).orderBy(desc(inspectionCommands.requestedAt)).limit(20),
    db.select().from(rdpSessions).where(eq(rdpSessions.agentId, agentId)).orderBy(desc(rdpSessions.startedAt)).limit(20),
  ]);
  return {
    ...base.agent,
    siteName: base.site.name,
    effectiveStatus: getEffectiveStatus(base.agent.lastHeartbeatAt, base.agent.status),
    defenderHistory,
    quarantine,
    commands,
    sessions,
  };
}

export async function createInspectionCommand(agentId: number, commandType: "Full Scan" | "Quick Scan" | "서명 업데이트", requestedBy: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(inspectionCommands).values({ agentId, commandType, requestedBy });
  const commandId = Number(result[0].insertId);
  await db.insert(auditLogs).values({
    actorUserId: requestedBy,
    action: "inspection_command.created",
    entityType: "inspection_command",
    entityId: commandId,
    metadata: JSON.stringify({ agentId, commandType }),
  });
  return { id: commandId, agentId, commandType, status: "queued" as const };
}

export async function listInspectionCommands(siteId?: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ command: inspectionCommands, agent: agents, site: sites })
    .from(inspectionCommands)
    .innerJoin(agents, eq(inspectionCommands.agentId, agents.id))
    .innerJoin(sites, eq(agents.siteId, sites.id))
    .where(siteId ? eq(agents.siteId, siteId) : undefined)
    .orderBy(desc(inspectionCommands.requestedAt));
}

export async function pollAgentCommands(agentKey: string, apiToken: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const agentRows = await db.select().from(agents).where(eq(agents.agentKey, agentKey)).limit(1);
  const agent = agentRows[0];
  if (!agent || hashSecret(apiToken) !== agent.apiTokenHash) throw new Error("Agent credentials are invalid");
  const queued = await db.select().from(inspectionCommands).where(and(eq(inspectionCommands.agentId, agent.id), eq(inspectionCommands.status, "queued"))).orderBy(asc(inspectionCommands.requestedAt));
  if (queued.length > 0) {
    await db.update(inspectionCommands).set({ status: "running", startedAt: new Date() }).where(and(eq(inspectionCommands.agentId, agent.id), eq(inspectionCommands.status, "queued")));
  }
  return queued;
}

export async function updateAgentCommand(input: { agentKey: string; apiToken: string; commandId: number; status: "succeeded" | "failed"; resultMessage?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const agentRows = await db.select().from(agents).where(eq(agents.agentKey, input.agentKey)).limit(1);
  const agent = agentRows[0];
  if (!agent || hashSecret(input.apiToken) !== agent.apiTokenHash) throw new Error("Agent credentials are invalid");
  const result = await db.update(inspectionCommands).set({ status: input.status, finishedAt: new Date(), resultMessage: input.resultMessage }).where(and(eq(inspectionCommands.id, input.commandId), eq(inspectionCommands.agentId, agent.id)));
  await db.insert(auditLogs).values({ action: `inspection_command.${input.status}`, entityType: "inspection_command", entityId: input.commandId, metadata: JSON.stringify({ agentId: agent.id, resultMessage: input.resultMessage }) });
  return { commandId: input.commandId, status: input.status, updated: result[0].affectedRows > 0 };
}

export async function issueRdpToken(agentId: number, userId: number, path: "internal" | "external") {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const token = createOpaqueToken("guac");
  const expiresAt = new Date(Date.now() + 30 * 1000);
  const inserted = await db.insert(rdpSessions).values({
    agentId,
    userId,
    path,
    connectionTokenHash: hashSecret(token),
    tokenExpiresAt: expiresAt,
  });
  const sessionId = Number(inserted[0].insertId);
  await db.insert(auditLogs).values({
    actorUserId: userId,
    action: "rdp.token_issued",
    entityType: "rdp_session",
    entityId: sessionId,
    metadata: JSON.stringify({ agentId, path, expiresAt }),
  });
  return {
    sessionId,
    token,
    expiresAt,
    guacamolePath: `${ENV.guacamoleBaseUrl || "/guacamole"}/#/client/${encodeURIComponent(token)}`,
  };
}

export async function listRdpSessions(siteId?: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ session: rdpSessions, agent: agents, site: sites, user: users })
    .from(rdpSessions)
    .innerJoin(agents, eq(rdpSessions.agentId, agents.id))
    .innerJoin(sites, eq(agents.siteId, sites.id))
    .innerJoin(users, eq(rdpSessions.userId, users.id))
    .where(siteId ? eq(agents.siteId, siteId) : undefined)
    .orderBy(desc(rdpSessions.startedAt));
}

export async function listAuditLogs() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(100);
}
