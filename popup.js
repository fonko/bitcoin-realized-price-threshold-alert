const $ = (id) => document.getElementById(id);
const usd = (n) => '$' + Math.round(n).toLocaleString('en-US');
const pctText = (n) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
const DEFAULTS = { rangePct: 15, manualRealized: null, notifyOnExit: true };

const GAUGE_MIN = -50, GAUGE_MAX = 100;
const toPos = (pct) => Math.min(100, Math.max(0, ((pct - GAUGE_MIN) / (GAUGE_MAX - GAUGE_MIN)) * 100));

function render(state, settings) {
  $('pct').textContent = settings.rangePct;
  $('foot').textContent = '';
  if (!state || state.status === 'unknown' || !state.price || !state.realized) {
    $('head').className = '';
    $('title').textContent = 'Sin datos todavía';
    $('subtitle').textContent = '';
    $('err').textContent = state?.error || '';
    return;
  }
  const inRange = state.status === 'in';
  $('head').className = inRange ? 'in' : '';
  $('title').textContent = inRange ? '🟢 Bitcoin está EN la zona del precio realizado' : state.status === 'above' ? 'Bitcoin por encima de la zona' : 'Bitcoin por debajo de la zona';
  $('subtitle').textContent = inRange ? `Dentro de ±${settings.rangePct}% del precio realizado` : `Fuera de ±${settings.rangePct}% del precio realizado`;

  $('price').textContent = usd(state.price);
  $('realized').textContent = usd(state.realized);
  $('diff').textContent = pctText(state.diffPct);
  $('band').textContent = `${usd(state.lower)} – ${usd(state.upper)}`;

  const zl = toPos(-settings.rangePct), zr = toPos(settings.rangePct);
  $('zone').style.left = zl + '%';
  $('zone').style.width = (zr - zl) + '%';
  $('realMark').style.left = toPos(0) + '%';
  $('dot').style.left = toPos(state.diffPct) + '%';
  $('dot').className = 'dot' + (inRange ? ' in' : '');

  $('err').textContent = state.error || '';
  const src = state.realizedSource === 'manual'
    ? 'Precio realizado: valor manual.'
    : `Precio realizado de bitcoin-data.com (dato del ${state.realizedDate}; la API gratuita lo entrega con ~7 días de retraso).`;
  $('foot').textContent = `${src} Actualizado ${new Date(state.updatedAt).toLocaleTimeString()}.`;
}

async function load() {
  const { state, settings } = await chrome.storage.local.get(['state', 'settings']);
  const s = { ...DEFAULTS, ...(settings || {}) };
  $('range').value = s.rangePct;
  $('manual').value = s.manualRealized || '';
  $('exit').checked = s.notifyOnExit;
  render(state, s);
}

$('save').addEventListener('click', async () => {
  const rangePct = Math.min(100, Math.max(1, parseFloat($('range').value) || DEFAULTS.rangePct));
  const manual = parseFloat($('manual').value);
  const settings = { rangePct, manualRealized: manual > 0 ? manual : null, notifyOnExit: $('exit').checked };
  await chrome.storage.local.set({ settings });
  $('save').textContent = 'Guardando…';
  await chrome.runtime.sendMessage({ type: 'refresh' });
  $('save').textContent = 'Guardado ✓';
  setTimeout(() => ($('save').textContent = 'Guardar'), 1200);
});

$('refresh').addEventListener('click', async () => {
  $('refresh').textContent = 'Actualizando…';
  await chrome.runtime.sendMessage({ type: 'refresh', forceRealized: true });
  $('refresh').textContent = 'Actualizar ahora';
});

chrome.storage.onChanged.addListener(load);
load();
