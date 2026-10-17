import { useEffect, useRef, useState } from 'react'

// Paleta categórica (modo oscuro) validada para series adyacentes, en orden fijo.
export const SERIES_COLORS = ['#3987e5', '#d95926', '#199e70', '#c98500']
export const STATUS = { warning: '#fab219', critical: '#d03b3b', good: '#0ca30c' }

const WINDOW_MS = 30000
const M = { top: 12, right: 14, bottom: 22, left: 40 }

function useWidth() {
  const ref = useRef(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])
  return [ref, width]
}

/**
 * Gráfica de líneas de telemetría (últimos 30 s).
 * series: [{ label, color, get: (punto) => número }]
 * band: zona de operación normal { from, to, label }
 * thresholds: [{ value, label, color }]
 */
export default function TelemetryChart({ data, series, yMin, yMax, ticks: yTicks, unit, decimals = 1, band, thresholds = [], height = 190 }) {
  const [ref, width] = useWidth()
  const [hover, setHover] = useState(null)

  const W = Math.max(0, width - M.left - M.right)
  const H = height - M.top - M.bottom
  const tEnd = data.length ? data[data.length - 1].t : Date.now()
  const x = (t) => M.left + W - ((tEnd - t) / WINDOW_MS) * W
  const y = (v) => M.top + H - ((Math.min(Math.max(v, yMin), yMax) - yMin) / (yMax - yMin)) * H
  const ticks = yTicks ?? [0, 0.25, 0.5, 0.75, 1].map((f) => yMin + (yMax - yMin) * f)

  const onMove = (e) => {
    if (!data.length) return
    const px = e.clientX - e.currentTarget.getBoundingClientRect().left
    let best = 0
    for (let i = 1; i < data.length; i++) if (Math.abs(x(data[i].t) - px) < Math.abs(x(data[best].t) - px)) best = i
    setHover(best)
  }

  const hp = hover != null ? data[hover] : null

  return (
    <div ref={ref} className="relative w-full select-none" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} onMouseMove={onMove} onMouseLeave={() => setHover(null)} className="overflow-visible">
          {/* zona normal */}
          {band && (
            <>
              <rect x={M.left} width={W} y={y(band.to)} height={y(band.from) - y(band.to)} fill="#0ca30c" opacity="0.07" />
              <text x={M.left + 6} y={y(band.to) + 12} className="fill-slate-500 text-[10px]">{band.label}</text>
            </>
          )}
          {/* grilla y eje Y */}
          {ticks.map((v) => (
            <g key={v}>
              <line x1={M.left} x2={M.left + W} y1={y(v)} y2={y(v)} stroke="white" strokeOpacity="0.06" />
              <text x={M.left - 6} y={y(v) + 3} textAnchor="end" className="fill-slate-500 text-[10px] tabular-nums">
                {v.toFixed(decimals)}
              </text>
            </g>
          ))}
          {/* eje X */}
          {[30, 20, 10, 0].map((s) => (
            <text key={s} x={x(tEnd - s * 1000)} y={height - 6} textAnchor={s === 0 ? 'end' : 'middle'} className="fill-slate-500 text-[10px]">
              {s === 0 ? 'ahora' : `-${s}s`}
            </text>
          ))}
          {/* umbrales */}
          {thresholds.map((th) => (
            <g key={th.label}>
              <line x1={M.left} x2={M.left + W} y1={y(th.value)} y2={y(th.value)} stroke={th.color} strokeWidth="1" strokeDasharray="4 4" />
              <text x={M.left + W - 4} y={y(th.value) - 4} textAnchor="end" className="fill-slate-300 text-[10px] font-medium">
                {th.label}
              </text>
            </g>
          ))}
          {/* series */}
          {series.map((s) => (
            <polyline
              key={s.label}
              fill="none"
              stroke={s.color}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              points={data.map((p) => `${x(p.t)},${y(s.get(p))}`).join(' ')}
            />
          ))}
          {/* crosshair */}
          {hp && (
            <g>
              <line x1={x(hp.t)} x2={x(hp.t)} y1={M.top} y2={M.top + H} stroke="white" strokeOpacity="0.25" />
              {series.map((s) => (
                <circle key={s.label} cx={x(hp.t)} cy={y(s.get(hp))} r="4" fill={s.color} stroke="#0b1020" strokeWidth="2" />
              ))}
            </g>
          )}
          {/* área de captura del mouse */}
          <rect x={M.left} y={M.top} width={W} height={H} fill="transparent" />
        </svg>
      )}

      {hp && (
        <div
          className="pointer-events-none absolute top-1 z-10 min-w-32 rounded-lg border border-white/10 bg-ink-950/95 px-2.5 py-2 text-xs shadow-xl"
          style={x(hp.t) > width / 2 ? { right: width - x(hp.t) + 10 } : { left: x(hp.t) + 10 }}
        >
          <p className="mb-1 text-[10px] text-slate-500">-{((tEnd - hp.t) / 1000).toFixed(1)} s</p>
          {series.map((s) => (
            <p key={s.label} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="h-0.5 w-3 rounded" style={{ background: s.color }} /> {s.label}
              </span>
              <span className="font-mono text-slate-100">{s.get(hp).toFixed(decimals + 1)} {unit}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
