import { scrapeFromIh } from './lib/ih-api';
import type { ScrapeResult } from './lib/merge';

const LEIXOES_PORT_ID = 12;
const DEFAULT_DAYS = 30;

export const scrape = (): Promise<ScrapeResult> =>
  scrapeFromIh(LEIXOES_PORT_ID, DEFAULT_DAYS);
