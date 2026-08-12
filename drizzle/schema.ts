import {
  boolean,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

/** Core user table backing the Manus auth flow. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const sites = mysqlTable(
  "sites",
  {
    id: int("id").autoincrement().primaryKey(),
    code: varchar("code", { length: 32 }).notNull(),
    name: varchar("name", { length: 64 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({ codeUnique: uniqueIndex("sites_code_unique").on(table.code) }),
);

export const agents = mysqlTable(
  "agents",
  {
    id: int("id").autoincrement().primaryKey(),
    agentKey: varchar("agentKey", { length: 64 }).notNull(),
    apiTokenHash: varchar("apiTokenHash", { length: 128 }).notNull(),
    hostName: varchar("hostName", { length: 255 }).notNull(),
    siteId: int("siteId").notNull(),
    ipAddress: varchar("ipAddress", { length: 64 }),
    osVersion: varchar("osVersion", { length: 255 }),
    agentVersion: varchar("agentVersion", { length: 64 }),
    status: mysqlEnum("status", ["online", "offline", "degraded"]).default("offline").notNull(),
    defenderEnabled: boolean("defenderEnabled").default(false).notNull(),
    signatureVersion: varchar("signatureVersion", { length: 128 }),
    signatureUpdatedAt: timestamp("signatureUpdatedAt"),
    lastHeartbeatAt: timestamp("lastHeartbeatAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    agentKeyUnique: uniqueIndex("agents_agent_key_unique").on(table.agentKey),
    siteIndex: index("agents_site_idx").on(table.siteId),
    heartbeatIndex: index("agents_heartbeat_idx").on(table.lastHeartbeatAt),
  }),
);

export const registrationTokens = mysqlTable(
  "registration_tokens",
  {
    id: int("id").autoincrement().primaryKey(),
    tokenHash: varchar("tokenHash", { length: 128 }).notNull(),
    tokenPrefix: varchar("tokenPrefix", { length: 16 }).notNull(),
    siteId: int("siteId").notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    usedAt: timestamp("usedAt"),
    createdBy: int("createdBy").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({ tokenHashUnique: uniqueIndex("registration_tokens_hash_unique").on(table.tokenHash) }),
);

export const defenderStatus = mysqlTable(
  "defender_status",
  {
    id: int("id").autoincrement().primaryKey(),
    agentId: int("agentId").notNull(),
    realtimeProtection: boolean("realtimeProtection").default(false).notNull(),
    antivirusEnabled: boolean("antivirusEnabled").default(false).notNull(),
    signatureVersion: varchar("signatureVersion", { length: 128 }),
    engineVersion: varchar("engineVersion", { length: 128 }),
    lastUpdatedAt: timestamp("lastUpdatedAt"),
    collectedAt: timestamp("collectedAt").defaultNow().notNull(),
  },
  table => ({
    agentIndex: index("defender_status_agent_idx").on(table.agentId),
    collectedIndex: index("defender_status_collected_idx").on(table.collectedAt),
  }),
);

export const quarantineRecords = mysqlTable(
  "quarantine_records",
  {
    id: int("id").autoincrement().primaryKey(),
    agentId: int("agentId").notNull(),
    fileName: varchar("fileName", { length: 255 }).notNull(),
    originalPath: text("originalPath"),
    threatName: varchar("threatName", { length: 255 }).notNull(),
    detectedAt: timestamp("detectedAt").notNull(),
    sha256: varchar("sha256", { length: 128 }),
    status: mysqlEnum("status", ["quarantined", "removed", "restored", "unknown"]).default("quarantined").notNull(),
    externalId: varchar("externalId", { length: 128 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    agentIndex: index("quarantine_agent_idx").on(table.agentId),
    detectedIndex: index("quarantine_detected_idx").on(table.detectedAt),
  }),
);

export const inspectionCommands = mysqlTable(
  "inspection_commands",
  {
    id: int("id").autoincrement().primaryKey(),
    agentId: int("agentId").notNull(),
    commandType: mysqlEnum("commandType", ["Full Scan", "Quick Scan", "서명 업데이트"]).notNull(),
    status: mysqlEnum("status", ["queued", "running", "succeeded", "failed"]).default("queued").notNull(),
    requestedBy: int("requestedBy").notNull(),
    requestedAt: timestamp("requestedAt").defaultNow().notNull(),
    startedAt: timestamp("startedAt"),
    finishedAt: timestamp("finishedAt"),
    resultMessage: text("resultMessage"),
  },
  table => ({
    agentIndex: index("inspection_commands_agent_idx").on(table.agentId),
    statusIndex: index("inspection_commands_status_idx").on(table.status),
  }),
);

export const rdpSessions = mysqlTable(
  "rdp_sessions",
  {
    id: int("id").autoincrement().primaryKey(),
    agentId: int("agentId").notNull(),
    userId: int("userId").notNull(),
    path: mysqlEnum("path", ["internal", "external"]).notNull(),
    startedAt: timestamp("startedAt"),
    endedAt: timestamp("endedAt"),
    recordingFilePath: text("recordingFilePath"),
    connectionTokenHash: varchar("connectionTokenHash", { length: 128 }),
    tokenExpiresAt: timestamp("tokenExpiresAt"),
    tokenConsumedAt: timestamp("tokenConsumedAt"),
  },
  table => ({
    agentIndex: index("rdp_sessions_agent_idx").on(table.agentId),
    userIndex: index("rdp_sessions_user_idx").on(table.userId),
  }),
);

export const auditLogs = mysqlTable(
  "audit_logs",
  {
    id: int("id").autoincrement().primaryKey(),
    actorUserId: int("actorUserId"),
    action: varchar("action", { length: 128 }).notNull(),
    entityType: varchar("entityType", { length: 64 }).notNull(),
    entityId: int("entityId"),
    metadata: text("metadata"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({ createdIndex: index("audit_logs_created_idx").on(table.createdAt) }),
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Site = typeof sites.$inferSelect;
export type Agent = typeof agents.$inferSelect;
export type DefenderStatus = typeof defenderStatus.$inferSelect;
export type QuarantineRecord = typeof quarantineRecords.$inferSelect;
export type InspectionCommand = typeof inspectionCommands.$inferSelect;
export type RdpSession = typeof rdpSessions.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
