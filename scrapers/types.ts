import type { TideEvent } from '../src/lib/tides';

export type ScrapedDay = {
  date: string;
  events: TideEvent[];
};

export interface PortScraper {
  port: string;
  source: string;
  scrape(fromDate: Date, days: number): Promise<ScrapedDay[]>;
}
