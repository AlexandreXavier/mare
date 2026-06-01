<script lang="ts">
  import { interpolateCurve, type TideEvent } from '~/lib/tides';
  import { formatTime, lisbonMidnight } from '~/lib/time';
  import { getSunTimes } from '~/lib/sun';
  import { amplitudePercent } from '~/lib/range';
  import type { Port } from '~/lib/ports';

  interface Props {
    date: string;
    events: TideEvent[];
    isToday: boolean;
    port: Port;
    allDays: Record<string, { events: TideEvent[] }>;
    labelKind: 'registado' | 'anual';
    now?: Date | null;
  }

  let { date, events, isToday, port, allDays, labelKind, now = null }: Props = $props();

  const dayStart = lisbonMidnight(date);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const dayEvents = events.filter((ev) => {
    const t = new Date(ev.time).getTime();
    return t >= dayStart.getTime() && t < dayEnd.getTime();
  });

  const curve = interpolateCurve(events, dayStart, dayEnd, 144);

  const heights = curve.map((p) => p.h);
  const minH = Math.min(0, ...heights);
  const maxH = Math.max(...heights, 1);
  const range = maxH - minH || 1;

  const W = 360;
  const H = isToday ? 200 : 150;
  const PAD_X = 20;
  // Vertical reserves so the high-tide pill (cy - 28) and the hour-label
  // strip (y = H - 8) never get clipped by the SVG viewBox.
  const TOP_RESERVE = 40;
  const BOTTOM_RESERVE = 28;

  const xOf = (t: Date) =>
    PAD_X + ((t.getTime() - dayStart.getTime()) / (dayEnd.getTime() - dayStart.getTime())) * (W - PAD_X * 2);
  const yOf = (h: number) =>
    TOP_RESERVE + (1 - (h - minH) / range) * (H - TOP_RESERVE - BOTTOM_RESERVE);

  const linePath = curve
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${xOf(p.t).toFixed(1)},${yOf(p.h).toFixed(1)}`)
    .join(' ');

  const fillPath =
    curve.length > 0
      ? `${linePath} L${(W - PAD_X).toFixed(1)},${(H - BOTTOM_RESERVE).toFixed(1)} L${PAD_X.toFixed(1)},${(H - BOTTOM_RESERVE).toFixed(1)} Z`
      : '';

  const weekdayLabel = new Intl.DateTimeFormat('pt-PT', {
    timeZone: 'Europe/Lisbon',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(`${date}T12:00:00Z`));

  const { sunrise, sunset } = getSunTimes(date, port);
  const sunMarkers: Array<{ x: number; label: string; glyph: string; kind: 'sunrise' | 'sunset' }> = [];
  for (const m of [{ t: sunrise, glyph: '☀', kind: 'sunrise' as const }, { t: sunset, glyph: '🌙', kind: 'sunset' as const }]) {
    const ms = m.t.getTime();
    if (ms >= dayStart.getTime() && ms < dayEnd.getTime()) {
      sunMarkers.push({ x: xOf(m.t), label: formatTime(m.t), glyph: m.glyph, kind: m.kind });
    }
  }

  const pct = amplitudePercent(dayEvents, allDays);
  const pctRounded = Math.round(pct);
</script>

<article class="card" class:today={isToday}>
  <header class="card-label">
    {#if isToday}
      <span class="chip">Hoje</span>
    {:else}
      <span class="muted">{weekdayLabel}</span>
    {/if}
  </header>

  <svg viewBox="0 0 {W} {H}" class="chart" role="img" aria-label={`Curva de marés — ${isToday ? 'hoje' : weekdayLabel}`}>
    {#if fillPath}
      <path d={fillPath} fill="var(--tide-high)" fill-opacity="0.18" />
      <path d={linePath} fill="none" stroke="var(--tide-high)" stroke-width="2" stroke-linejoin="round" />
    {/if}

    {#each sunMarkers as m (m.kind)}
      <line
        x1={m.x}
        x2={m.x}
        y1={TOP_RESERVE - 10}
        y2={H - BOTTOM_RESERVE + 4}
        stroke="var(--muted)"
        stroke-width="1"
        stroke-dasharray="2 3"
        opacity="0.4"
      />
      <text
        x={m.x}
        y={12}
        text-anchor="middle"
        font-size="11"
      >{m.glyph}</text>
      <text
        class="hour-label"
        x={m.x}
        y={22}
        text-anchor="middle"
        font-size="9"
        fill="var(--muted)"
      >{m.label}</text>
    {/each}

    {#each dayEvents as ev (ev.time)}
      {@const cx = xOf(new Date(ev.time))}
      {@const cy = yOf(ev.height)}
      {@const isHigh = ev.type === 'high'}
      <circle {cx} {cy} r="3.5" fill={isHigh ? 'var(--tide-high)' : 'var(--tide-low)'} />
      <rect
        x={cx - 26}
        y={cy + (isHigh ? -28 : 10)}
        width="52"
        height="18"
        fill={isHigh ? 'var(--tide-high)' : 'var(--tide-low)'}
      />
      <text
        class="tide-pill-label"
        x={cx}
        y={cy + (isHigh ? -15 : 23)}
        text-anchor="middle"
        font-size="11"
        font-weight="500"
      >
        {formatTime(new Date(ev.time))}
      </text>
    {/each}

    {#if now && now.getTime() >= dayStart.getTime() && now.getTime() < dayEnd.getTime()}
      {@const nx = xOf(now)}
      <line
        x1={nx}
        x2={nx}
        y1={6}
        y2={H - BOTTOM_RESERVE + 4}
        stroke="var(--muted)"
        stroke-width="1"
        stroke-dasharray="2 3"
        opacity="0.6"
      />
    {/if}

    {#each [0, 6, 12, 18, 24] as hr}
      <text
        class="hour-label"
        x={xOf(new Date(dayStart.getTime() + hr * 3600 * 1000))}
        y={H - 8}
        text-anchor="middle"
        font-size="10"
        fill="var(--muted)"
      >
        {hr === 24 ? '24h' : `${String(hr).padStart(2, '0')}h`}
      </text>
    {/each}
  </svg>

  <div class="amplitude" aria-label={`Amplitude: ${pctRounded}% do máximo ${labelKind}`}>
    <div class="amplitude-bar">
      <div class="amplitude-fill" style="width: {pctRounded}%"></div>
    </div>
    <span class="amplitude-label">Amplitude: {pctRounded}% do máximo {labelKind}</span>
  </div>
</article>

<style>
  .card {
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 0;
    padding: 10px 14px;
    margin-bottom: 12px;
  }
  .card.today {
    padding: 14px 16px;
    border-color: var(--text);
  }
  .card-label {
    margin-bottom: 4px;
    font-size: 0.9rem;
    font-family: var(--font-mono);
  }
  .chip {
    display: inline-block;
    padding: 2px 8px;
    background: var(--accent);
    color: var(--bg);
    font-size: 0.75rem;
    font-weight: 500;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    font-family: var(--font-mono);
  }
  .muted { color: var(--muted); }
  .chart {
    width: 100%;
    height: auto;
    display: block;
  }
  /* Mono on tide-pill labels and hour labels so the 00h48 / 06h format
     gets the column-aligned monospaced look. */
  .chart :global(.tide-pill-label) {
    font-family: var(--font-mono);
    fill: var(--bg);
  }
  .chart :global(.hour-label) {
    font-family: var(--font-mono);
  }
  .amplitude {
    margin-top: 8px;
  }
  .amplitude-bar {
    height: 4px;
    background: var(--border);
    overflow: hidden;
  }
  .amplitude-fill {
    height: 100%;
    background: var(--accent);
  }
  .amplitude-label {
    display: block;
    margin-top: 4px;
    font-size: 0.75rem;
    color: var(--muted);
    font-family: var(--font-mono);
  }
</style>
