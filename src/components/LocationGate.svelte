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
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 20px 16px;
    text-align: center;
    margin-bottom: 16px;
  }

  .location-gate h2 {
    margin: 0 0 8px;
    font-size: 1.125rem;
    font-weight: 600;
  }

  .location-gate p {
    margin: 0 0 16px;
    font-size: 0.9375rem;
    line-height: 1.4;
  }

  .gate-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .gate-actions button {
    padding: 10px 16px;
    border-radius: 10px;
    font-size: 1rem;
    cursor: pointer;
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text);
  }

  .gate-actions .primary {
    background: var(--accent);
    border-color: var(--accent);
    color: white;
  }

  .gate-actions .primary:disabled {
    opacity: 0.6;
    cursor: progress;
  }

  .gate-actions .secondary {
    color: var(--muted);
  }
</style>
