# Alerta Precio Realizado Bitcoin

[English](README.md) · **Español**

Extensión de Chrome (Manifest V3) que avisa cuando el precio de Bitcoin está dentro de ±15% de su **precio realizado**.

## Qué hace

- Comprueba el precio de BTC cada minuto (Coinbase, con Binance como respaldo).
- Lo compara con la zona `precio realizado ± X%` (por defecto 15%).
- **Dentro de la zona:** el icono se pone verde con ✓, el badge muestra "ZONA" y aparece una notificación que no se cierra sola.
- **Fuera de la zona:** el icono se queda gris y el badge muestra la distancia al precio realizado (por ejemplo `+53%`). Opcionalmente avisa también al salir de la zona.
- El popup muestra precio, precio realizado, distancia, límites del rango y una barra con la zona verde.
- Solo avisa cuando cambia el estado, no en cada comprobación.

## Instalación

1. Clona o descarga este repositorio.
2. Abre `chrome://extensions` y activa el **Modo desarrollador**.
3. Pulsa **Cargar descomprimida** y selecciona la carpeta del repositorio (la que contiene `manifest.json`).
4. Fija el icono en la barra de herramientas para ver el color.

Para probar el aviso sin esperar al mercado, abre el popup > **Ajustes** y sube el rango (por ejemplo a 60%).

## Ajustes

Desde el popup:

- **Rango (±%)** alrededor del precio realizado.
- **Precio realizado manual** en USD (vacío = automático).
- **Avisar al salir de la zona**.

## Fuentes de datos

| Dato | Fuente |
| --- | --- |
| Precio actual | `api.coinbase.com` (respaldo: `api.binance.com`) |
| Precio realizado | `bitcoin-data.com` |

La API gratuita de bitcoin-data.com entrega el precio realizado con unos **7 días de retraso**. Al ser un indicador que se mueve despacio, el efecto es pequeño. El valor se cachea 6 horas por los límites de la API gratuita y, si la API falla, se usa el último valor guardado. También puedes fijar un valor manual en los ajustes.

## Archivos

- `manifest.json`: configuración y permisos de la extensión.
- `background.js`: service worker con la comprobación periódica, el icono y las notificaciones.
- `popup.html` / `popup.js`: interfaz del popup y ajustes.
- `icons/`: iconos de la extensión y de la notificación.

## Aviso

Herramienta informativa. No es asesoramiento financiero.
