export interface GuardrailResult {
  isSafe: boolean;
  reason?: string;
  sanitizedContent?: string;
}

const BLOCKED_PATTERNS = [
  /system prompt/i,
  /ignore previous instructions/i,
  /dan mode/i,
  /bypass rules/i,
];

// Simple PII checks (e.g. credit cards or exposed secrets)
const PII_PATTERNS = [
  /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/, // credit card
  /api[-_]?key/i,
];

export function runInputGuardrails(input: string): GuardrailResult {
  const cleanInput = input.trim();

  // 1. Check for prompt injections
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(cleanInput)) {
      return {
        isSafe: false,
        reason: "Input query violates safety policies (Prompt Injection detected).",
      };
    }
  }

  // 2. Check for PII Leakage
  for (const pattern of PII_PATTERNS) {
    if (pattern.test(cleanInput)) {
      return {
        isSafe: false,
        reason: "Input contains sensitive personal information (PII).",
      };
    }
  }

  return { isSafe: true, sanitizedContent: cleanInput };
}

export function runOutputGuardrails(output: string): GuardrailResult {
  let cleanOutput = output;

  // Filter out any accidentally leaked backend API key patterns
  for (const pattern of PII_PATTERNS) {
    if (pattern.test(cleanOutput)) {
      cleanOutput = cleanOutput.replace(pattern, "[REDACTED]");
    }
  }

  return { isSafe: true, sanitizedContent: cleanOutput };
}
