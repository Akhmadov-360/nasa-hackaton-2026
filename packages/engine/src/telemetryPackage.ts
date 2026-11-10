import { z } from 'zod';
import { MissionReportSchema, type MissionReport } from './report';

export const PACKAGE_SCHEMA = 'astro-telemetry-package/1';

/**
 * The file that travels between the spacecraft and the ground (and back for review).
 * It carries the finished report, which already contains the event log, so it can be opened without the original run.
 */
export const TelemetryPackageSchema = z.object({
  schema: z.literal(PACKAGE_SCHEMA),
  sessionId: z.string().max(64),
  /** mission time of the export */
  exportedAtT: z.number().finite(),
  report: MissionReportSchema,
});
export type TelemetryPackage = z.infer<typeof TelemetryPackageSchema>;

export function buildPackage(report: MissionReport, meta: { sessionId: string; exportedAtT: number }): TelemetryPackage {
  return { schema: PACKAGE_SCHEMA, sessionId: meta.sessionId, exportedAtT: meta.exportedAtT, report };
}

export type ParseResult =
  | { ok: true; pkg: TelemetryPackage }
  | { ok: false; code: 'not-a-package' | 'unsupported-version' | 'invalid'; error: string };

/** Validates an untrusted file. Never throws; unknown fields are dropped. */
export function parsePackage(input: unknown): ParseResult {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, code: 'not-a-package', error: 'The file is not a telemetry package (expected a JSON object).' };
  }
  const schema = (input as { schema?: unknown }).schema;
  if (typeof schema !== 'string' || !schema.startsWith('astro-telemetry-package/')) {
    return { ok: false, code: 'not-a-package', error: 'The file is not a telemetry package from Astronaut Health Monitor.' };
  }
  if (schema !== PACKAGE_SCHEMA) {
    return { ok: false, code: 'unsupported-version', error: `Unsupported package version: ${schema.slice(0, 40)}.` };
  }
  const r = TelemetryPackageSchema.safeParse(input);
  if (r.success) return { ok: true, pkg: r.data };
  const issue = r.error.issues[0];
  return { ok: false, code: 'invalid', error: `The package is damaged or incomplete at "${issue?.path.join('.') ?? '?'}": ${issue?.message ?? 'invalid value'}.` };
}
