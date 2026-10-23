import mqtt from 'mqtt'
import { LIVE_SENSOR } from '../data/mockData'

// Puente con el ESP32 real: se suscribe al broker MQTT y guarda la última lectura.
// Cada dispositivo se conecta por su cuenta, así que los datos reales llegan también al celular.
// Solo la pestaña líder lo usa (ver sync.js); el resto recibe las baterías ya actualizadas.

let latest = null // { busV, loadV, mA, mW, temp, at }

// Última lectura si es reciente; null si el sensor no está enviando.
export const liveReading = (now) => (latest && now - latest.at <= LIVE_SENSOR.STALE_MS ? latest : null)

export function connectLiveSensor({ onRfid }) {
  const base = LIVE_SENSOR.TOPIC
  const client = mqtt.connect(LIVE_SENSOR.BROKER_URL, { reconnectPeriod: 3000, connectTimeout: 10000 })

  client.on('connect', () => client.subscribe([`${base}/telemetry`, `${base}/rfid`]))
  client.on('error', () => { /* el broker no responde: se reintenta solo */ })

  client.on('message', (topic, payload) => {
    let data
    try { data = JSON.parse(payload.toString()) } catch { return }

    if (topic === `${base}/telemetry`) {
      const reading = { busV: +data.busV, loadV: +data.loadV, mA: +data.mA, mW: +data.mW, temp: +data.temp }
      if (Object.values(reading).every(Number.isFinite)) latest = { ...reading, at: Date.now() }
    } else if (topic === `${base}/rfid` && data.uid) {
      onRfid(String(data.uid).toUpperCase())
    }
  })

  return () => {
    client.end(true)
    latest = null
  }
}
