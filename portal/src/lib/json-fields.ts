/**
 * Utilities for serializing/deserializing JSON fields stored as strings in SQLite.
 * SQLite does not have a native JSON column type, so Prisma maps Json → String.
 * These helpers ensure objects/arrays are stringified before writes and parsed after reads.
 */

const SESSION_LOG_JSON_FIELDS = [
  "filesChanged",
  "commits",
  "toolsUsed",
  "subagents",
  "userMessages",
  "rawLog",
] as const;

const CHAT_MESSAGE_JSON_FIELDS = ["metadata"] as const;

/**
 * Parse a single JSON string field. Returns the original value if parsing fails
 * or if the value is already a non-string (already parsed).
 */
function parseField(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

/**
 * Deserialize the known JSON string fields on a SessionLog row read from SQLite.
 */
export function deserializeSessionLog(
  log: Record<string, unknown>
): Record<string, unknown> {
  const result = { ...log };
  for (const field of SESSION_LOG_JSON_FIELDS) {
    if (field in result) {
      result[field] = parseField(result[field]);
    }
  }
  return result;
}

/**
 * Deserialize the `metadata` JSON string field on a ChatMessage row read from SQLite.
 */
export function deserializeChatMetadata(
  msg: Record<string, unknown>
): Record<string, unknown> {
  const result = { ...msg };
  for (const field of CHAT_MESSAGE_JSON_FIELDS) {
    if (field in result) {
      result[field] = parseField(result[field]);
    }
  }
  return result;
}
