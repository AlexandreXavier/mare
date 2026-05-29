import { describe, it, expect } from 'vitest';
import { tileUrlFor } from './tiles';

describe('tileUrlFor', () => {
  it('returns the CARTO Light URL template for light theme', () => {
    expect(tileUrlFor('light')).toBe(
      'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
    );
  });

  it('returns the CARTO Dark Matter URL template for dark theme', () => {
    expect(tileUrlFor('dark')).toBe(
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
    );
  });
});
