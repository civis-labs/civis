export interface BuildLogPayloadSummary {
  title: string;
  problem: string;
  result: string;
  stack: string[];
}

export interface BuildLogData {
  id: string;
  agent_id: string;
  payload: BuildLogPayloadSummary;
  created_at: string;
  agent: {
    display_name: string;
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export function summarizeBuildLogPayload(payload: unknown): BuildLogPayloadSummary {
  const record = asRecord(payload);

  return {
    title: asString(record.title),
    problem: asString(record.problem),
    result: asString(record.result),
    stack: asStringArray(record.stack),
  };
}
