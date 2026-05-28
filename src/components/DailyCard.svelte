<script lang="ts">
  import { interpolateCurve, type TideEvent } from '~/lib/tides';
  import { formatTime, lisbonMidnight } from '~/lib/time';

  interface Props {
    date: string;
    events: TideEvent[];
    isToday: boolean;
    now?: Date | null;
  }

  let { date, events, isToday, now = null }: Props = $props();

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
  const H = isToday ? 180 : 120;
  const PAD_X = 20;
  const PAD_Y = isToday ? 36 : 24;

  const xOf = (t: Date) =>
    PAD_X + ((t.getTime() - dayStart.getTime()) / (dayEnd.getTime() - dayStart.getTime())) * (W - PAD_X * 2);
  const yOf = (h: number) => H - PAD_Y - ((h - minH) / range) * (H - PAD_Y * 1.5);

  const linePath = curve
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${xOf(p.t).toFixed(1)},${yOf(p.h).toFixed(1)}`)
    .join(' ');

  const fillPath =
    curve.length > 0
      ? `${linePath} L${(W - PAD_X).toFixed(1)},${(H - PAD_Y).toFixed(1)} L${PAD_X.toFixed(1)},${(H - PAD_Y).toFixed(1)} Z`
      : '';

  const weekdayLabel = new Intl.DateTimeFormat('pt-PT', {
    timeZone: 'Europe/Lisbon',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(`${date}T12:00:00Z`));
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
    <defs>
      <linearGradient id={`tide-fill-${date}`} x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="var(--tide-high)" stop-opacity="0.55" />
        <stop offset="100%" stop-color="var(--tide-high)" stop-opacity="0.05" />
      </linearGradient>
    </defs>

    {#if fillPath}
      <path d={fillPath} fill={`url(#tide-fill-${date})`} />
      <path d={linePath} fill="none" stroke="var(--tide-high)" stroke-width="2" stroke-linejoin="round" />
    {/if}

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
        rx="9"
        fill={isHigh ? 'var(--tide-high)' : 'var(--tide-low)'}
      />
      <text
        x={cx}
        y={cy + (isHigh ? -15 : 23)}
        text-anchor="middle"
        font-size="11"
        fill="#fff"
        font-weight="600"
      >
        {formatTime(new Date(ev.time))}
      </text>
    {/each}

    {#if now && now.getTime() >= dayStart.getTime() && now.getTime() < dayEnd.getTime()}
      {@const nx = xOf(now)}
      <line
        x1={nx}
        x2={nx}
        y1={PAD_Y * 0.4}
        y2={H - PAD_Y * 0.5}
        stroke="var(--muted)"
        stroke-width="1"
        stroke-dasharray="2 3"
        opacity="0.6"
      />
    {/if}

    {#each [0, 6, 12, 18, 24] as hr}
      <text
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
</article>

<style>
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 10px 14px;
  }
  .card.today {
    padding: 14px 16px;
  }
  .card-label {
    margin-bottom: 4px;
    font-size: 0.9rem;
  }
  .chip {
    display: inline-block;
    padding: 2px 10px;
    border-radius: 999px;
    background: var(--tide-high);
    color: #fff;
    font-size: 0.8rem;
    font-weight: 600;
  }
  .muted {
    color: var(--muted);
  }
  .chart {
    width: 100%;
    height: auto;
    display: block;
  }
</style>
