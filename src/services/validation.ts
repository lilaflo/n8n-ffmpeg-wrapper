const ALLOWED_FFMPEG_FILTERS = [
  'setpts', 'fps', 'scale', 'crop', 'rotate', 'hflip', 'vflip',
  'fade', 'trim', 'volume', 'equalizer', 'brightness', 'contrast',
  'saturation', 'hue', 'drawtext', 'overlay'
];

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

  const filterMatch = command.match(/-filter:v\s+"([^"]+)"/);
  if (!filterMatch) {
    return { valid: false, error: 'Command must contain -filter:v with quoted filter string' };
  }

  const filterContent = filterMatch[1];
  const hasAllowedFilter = ALLOWED_FFMPEG_FILTERS.some(filter =>
    filterContent.includes(filter)
  );

  if (!hasAllowedFilter) {
    return { valid: false, error: `Filter must use one of the allowed filters: ${ALLOWED_FFMPEG_FILTERS.join(', ')}` };
  }

  return { valid: true };
}
