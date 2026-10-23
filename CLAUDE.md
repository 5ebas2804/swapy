# Swapy — prototipo PWA (Taller 2, 4.º semestre)

Sistema de intercambio rápido de baterías (BaaS) para repartidores en micro-movilidad eléctrica en Bogotá.
Es un **prototipo para exposición académica**: sin backend, sin autenticación real; todo es mock data en un store global.
El usuario prefiere explicaciones en español y paso a paso.

## Cómo correrlo
- En PowerShell, dentro de esta carpeta: `npm run dev` → http://localhost:5173/swapy/ (`--host` permite abrirlo en el celular en la misma Wi‑Fi).
- Desde el Bash de Claude Code, `npm run …` falla en esta máquina (shim `.cmd` de npm); usar la herramienta PowerShell.

## Stack
Vite 8 · React 19 · Tailwind 4 (`@tailwindcss/vite`, tokens en `src/index.css`) · Zustand 5 · React Router 7 · lucide-react · qrcode.react.

## Estructura
- `src/data/mockData.js` — cuentas Google simuladas, estaciones, baterías, reservas semilla, precios, umbrales de seguridad (`SAFETY`).
- `src/store/useSwapyStore.js` — todo el estado y acciones (sesión, billetera, reservas, intercambio, telemetría, fallas, bloqueos manuales).
- `src/store/sync.js` — sincroniza pestañas con BroadcastChannel; solo la pestaña líder (Web Locks) corre la telemetría. No cruza dispositivos.
- `src/store/liveSensor.js` — cliente MQTT (wss) que recibe las lecturas del ESP32 real; configuración en `LIVE_SENSOR` y `RFID_TAGS` de `mockData.js`.
- `BSS Swapy/BSS Swapy` — firmware PlatformIO del ESP32 (INA219 + LM35 + RC522). Publica a `broker.hivemq.com` en `swapy-5ebas2804/ST-CHA-01/L1/{telemetry,rfid,status}`. WiFi en `include/secrets.h` (ignorado por git). Compilar: `~/.platformio/penv/Scripts/pio.exe run`.
- `src/views/auth` — login simulado con Google → rol (repartidor/admin) → verificación (SMS/identidad o 2FA admin, código demo `246810`).
- `src/views/user` — estaciones + mapa, detalle con casilleros, reserva/QR, Mi batería, Billetera, Perfil.
- `src/views/admin` + `src/components/admin` — dashboard IoT, reservas activas, control del casillero, panel de demo, gráficas SVG.

## Decisiones tomadas
- Intercambio: $4.500 COP, se cobra al completar el cambio; reserva dura 15 min.
- Bloqueo automático: temperatura ≥ 60 °C o celda ≤ 3.0 V; responde en ~1.5 s (meta < 2 s).
- "Bloquear celda" se implementó de dos formas: bloquear casillero completo y aislar una celda de la batería.
- La sesión es por pestaña (sessionStorage); el resto del estado se comparte entre pestañas. F5 en la única pestaña reinicia la demo.
- Sensor real = batería SWP-B-0101 (Chapinero L1). Con lecturas recientes (< 5 s) usa voltaje/temperatura reales (SoC por curva OCV, 1 celda) y las reglas de bloqueo; sin lecturas vuelve a simulación. El panel de demo se desactiva para ese casillero mientras el sensor está en vivo.
- Despliegue: GitHub Pages (repo público) con `npm run deploy`; `HashRouter` + `base: '/swapy/'`.

## Ideas pendientes
- Service worker para que la PWA funcione sin conexión / instalable.
- Sincronización entre dispositivos (requeriría un servidor pequeño).
