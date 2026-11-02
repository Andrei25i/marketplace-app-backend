import { chatConfig } from "../config/chat.config";

// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

interface NormalizeOptions {
  allowEmpty?: boolean;
}

export const normalizeMessageContent = (
  value: unknown,
  { allowEmpty = false }: NormalizeOptions = {},
): string | null => {
  if (value == null && allowEmpty) return "";
  if (typeof value !== "string") return null;

  const content = value
    .replace(/\r\n?/g, "\n")
    .replace(CONTROL_CHARS, "")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();

  if (content.length > chatConfig.maxMessageLength) return null;
  if (content.length === 0 && !allowEmpty) return null;

  return content;
};
