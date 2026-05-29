import { describe, it, expect, vi } from 'vitest';
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { runOne } from './run-all';

describe('runOne — partial-failure isolation', () => {
  it('catches a thrown scrape() and returns false without throwing', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const ok = await runOne(
      {
        slug: '__failing__',
        scrape: async () => {
          throw new Error('boom');
        },
      },
      '2026-05-29',
    );
    expect(ok).toBe(false);
    expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('[__failing__] FAILED: boom'));
    errSpy.mockRestore();
  });

  it('leaves the stored file untouched when scrape throws', async () => {
    // Seed the data dir indirectly by writing a synthetic file the runner
    // would read, then confirming runOne does not modify it after a throw.
    // We rely on the fact that runOne writes via DATA_DIR / slug.json — we
    // pick a slug whose file shouldn't exist, run a failing scrape, and
    // assert no file got created.
    const logSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const ok = await runOne(
      {
        slug: '__never-written__',
        scrape: async () => {
          throw new Error('network down');
        },
      },
      '2026-05-29',
    );
    expect(ok).toBe(false);
    // No JSON should have been written for this fake slug.
    const path = join(process.cwd(), 'data', '__never-written__.json');
    expect(existsSync(path)).toBe(false);
    logSpy.mockRestore();
  });
});
