import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, publicProcedure, router } from "./_core/trpc";
import {
  createInspectionCommand,
  createRegistrationToken,
  getAgentDetail,
  getDashboardSummary,
  issueRdpToken,
  listAgents,
  listAuditLogs,
  listInspectionCommands,
  listQuarantine,
  listRdpSessions,
  listSites,
  pollAgentCommands,
  recordHeartbeat,
  registerAgent,
  updateAgentCommand,
} from "./db";

const siteFilter = z.object({ siteId: z.number().int().positive().optional() }).optional();
const commandType = z.enum(["Full Scan", "Quick Scan", "서명 업데이트"]);

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  security: router({
    dashboard: adminProcedure.input(siteFilter).query(({ input }) => getDashboardSummary(input?.siteId)),
    sites: adminProcedure.query(() => listSites()),
    agents: adminProcedure.input(siteFilter).query(({ input }) => listAgents(input?.siteId)),
    agentDetail: adminProcedure.input(z.object({ agentId: z.number().int().positive() })).query(({ input }) => getAgentDetail(input.agentId)),
    quarantine: adminProcedure.input(siteFilter).query(({ input }) => listQuarantine(input?.siteId)),
    commands: adminProcedure.input(siteFilter).query(({ input }) => listInspectionCommands(input?.siteId)),
    rdpSessions: adminProcedure.input(siteFilter).query(({ input }) => listRdpSessions(input?.siteId)),
    auditLogs: adminProcedure.query(() => listAuditLogs()),
    issueRegistrationToken: adminProcedure
      .input(z.object({ siteId: z.number().int().positive(), expiresInHours: z.number().int().min(1).max(168).default(24) }))
      .mutation(({ input, ctx }) => createRegistrationToken(input.siteId, ctx.user.id, input.expiresInHours)),
    createCommand: adminProcedure
      .input(z.object({ agentId: z.number().int().positive(), commandType }))
      .mutation(({ input, ctx }) => createInspectionCommand(input.agentId, input.commandType, ctx.user.id)),
    issueRdpToken: adminProcedure
      .input(z.object({ agentId: z.number().int().positive(), path: z.enum(["internal", "external"]) }))
      .mutation(({ input, ctx }) => issueRdpToken(input.agentId, ctx.user.id, input.path)),
  }),

  agent: router({
    register: publicProcedure
      .input(z.object({
        registrationToken: z.string().min(16),
        agentKey: z.string().min(3).max(64),
        hostName: z.string().min(1).max(255),
        ipAddress: z.string().max(64).optional(),
        osVersion: z.string().max(255).optional(),
        agentVersion: z.string().max(64).optional(),
      }))
      .mutation(({ input }) => registerAgent(input)),
    pollCommands: publicProcedure
      .input(z.object({ agentKey: z.string().min(3).max(64), apiToken: z.string().min(16) }))
      .mutation(({ input }) => pollAgentCommands(input.agentKey, input.apiToken)),
    updateCommand: publicProcedure
      .input(z.object({ agentKey: z.string().min(3).max(64), apiToken: z.string().min(16), commandId: z.number().int().positive(), status: z.enum(["succeeded", "failed"]), resultMessage: z.string().max(2000).optional() }))
      .mutation(({ input }) => updateAgentCommand(input)),
    heartbeat: publicProcedure
      .input(z.object({
        agentKey: z.string().min(3).max(64),
        apiToken: z.string().min(16),
        hostName: z.string().max(255).optional(),
        ipAddress: z.string().max(64).optional(),
        osVersion: z.string().max(255).optional(),
        agentVersion: z.string().max(64).optional(),
        defender: z.object({
          realtimeProtection: z.boolean(),
          antivirusEnabled: z.boolean(),
          signatureVersion: z.string().max(128).optional(),
          engineVersion: z.string().max(128).optional(),
          lastUpdatedAt: z.coerce.date().optional(),
        }).optional(),
        quarantine: z.array(z.object({
          externalId: z.string().max(128).optional(),
          fileName: z.string().max(255),
          originalPath: z.string().optional(),
          threatName: z.string().max(255),
          detectedAt: z.coerce.date(),
          sha256: z.string().max(128).optional(),
          status: z.enum(["quarantined", "removed", "restored", "unknown"]).optional(),
        })).max(500).optional(),
      }))
      .mutation(({ input }) => recordHeartbeat(input)),
  }),
});

export type AppRouter = typeof appRouter;
