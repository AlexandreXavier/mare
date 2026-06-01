<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { ports, type Port } from '~/lib/ports';
  import { nearestPort, type Fix } from '~/lib/geolocation';
  import { tileUrlFor, TILE_ATTRIBUTION, type Theme } from '~/lib/tiles';

  interface Props {
    fix: Fix;
  }

  let { fix }: Props = $props();

  let mapEl: HTMLDivElement;
  let cleanup: (() => void) | null = null;

  const nearest = nearestPort(fix, ports);

  const currentTheme = (): Theme =>
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

  onMount(async () => {
    const L = (await import('leaflet')).default;
    await import('leaflet/dist/leaflet.css');

    const map = L.map(mapEl, { zoomControl: true, attributionControl: true })
      .setView([fix.lat, fix.lon], 9);

    const tiles = L.tileLayer(tileUrlFor(currentTheme()), {
      attribution: TILE_ATTRIBUTION,
      maxZoom: 18,
    }).addTo(map);

    const portIcon = L.divIcon({
      className: 'mare-marker mare-marker--port',
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });
    const userIcon = L.divIcon({
      className: 'mare-marker mare-marker--user',
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });

    for (const p of ports) {
      L.marker([p.lat, p.lon], { icon: portIcon, title: p.name })
        .addTo(map)
        .on('click', () => {
          window.location.assign(`/${p.slug}`);
        });
    }

    L.marker([fix.lat, fix.lon], { icon: userIcon, title: 'A sua localização' }).addTo(map);

    if (nearest) {
      map.fitBounds(
        [
          [fix.lat, fix.lon],
          [nearest.port.lat, nearest.port.lon],
        ],
        { padding: [48, 48], maxZoom: 11 },
      );
    }

    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const onThemeChange = () => tiles.setUrl(tileUrlFor(currentTheme()));
    mql.addEventListener('change', onThemeChange);

    cleanup = () => {
      mql.removeEventListener('change', onThemeChange);
      map.remove();
    };
  });

  onDestroy(() => {
    cleanup?.();
  });
</script>

<div class="map-picker">
  <div bind:this={mapEl} class="map" data-testid="map" aria-label="Mapa de portos"></div>
  <a class="map-escape" href="/?list=1" data-testid="map-escape">
    Ver todos os portos →
  </a>
  {#if nearest}
    <a
      class="map-nearest"
      href={`/${nearest.port.slug}`}
      data-testid="map-nearest"
      data-nearest-slug={nearest.port.slug}
      data-nearest-km={nearest.km.toFixed(1)}
    >
      <span class="muted">Porto mais próximo</span>
      <strong>{nearest.port.name}</strong>
      <span class="km">~{Math.round(nearest.km)} km →</span>
    </a>
  {/if}
</div>

<style>
  .map-picker {
    position: fixed;
    inset: 0;
    display: block;
  }

  .map {
    position: absolute;
    inset: 0;
  }

  .map-escape {
    position: absolute;
    top: 12px;
    right: 12px;
    z-index: 500;
    background: var(--bg);
    border: 1px solid var(--text);
    border-radius: 0;
    padding: 6px 10px;
    font-size: 0.875rem;
    color: var(--text);
    text-decoration: underline;
    text-decoration-style: dashed;
    text-underline-offset: 4px;
  }

  .map-escape:hover { color: var(--accent); border-color: var(--accent); }

  .map-nearest {
    position: absolute;
    left: 12px;
    right: 12px;
    bottom: 12px;
    z-index: 500;
    display: grid;
    grid-template-columns: 1fr auto;
    grid-template-rows: auto auto;
    align-items: center;
    column-gap: 12px;
    background: var(--bg);
    border: 1px solid var(--text);
    border-radius: 0;
    padding: 10px 14px;
    color: var(--text);
    text-decoration: none;
    font-family: var(--font-mono);
  }

  .map-nearest .muted {
    grid-column: 1;
    grid-row: 1;
    font-size: 0.75rem;
    color: var(--muted);
    font-family: var(--font-sans);
  }

  .map-nearest strong {
    grid-column: 1;
    grid-row: 2;
    font-size: 1rem;
    font-weight: 500;
    font-family: var(--font-sans);
  }

  .map-nearest .km {
    grid-column: 2;
    grid-row: 1 / span 2;
    font-size: 0.9375rem;
    color: var(--accent);
  }

  :global(.mare-marker) {
    border-radius: 50%;
    border: 1px solid var(--bg);
  }

  :global(.mare-marker--port) {
    background: var(--tide-high);
  }

  :global(.mare-marker--user) {
    background: var(--accent);
    outline: 3px solid rgba(var(--color-accent-rgb), 0.3);
  }
</style>
