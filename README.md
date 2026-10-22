# Bitcoin Realized Price Alert

**English** · [Español](README.es.md)

A Chrome extension (Manifest V3) that alerts you when the Bitcoin price is within ±15% of its **realized price**.

## What it does

- Checks the BTC price every minute (Coinbase, with Binance as a fallback).
- Compares it with the zone `realized price ± X%` (15% by default).
- **Inside the zone:** the icon turns green with a ✓, the badge shows "ZONA", and a persistent notification appears.
- **Outside the zone:** the icon stays gray and the badge shows the distance to the realized price (for example `+53%`). It can optionally notify you when the price leaves the zone.
- The popup shows the price, realized price, distance, range limits and a bar with the green zone.
- It only alerts when the state changes, not on every check.

## Installation

1. Clone or download this repository.
2. Open `chrome://extensions` and enable **Developer mode**.
3. Click **Load unpacked** and select the repository folder (the one containing `manifest.json`).
4. Pin the icon to the toolbar to see its color.

To test the alert without waiting for the market, open the popup > **Settings** and widen the range (for example to 60%).

## Settings

From the popup:

- **Range (±%)** around the realized price.
- **Manual realized price** in USD (empty = automatic).
- **Notify when leaving the zone**.

## Data sources

| Data | Source |
| --- | --- |
| Current price | `api.coinbase.com` (fallback: `api.binance.com`) |
| Realized price | `bitcoin-data.com` |

The free bitcoin-data.com API delivers the realized price with about a **7-day delay**. Since it is a slow-moving indicator, the effect is small. The value is cached for 6 hours because of the free API's rate limits, and if the API fails the last saved value is used. You can also set a manual value in the settings.

## Files

- `manifest.json`: extension configuration and permissions.
- `background.js`: service worker with the periodic check, icon and notifications.
- `popup.html` / `popup.js`: popup interface and settings.
- `icons/`: extension and notification icons.

## Disclaimer

Informational tool only. This is not financial advice.
