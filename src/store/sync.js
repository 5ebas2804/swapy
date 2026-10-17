import { SHARED_KEYS, useSwapyStore } from './useSwapyStore'

// Sincroniza el estado entre pestañas del mismo navegador (BroadcastChannel), para que la
// demo funcione con el repartidor en una pestaña y el admin en otra.
// Solo una pestaña (la "líder", elegida con Web Locks) corre la telemetría; las demás
// reciben sus lecturas. Si la líder se cierra, otra toma el relevo automáticamente.
// No cruza dispositivos: para eso haría falta un backend real.

const pick = (state) => Object.fromEntries(SHARED_KEYS.map((k) => [k, state[k]]))

export function startSync() {
  const store = useSwapyStore
  const { startTelemetry, stopTelemetry } = store.getState()

  if (typeof BroadcastChannel === 'undefined' || !navigator.locks) {
    startTelemetry()
    return stopTelemetry
  }

  const channel = new BroadcastChannel('swapy-demo')
  let applyingRemote = false
  let isLeader = false
  let releaseLock = null
  const abort = new AbortController()

  // cambios locales → otras pestañas
  const unsubscribe = store.subscribe((state, prev) => {
    if (applyingRemote) return
    const patch = {}
    let changed = false
    for (const k of SHARED_KEYS) {
      if (state[k] !== prev[k]) {
        patch[k] = state[k]
        changed = true
      }
    }
    if (changed) channel.postMessage({ type: 'patch', patch })
  })

  // otras pestañas → estado local
  channel.onmessage = ({ data }) => {
    if (data.type === 'patch') {
      applyingRemote = true
      store.setState(data.patch)
      applyingRemote = false
    } else if (data.type === 'hello' && isLeader) {
      channel.postMessage({ type: 'patch', patch: pick(store.getState()) })
    }
  }

  // pestaña nueva: pide el estado actual a la líder
  channel.postMessage({ type: 'hello' })

  navigator.locks
    .request('swapy-telemetry', { signal: abort.signal }, () => {
      isLeader = true
      startTelemetry()
      return new Promise((resolve) => { releaseLock = resolve })
    })
    .catch(() => { /* abortado al desmontar antes de obtener el lock */ })

  return () => {
    abort.abort()
    releaseLock?.()
    stopTelemetry()
    unsubscribe()
    channel.close()
  }
}
