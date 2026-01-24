const DANGEROUS_PATTERNS = [
  /;/,
  /\|/,
  /&&/,
  /\$\(/,
  /`/,
  />/,
  /<(?!PTS)/,
  /\\/,
  /exec/i,
  /eval/i,
  /system/i
];

export function validateFfmpegCommand(command: string): { valid: boolean; error?: string } {
  if (!command || typeof command !== 'string') {
    return { valid: false, error: 'Command must be a non-empty string' };
  }

  if (command.length > 1000) {
    return { valid: false, error: 'Command exceeds maximum length of 1000 characters' };
  }

  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(command)) {
      return { valid: false, error: `Command contains prohibited pattern: ${pattern}` };
    }
  }

  return { valid: true };
}
