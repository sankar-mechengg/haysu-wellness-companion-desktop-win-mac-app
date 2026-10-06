/** A tiny dependency-free confetti burst on a fixed, click-through canvas. */

const COLORS = ["#3b93f7", "#5cc99a", "#ff7b7b", "#f5b53f", "#c084fc", "#60b8ff"];

export function confetti(opts: { count?: number; origin?: { x: number; y: number } } = {}) {
  if (typeof document === "undefined") return;
  if (document.documentElement.classList.contains("no-anim")) return;
  const count = opts.count ?? 90;
  const canvas = document.createElement("canvas");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  Object.assign(canvas.style, {
    position: "fixed",
    inset: "0",
    pointerEvents: "none",
    zIndex: "9999",
  } as CSSStyleDeclaration);
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    canvas.remove();
    return;
  }
  const ox = opts.origin?.x ?? canvas.width / 2;
  const oy = opts.origin?.y ?? canvas.height * 0.35;
  const parts = Array.from({ length: count }, () => {
    const angle = Math.random() * Math.PI * 2;
    const speed = 4 + Math.random() * 7;
    return {
      x: ox,
      y: oy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 4,
      w: 6 + Math.random() * 6,
      h: 3 + Math.random() * 4,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      life: 1,
    };
  });
  const start = performance.now();
  const tick = (now: number) => {
    const t = (now - start) / 1000;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = 0;
    for (const p of parts) {
      p.vy += 0.18;
      p.vx *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.life = Math.max(0, 1 - t / 1.8);
      if (p.life <= 0 || p.y > canvas.height + 20) continue;
      alive++;
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    if (alive > 0 && t < 2.2) requestAnimationFrame(tick);
    else canvas.remove();
  };
  requestAnimationFrame(tick);
}

/** Fire at most once per day per key (persisted in localStorage). */
export function celebrateOnce(key: string, opts?: Parameters<typeof confetti>[0]) {
  const today = new Date().toISOString().slice(0, 10);
  const k = `haysu.celebrated.${key}`;
  try {
    if (localStorage.getItem(k) === today) return false;
    localStorage.setItem(k, today);
  } catch {
    // storage blocked: still celebrate, just not deduplicated
  }
  confetti(opts);
  return true;
}
