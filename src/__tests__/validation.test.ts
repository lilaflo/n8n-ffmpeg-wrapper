import { describe, it, expect } from 'vitest';
import { validateFfmpegCommand } from '../services/validation.js';

describe('validateFfmpegCommand', () => {
  it('should accept valid setpts filter command', () => {
    const result = validateFfmpegCommand('-filter:v "setpts=3.0*PTS"');
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should accept valid scale filter command', () => {
    const result = validateFfmpegCommand('-filter:v "scale=1280:720"');
    expect(result.valid).toBe(true);
  });

  it('should reject command with semicolon', () => {
    const result = validateFfmpegCommand('-filter:v "setpts=2.0*PTS"; rm -rf /');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('prohibited pattern');
  });

  it('should reject command with pipe', () => {
    const result = validateFfmpegCommand('-filter:v "setpts=2.0*PTS" | cat /etc/passwd');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('prohibited pattern');
  });

  it('should reject command with command substitution', () => {
    const result = validateFfmpegCommand('-filter:v "setpts=$(whoami)*PTS"');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('prohibited pattern');
  });

  it('should reject command with backticks', () => {
    const result = validateFfmpegCommand('-filter:v "setpts=`whoami`*PTS"');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('prohibited pattern');
  });

  it('should reject command without filter:v', () => {
    const result = validateFfmpegCommand('-an -c:v copy');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('must contain -filter:v');
  });

  it('should reject command with unallowed filter', () => {
    const result = validateFfmpegCommand('-filter:v "movie=/etc/passwd"');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('allowed filters');
  });

  it('should reject empty command', () => {
    const result = validateFfmpegCommand('');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('non-empty string');
  });

  it('should reject command exceeding max length', () => {
    const longCommand = '-filter:v "' + 'setpts=2.0*PTS'.repeat(100) + '"';
    const result = validateFfmpegCommand(longCommand);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('maximum length');
  });
});
