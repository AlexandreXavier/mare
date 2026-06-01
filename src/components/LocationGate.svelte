<script lang="ts">
  let busy = $state(false);

  const handleLocate = () => {
    if (busy) return;
    busy = true;
    document.dispatchEvent(new CustomEvent('mare:locate'));
  };

  const handleDecline = () => {
    document.dispatchEvent(new CustomEvent('mare:decline'));
  };
</script>

<section class="location-gate" aria-labelledby="gate-title">
  <h2 id="gate-title">Onde está?</h2>
  <p class="muted">
    MARÉ usa a sua localização para mostrar o porto mais próximo. As coordenadas
    nunca saem do dispositivo.
  </p>
  <div class="gate-actions">
    <button
      type="button"
      class="primary"
      onclick={handleLocate}
      disabled={busy}
      data-gate-locate
    >
      {busy ? 'A localizar…' : 'Localizar-me'}
    </button>
    <button
      type="button"
      class="secondary"
      onclick={handleDecline}
      data-gate-decline
    >
      Ver lista de portos
    </button>
  </div>
</section>

<style>
  .location-gate {
    background: transparent;
    border: 1px solid var(--text);
    border-radius: 0;
    padding: 20px 16px;
    text-align: left;
    margin-bottom: 16px;
  }

  .location-gate h2 {
    margin: 0 0 8px;
    font-size: 1.125rem;
    font-weight: 600;
    font-family: var(--font-sans);
  }

  .location-gate p {
    margin: 0 0 16px;
    font-size: 0.9375rem;
    line-height: 1.5;
    color: var(--muted);
  }

  .gate-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .gate-actions button {
    padding: 10px 16px;
    border-radius: 0;
    font-size: 1rem;
    font-family: var(--font-sans);
    cursor: pointer;
    border: 1px solid var(--text);
    background: transparent;
    color: var(--text);
    transition: color 120ms ease, border-color 120ms ease, background 120ms ease;
  }

  .gate-actions button:hover {
    color: var(--accent);
    border-color: var(--accent);
  }

  .gate-actions .primary {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--bg);
  }

  .gate-actions .primary:hover {
    background: transparent;
    color: var(--accent);
  }

  .gate-actions .primary:disabled {
    opacity: 0.6;
    cursor: progress;
  }

  .gate-actions .secondary {
    color: var(--muted);
    border-color: var(--border);
  }
</style>
