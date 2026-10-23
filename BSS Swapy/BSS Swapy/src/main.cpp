/*
  ESP32 + INA219 + RFID-RC522 + LM35

  Librerías (Gestor de librerías del Arduino IDE):
    - Adafruit INA219
    - MFRC522 (de miguelbalboa)
    - PubSubClient (de knolleary)

  Envía las lecturas a la app Swapy por MQTT (broker público HiveMQ):
    <MQTT_BASE>/telemetry  {"busV","loadV","mA","mW","temp"}  cada segundo
    <MQTT_BASE>/rfid       {"uid":"A1:B2:C3:D4"}              al leer una tarjeta
    <MQTT_BASE>/status     "online" / "offline"               (retenido)
  La red WiFi va en include/secrets.h (copia secrets.example.h). Solo WiFi de 2.4 GHz.

  Conexiones asumidas (ajusta si las tuyas son distintas):
    INA219  : SDA -> GPIO21 | SCL -> GPIO22 | VCC -> 3V3 | GND -> GND
    RC522   : SDA(SS) -> GPIO5 | SCK -> GPIO18 | MOSI -> GPIO23
              MISO -> GPIO19 | RST -> GPIO4 | 3.3V -> 3V3 | GND -> GND
    LM35    : Vout -> GPIO32 (ADC1) | VCC -> 5V | GND -> GND
*/

#include <Wire.h>
#include <SPI.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <Adafruit_INA219.h>
#include <MFRC522.h>
#include "secrets.h"   // WIFI_SSID, WIFI_PASS

// ---------- Pines ----------
#define SS_PIN    5
#define RST_PIN   4
#define LM35_PIN  32   // ADC1, así no choca con WiFi

// ---------- MQTT ----------
// Debe coincidir con LIVE_SENSOR.TOPIC en src/data/mockData.js de la app
#define MQTT_HOST "broker.hivemq.com"
#define MQTT_PORT 1883
#define MQTT_BASE "swapy-5ebas2804/ST-CHA-01/L1"

// ---------- Objetos ----------
Adafruit_INA219 ina219;
MFRC522 rfid(SS_PIN, RST_PIN);
WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);

// ---------- Tiempos ----------
const unsigned long INTERVALO_MS = 1000;
unsigned long ultimaLectura = 0;
unsigned long ultimoIntentoMqtt = 0;

// ---------- WiFi + MQTT ----------
// Reintenta sin bloquear el loop: si no hay red, el monitor serial sigue funcionando.
void mantenerConexion() {
  if (WiFi.status() != WL_CONNECTED) return;  // el ESP32 reconecta el WiFi solo
  if (mqtt.connected()) {
    mqtt.loop();
    return;
  }
  if (millis() - ultimoIntentoMqtt < 3000) return;
  ultimoIntentoMqtt = millis();

  String clientId = "swapy-bss-" + WiFi.macAddress();
  Serial.print("MQTT: conectando a " MQTT_HOST "... ");
  // "última voluntad": si el ESP32 se desconecta, el broker publica "offline"
  if (mqtt.connect(clientId.c_str(), MQTT_BASE "/status", 0, true, "offline")) {
    Serial.println("OK");
    mqtt.publish(MQTT_BASE "/status", "online", true);
  } else {
    Serial.printf("falló (estado %d)\n", mqtt.state());
  }
}

// ---------- LM35 ----------
// Lee varias muestras y promedia (el ADC del ESP32 es ruidoso)
float leerTemperatura() {
  const int MUESTRAS = 30;
  uint32_t suma_mV = 0;
  for (int i = 0; i < MUESTRAS; i++) {
    suma_mV += analogReadMilliVolts(LM35_PIN);  // ya compensa la calibración de fábrica
    delay(2);
  }
  float mV = suma_mV / (float)MUESTRAS;
  return mV / 10.0;  // LM35: 10 mV por °C
}

// ---------- RFID ----------
void leerRFID() {
  if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) return;

  char uid[32] = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    sprintf(uid + strlen(uid), i ? ":%02X" : "%02X", rfid.uid.uidByte[i]);
  }
  Serial.printf("RFID UID: %s\n", uid);

  if (mqtt.connected()) {
    char json[64];
    snprintf(json, sizeof(json), "{\"uid\":\"%s\"}", uid);
    mqtt.publish(MQTT_BASE "/rfid", json);
  }

  rfid.PICC_HaltA();       // detiene la tarjeta
  rfid.PCD_StopCrypto1();  // termina la comunicación
}

void setup() {
  Serial.begin(115200);
  delay(500);

  // ADC
  analogSetPinAttenuation(LM35_PIN, ADC_11db);  // rango ~0-3.1V

  // INA219 (I2C por defecto: SDA=21, SCL=22)
  Wire.begin(21, 22);
  if (!ina219.begin()) {
    Serial.println("ERROR: no encuentro el INA219, revisa SDA/SCL/VCC");
  } else {
    Serial.println("INA219 OK");
  }

  // RC522 (SPI VSPI: SCK=18, MISO=19, MOSI=23)
  SPI.begin(18, 19, 23, SS_PIN);
  rfid.PCD_Init();
  delay(50);
  byte version = rfid.PCD_ReadRegister(MFRC522::VersionReg);
  if (version == 0x00 || version == 0xFF) {
    Serial.println("ERROR: no encuentro el RC522, revisa el cableado SPI");
  } else {
    Serial.print("RC522 OK, version 0x");
    Serial.println(version, HEX);
  }

  // WiFi (no bloquea: mantenerConexion() publica cuando haya red)
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.println("WiFi: conectando a " WIFI_SSID);
  mqtt.setServer(MQTT_HOST, MQTT_PORT);

  Serial.println("---- Listo ----");
}

void loop() {
  mantenerConexion();

  // El RFID se revisa en cada vuelta para no perder tarjetas
  leerRFID();

  // El resto se imprime cada INTERVALO_MS
  if (millis() - ultimaLectura >= INTERVALO_MS) {
    ultimaLectura = millis();

    float busV      = ina219.getBusVoltage_V();
    float shuntmV   = ina219.getShuntVoltage_mV();
    float corriente = ina219.getCurrent_mA();
    float potencia  = ina219.getPower_mW();
    float cargaV    = busV + (shuntmV / 1000.0);  // voltaje del lado de la fuente
    float temp      = leerTemperatura();

    Serial.println("=============================");
    Serial.printf("Voltaje bus   : %.2f V\n", busV);
    Serial.printf("Voltaje carga : %.2f V\n", cargaV);
    Serial.printf("Corriente     : %.1f mA\n", corriente);
    Serial.printf("Potencia      : %.1f mW\n", potencia);
    Serial.printf("Temperatura   : %.1f C\n", temp);

    if (mqtt.connected()) {
      char json[128];
      snprintf(json, sizeof(json),
               "{\"busV\":%.3f,\"loadV\":%.3f,\"mA\":%.1f,\"mW\":%.1f,\"temp\":%.1f}",
               busV, cargaV, corriente, potencia, temp);
      mqtt.publish(MQTT_BASE "/telemetry", json);
    } else {
      Serial.printf("(sin envío: WiFi %s, MQTT %s)\n",
                    WiFi.status() == WL_CONNECTED ? "OK" : "desconectado",
                    mqtt.connected() ? "OK" : "desconectado");
    }
  }
}
