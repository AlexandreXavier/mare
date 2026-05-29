export type Theme = 'light' | 'dark';

export const tileUrlFor = (theme: Theme): string =>
  theme === 'dark'
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'
    : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png';

export const TILE_ATTRIBUTION = '© OpenStreetMap · © CARTO';
