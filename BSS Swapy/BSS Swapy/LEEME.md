# BSS Swapy — firmware del casillero (ESP32)

Lee los sensores del casillero y los envía a la app Swapy por internet (MQTT).
Los datos aparecen en vivo en el casillero **L1 de Chapinero** de la app:
https://5ebas2804.github.io/swapy/

## Qué mide
| Sensor | Dato | Pines ESP32 |
|---|---|---|
| INA219 | voltaje, corriente, potencia | SDA 21 · SCL 22 · VCC 3V3 · GND |
| LM35 | temperatura | Vout 32 · VCC 5V · GND |
| RC522 | UID de tarjetas RFID | SDA(SS) 5 · SCK 18 · MOSI 23 · MISO 19 · RST 4 · 3.3V · GND |

Si tus pines son otros, cámbialos al inicio de `main.cpp` / `BSS_Swapy.ino`.

## 1. Pon tu WiFi
Edita `secrets.h` (en PlatformIO está en `include/`; si no existe, copia `secrets.example.h` con ese nombre):
```c
#define WIFI_SSID "nombre-de-tu-red"
#define WIFI_PASS "tu-contrasena"
```
- Tiene que ser **2.4 GHz** (el ESP32 no ve redes de 5 GHz).
- Lo más confiable es el **hotspot del celular**; las WiFi de universidad suelen bloquear al ESP32.

## 2a. Cargar con PlatformIO (VS Code)
1. *File → Open Folder* → esta carpeta (la que tiene `platformio.ini`).
2. Conecta el ESP32 por USB y pulsa **→ Upload** (barra azul de abajo). Las librerías se descargan solas.
3. Pulsa **🔌 Serial Monitor** (115200 baudios).

## 2b. Cargar con Arduino IDE
1. Abre `Arduino IDE/BSS_Swapy/BSS_Swapy.ino` (el `secrets.h` debe quedar en la misma carpeta).
2. Instala desde el *Gestor de librerías*: **Adafruit INA219**, **MFRC522** (miguelbalboa) y **PubSubClient** (knolleary).
3. Placa: **DOIT ESP32 DEVKIT V1** (requiere el paquete de placas *esp32* de Espressif). Elige el puerto y **Subir**.
4. Abre el *Monitor serie* a **115200**.

## 3. Comprobar
En el monitor serie debe salir:
```
INA219 OK
RC522 OK, version 0x92
---- Listo ----
MQTT: conectando a broker.hivemq.com... OK
=============================
Voltaje bus   : 3.91 V
...
```
Luego abre la app → entra como **Operaciones Swapy** (admin, código `246810`) → **Chapinero** → tarjeta **L1**.
Debe decir **"Sensor real · en vivo"** con tus lecturas. Al pasar una tarjeta RFID aparece en la **Bitácora IoT**.

> El casillero se bloquea solo con **≥ 60 °C** o **≤ 3.0 V** (con batería conectada).
> Para probarlo calienta **solo el LM35** (dedos, secador), nunca la batería de litio.

## Problemas comunes
| En el monitor ves… | Qué revisar |
|---|---|
| `sin envío: WiFi desconectado` | Nombre/clave en `secrets.h`, o la red es de 5 GHz |
| `MQTT … falló (estado -2)` | La red no tiene internet o bloquea el puerto 1883 → usa el hotspot |
| `ERROR: no encuentro el INA219` / `RC522` | Cableado de ese módulo |
| Temperatura en 0 °C o absurda | LM35: Vout al GPIO 32 y VCC a **5V** |
| Todo OK pero la app dice "simulado" | Recarga la app (F5) y espera ~5 s |

## Datos técnicos (MQTT)
Broker `broker.hivemq.com:1883`, temas bajo `swapy-5ebas2804/ST-CHA-01/L1/`:
- `telemetry` → `{"busV":3.912,"loadV":3.915,"mA":412.5,"mW":1614.0,"temp":25.3}` cada segundo
- `rfid` → `{"uid":"93:4F:1A:0C"}` al leer una tarjeta
- `status` → `online` / `offline` (retenido)

No cambies `MQTT_BASE` en el código: la app escucha exactamente esos temas.
