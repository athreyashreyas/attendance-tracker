import { describe, expect, it } from 'vitest';
import { isNewerVersion } from './whatsNew';

describe('isNewerVersion', () => {
  it('treats a device that has never seen a version as due for the guide', () => {
    expect(isNewerVersion('0.8.0', null)).toBe(true);
    expect(isNewerVersion('0.8.0', '')).toBe(true);
  });

  it('is false for the version already seen', () => {
    expect(isNewerVersion('0.8.0', '0.8.0')).toBe(false);
  });

  it('compares each part as a number, not as text', () => {
    // The string comparison trap: '0.10.0' sorts before '0.9.0' alphabetically.
    expect(isNewerVersion('0.10.0', '0.9.0')).toBe(true);
    expect(isNewerVersion('0.9.0', '0.10.0')).toBe(false);
    expect(isNewerVersion('1.0.0', '0.99.99')).toBe(true);
    expect(isNewerVersion('0.8.1', '0.8.0')).toBe(true);
    expect(isNewerVersion('0.8.0', '0.8.1')).toBe(false);
  });

  it('treats a missing part as zero, so 0.8 and 0.8.0 are the same version', () => {
    expect(isNewerVersion('0.8', '0.8.0')).toBe(false);
    expect(isNewerVersion('0.8.1', '0.8')).toBe(true);
  });

  it('never goes backwards on a downgrade', () => {
    expect(isNewerVersion('0.7.0', '0.8.0')).toBe(false);
  });
});
