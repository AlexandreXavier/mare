<script lang="ts">
  import type { TideEvent } from '~/lib/tides';
  import { nextEvent, stateAt } from '~/lib/tides';
  import { countdownText } from '~/lib/now';
  import { formatTime } from '~/lib/time';
  import DailyCard from './DailyCard.svelte';

  interface CardSpec {
    date: string;
    events: TideEvent[];
    isToday: boolean;
  }

  interface Props {
    cards: CardSpec[];
  }

  let { cards }: Props = $props();

  let now = $state(new Date());

  const allEvents = $derived.by(() => {
    const seen = new Set<string>();
    const out: TideEvent[] = [];
    for (const c of cards) {
      for (const e of c.events) {
        if (!seen.has(e.time)) {
          seen.add(e.time);
          out.push(e);
        }
      }
    }
    return out;
  });

  const callout = $derived.by(() => {
    const next = nextEvent(now, allEvents);
    const state = stateAt(now, allEvents);
    if (!next || !state) return null;
    return {
      direction: state === 'rising' ? 'Maré a subir' : 'Maré a descer',
      eventName: next.type === 'high' ? 'preia-mar' : 'baixa-mar',
      time: formatTime(new Date(next.time)),
      countdown: countdownText(now, new Date(next.time)),
    };
  });

  $effect(() => {
    const interval = setInterval(() => {
      now = new Date();
    }, 60_000);
    const handler = () => {
      if (document.visibilityState === 'visible') now = new Date();
    };
    document.addEventListener('visibilitychange', handler);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handler);
    };
  });
</script>

<div class="forecast">
  {#if callout}
    <p class="callout">
      <span class="direction">{callout.direction}</span>
      <span class="sep">·</span>
      <span>Próxima {callout.eventName}: {callout.time} ({callout.countdown})</span>
    </p>
  {/if}

  {#each cards as card (card.date)}
    {#if card.isToday}
      <DailyCard date={card.date} events={card.events} isToday {now} />
    {:else}
      <DailyCard date={card.date} events={card.events} isToday={false} />
    {/if}
  {/each}
</div>

<style>
  .forecast {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .callout {
    margin: 0 0 4px;
    padding: 10px 14px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    font-size: 0.95rem;
    line-height: 1.3;
  }
  .callout .direction {
    font-weight: 600;
  }
  .callout .sep {
    margin: 0 6px;
    color: var(--muted);
  }
</style>
