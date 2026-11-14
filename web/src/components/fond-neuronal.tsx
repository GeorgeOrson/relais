import * as React from "react"

// Fond discret : des neurones qui dérivent et se transmettent quelques influx.
// Désactivable dans la barre latérale ; absent si le système demande moins d'animations.
export function FondNeuronal() {
  const ref = React.useRef<HTMLCanvasElement>(null)

  React.useEffect(() => {
    const cv = ref.current!
    const c = cv.getContext("2d")!
    const COUL = ["#FF5B1F", "#FFB21F", "#FF2E88", "#C6FF3D"]
    const R = 150
    type N = { x: number; y: number; vx: number; vy: number; r: number; c: string; f: number }
    let w = 0, h = 0, N: N[] = [], P: { a: number; b: number; t: number; v: number }[] = [], V: number[][] = []
    let raf = 0

    const taille = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2)
      w = innerWidth
      h = innerHeight
      cv.width = w * dpr
      cv.height = h * dpr
      c.setTransform(dpr, 0, 0, dpr, 0, 0)
      N = Array.from({ length: Math.min(55, Math.round((w * h) / 26000)) }, () => ({
        x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.2, vy: (Math.random() - 0.5) * 0.2,
        r: 1 + Math.random() * 1.3, c: COUL[(Math.random() * COUL.length) | 0], f: 0,
      }))
      P = []
    }
    const pioche = <T,>(t: T[]) => t[(Math.random() * t.length) | 0]
    const image = () => {
      const sombre = document.documentElement.classList.contains("dark")
      const fort = sombre ? 1 : 0.55
      c.clearRect(0, 0, w, h)
      V = N.map(() => [])
      for (const n of N) {
        n.x += n.vx
        n.y += n.vy
        if (n.x < 0 || n.x > w) n.vx *= -1
        if (n.y < 0 || n.y > h) n.vy *= -1
      }
      c.lineWidth = 1
      for (let i = 0; i < N.length; i++)
        for (let j = i + 1; j < N.length; j++) {
          const a = N[i], b = N[j], d = Math.hypot(a.x - b.x, a.y - b.y)
          if (d > R) continue
          V[i].push(j)
          V[j].push(i)
          c.globalAlpha = (1 - d / R) * (0.12 + Math.max(a.f, b.f) * 0.35) * fort
          c.strokeStyle = a.c
          c.beginPath()
          c.moveTo(a.x, a.y)
          c.lineTo(b.x, b.y)
          c.stroke()
        }
      if (N.length && P.length < 8 && Math.random() < 0.05) {
        const a = (Math.random() * N.length) | 0
        if (V[a].length) P.push({ a, b: pioche(V[a]), t: 0, v: 0.01 + Math.random() * 0.01 })
      }
      for (let i = P.length - 1; i >= 0; i--) {
        const p = P[i], a = N[p.a], b = N[p.b]
        p.t += p.v
        if (p.t >= 1) {
          b.f = 1
          if (Math.random() < 0.6 && V[p.b].length) Object.assign(p, { a: p.b, b: pioche(V[p.b]), t: 0 })
          else P.splice(i, 1)
          continue
        }
        c.globalAlpha = fort
        c.fillStyle = sombre ? "#FFF6EC" : a.c
        c.beginPath()
        c.arc(a.x + (b.x - a.x) * p.t, a.y + (b.y - a.y) * p.t, 1.6, 0, 7)
        c.fill()
      }
      for (const n of N) {
        n.f *= 0.95
        c.globalAlpha = (0.3 + n.f * 0.6) * fort
        c.fillStyle = n.c
        c.beginPath()
        c.arc(n.x, n.y, n.r + n.f * 2, 0, 7)
        c.fill()
      }
      raf = requestAnimationFrame(image)
    }
    taille()
    raf = requestAnimationFrame(image)
    addEventListener("resize", taille)
    return () => {
      cancelAnimationFrame(raf)
      removeEventListener("resize", taille)
    }
  }, [])

  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 size-full" />
}
