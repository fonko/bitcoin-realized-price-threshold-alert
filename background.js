// Alerta Precio Realizado Bitcoin — service worker (MV3)

const DEFAULTS = { rangePct: 15, manualRealized: null, notifyOnExit: true };
const PRICE_ALARM = 'btc-price-check';
const REALIZED_TTL_MS = 6 * 60 * 60 * 1000; // el precio realizado cambia lento; la API gratuita tiene límite de peticiones

const COLORS = {
  in: '#16a34a',      // dentro del rango: verde
  above: '#6b7280',   // por encima del rango: gris
  below: '#6b7280',   // por debajo del rango: gris
  unknown: '#374151'
};

async function getSettings() {
  const { settings } = await chrome.storage.local.get('settings');
  return { ...DEFAULTS, ...(settings || {}) };
}

async function fetchJson(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.json();
}

async function fetchPrice() {
  try {
    const j = await fetchJson('https://api.coinbase.com/v2/prices/BTC-USD/spot');
    const p = parseFloat(j.data.amount);
    if (p > 0) return p;
  } catch (_) { /* fallback */ }
  const j = await fetchJson('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
  const p = parseFloat(j.price);
  if (!(p > 0)) throw new Error('Precio inválido');
  return p;
}

// Devuelve { value, date, fetchedAt }. Usa caché y, si la API falla, el último valor conocido.
async function getRealizedPrice(force = false) {
  const { realized } = await chrome.storage.local.get('realized');
  if (!force && realized && Date.now() - realized.fetchedAt < REALIZED_TTL_MS) return realized;
  try {
    const j = await fetchJson('https://bitcoin-data.com/v1/realized-price/last');
    const value = parseFloat(j.realizedPrice);
    if (!(value > 0)) throw new Error(j.message || 'Respuesta sin realizedPrice');
    const fresh = { value, date: j.d, fetchedAt: Date.now() };
    await chrome.storage.local.set({ realized: fresh });
    return fresh;
  } catch (err) {
    if (realized) return { ...realized, stale: true, error: String(err.message || err) };
    throw err;
  }
}

function computeStatus(price, realized, rangePct) {
  const lower = realized * (1 - rangePct / 100);
  const upper = realized * (1 + rangePct / 100);
  const diffPct = (price / realized - 1) * 100;
  const status = price >= lower && price <= upper ? 'in' : price > upper ? 'above' : 'below';
  return { lower, upper, diffPct, status };
}

function drawIcon(size, color, glyph) {
  const c = new OffscreenCanvas(size, size);
  const ctx = c.getContext('2d');
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${Math.round(size * 0.68)}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(glyph, size / 2, size / 2 + size * 0.04);
  return ctx.getImageData(0, 0, size, size);
}

async function applyActionUi(status, diffPct) {
  const color = COLORS[status] || COLORS.unknown;
  const glyph = status === 'in' ? '✓' : status === 'unknown' ? '?' : 'B';
  await chrome.action.setIcon({ imageData: { 16: drawIcon(16, color, glyph), 32: drawIcon(32, color, glyph) } });

  let text = '';
  if (status === 'in') text = 'ZONA';
  else if (status !== 'unknown' && Number.isFinite(diffPct)) text = `${diffPct > 0 ? '+' : ''}${Math.round(diffPct)}%`;
  await chrome.action.setBadgeText({ text });
  await chrome.action.setBadgeBackgroundColor({ color });
  try { await chrome.action.setBadgeTextColor({ color: '#ffffff' }); } catch (_) {}
}

const usd = (n) => '$' + Math.round(n).toLocaleString('en-US');

async function notify(id, title, message, sticky) {
  chrome.notifications.create(id, {
    type: 'basic',
    iconUrl: 'icons/icon-green128.png',
    title,
    message,
    priority: 2,
    requireInteraction: sticky
  });
}

async function update({ forceRealized = false } = {}) {
  const settings = await getSettings();
  const { state: prev } = await chrome.storage.local.get('state');
  const state = { updatedAt: Date.now(), rangePct: settings.rangePct };

  try {
    state.price = await fetchPrice();
  } catch (err) {
    state.error = 'No se pudo obtener el precio actual: ' + (err.message || err);
  }

  try {
    if (settings.manualRealized > 0) {
      state.realized = settings.manualRealized;
      state.realizedSource = 'manual';
    } else {
      const r = await getRealizedPrice(forceRealized);
      state.realized = r.value;
      state.realizedDate = r.date;
      state.realizedSource = 'bitcoin-data.com';
      if (r.stale) state.error = 'Precio realizado en caché (la API falló): ' + r.error;
    }
  } catch (err) {
    state.error = (state.error ? state.error + ' | ' : '') + 'No se pudo obtener el precio realizado: ' + (err.message || err);
  }

  if (state.price && state.realized) {
    Object.assign(state, computeStatus(state.price, state.realized, settings.rangePct));
  } else {
    // sin datos nuevos: conserva lo último conocido
    state.price = state.price ?? prev?.price;
    state.realized = state.realized ?? prev?.realized;
    if (state.price && state.realized) Object.assign(state, computeStatus(state.price, state.realized, settings.rangePct));
    else state.status = 'unknown';
  }

  await chrome.storage.local.set({ state });
  await applyActionUi(state.status, state.diffPct);
  await chrome.action.setTitle({
    title: state.status === 'unknown'
      ? 'Precio realizado BTC: sin datos'
      : `BTC ${usd(state.price)} | Realizado ${usd(state.realized)} (${state.diffPct >= 0 ? '+' : ''}${state.diffPct.toFixed(1)}%)`
  });

  // Alertas solo cuando cambia el estado
  if (state.status !== 'unknown' && prev?.status !== state.status) {
    if (state.status === 'in') {
      notify('btc-in-range',
        '🟢 Bitcoin está en la zona del precio realizado',
        `BTC ${usd(state.price)} está a ${state.diffPct >= 0 ? '+' : ''}${state.diffPct.toFixed(1)}% del precio realizado (${usd(state.realized)}). Rango ±${settings.rangePct}%: ${usd(state.lower)} – ${usd(state.upper)}.`,
        true);
    } else if (prev?.status === 'in' && settings.notifyOnExit) {
      notify('btc-out-range',
        'Bitcoin salió de la zona del precio realizado',
        `BTC ${usd(state.price)} (${state.diffPct >= 0 ? '+' : ''}${state.diffPct.toFixed(1)}% vs. realizado ${usd(state.realized)}).`,
        false);
    }
  }
}

function ensureAlarm() {
  chrome.alarms.create(PRICE_ALARM, { periodInMinutes: 1 });
}

chrome.runtime.onInstalled.addListener(() => { ensureAlarm(); update({ forceRealized: true }); });
chrome.runtime.onStartup.addListener(() => { ensureAlarm(); update(); });
chrome.alarms.onAlarm.addListener((a) => { if (a.name === PRICE_ALARM) update(); });
chrome.notifications.onClicked.addListener((id) => {
  chrome.notifications.clear(id);
  chrome.tabs.create({ url: 'https://charts.bitbo.io/realized-price/' });
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'refresh') {
    update({ forceRealized: !!msg.forceRealized }).then(() => sendResponse({ ok: true }));
    return true; // respuesta asíncrona
  }
});
