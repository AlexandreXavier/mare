import { ports } from '../src/lib/ports';

const main = async () => {
  console.log(`[scrape] would scrape ${ports.length} ports — no scrapers implemented yet.`);
  for (const p of ports) {
    console.log(`  - ${p.slug}`);
  }
  process.exit(0);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
