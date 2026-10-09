// Battle effects: a particle canvas (sparks, slashes, bolts, glowing motes),
// screen shake, floating damage numbers and banners.

import { h, wait } from "./dom.js";

export function createFx(layer) {
  const canvas = h("canvas.fx-canvas", { width: 1280, height: 720 });
  layer.append(canvas);
  const g = canvas.getContext("2d");
  let parts = [];
  let strokes = [];
  let running = false;

  function loop() {
    g.clearRect(0, 0, 1280, 720);
    g.globalCompositeOperation = "lighter";
    for (const s of strokes) {
      s.life -= 1 / 60;
      const t = 1 - Math.max(0, s.life) / s.max;
      s.draw(g, t);
    }
    strokes = strokes.filter((s) => s.life > 0);
    for (const p of parts) {
      p.life -= 1 / 60;
      p.vy += p.gravity;
      p.vx *= p.drag;
      p.vy *= p.drag;
      if (p.swirl) {
        p.angle += p.swirl;
        p.x += Math.cos(p.angle) * 0.6;
      }
      if (p.target) {
        p.x += (p.target.x - p.x) * 0.09;
        p.y += (p.target.y - p.y) * 0.09;
      } else {
        p.x += p.vx;
        p.y += p.vy;
      }
      const a = Math.max(0, p.life / p.max);
      g.fillStyle = p.color;
      g.globalAlpha = a;
      g.beginPath();
      g.arc(p.x, p.y, p.size * (0.4 + 0.6 * a), 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = "source-over";
    parts = parts.filter((p) => p.life > 0);
    if (parts.length || strokes.length) requestAnimationFrame(loop);
    else {
      running = false;
      g.clearRect(0, 0, 1280, 720);
    }
  }

  const start = () => {
    if (!running) {
      running = true;
      requestAnimationFrame(loop);
    }
  };

  function add(p) {
    parts.push({ vx: 0, vy: 0, gravity: 0, drag: 0.96, size: 3, life: 0.6, color: "#fff", angle: Math.random() * 6.28, ...p, max: p.life || 0.6 });
    start();
  }

  return {
    burst(x, y, { color = "#fff", count = 26, speed = 7, size = 3.5, life = 0.55, gravity = 0.12 } = {}) {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const v = speed * (0.35 + Math.random() * 0.75);
        add({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.5, color, size: size * (0.6 + Math.random() * 0.8), life: life * (0.6 + Math.random() * 0.6), gravity });
      }
    },
    slash(x, y, color = "#bff4ff") {
      const r = 90;
      const rot = -0.6 + Math.random() * 0.3;
      strokes.push({
        life: 0.28,
        max: 0.28,
        draw(ctx, t) {
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(rot);
          ctx.strokeStyle = color;
          ctx.lineCap = "round";
          ctx.globalAlpha = 1 - t;
          ctx.lineWidth = 14 * (1 - t) + 2;
          ctx.shadowColor = color;
          ctx.shadowBlur = 24;
          ctx.beginPath();
          ctx.arc(0, 0, r, Math.PI * (1.1 + t * 0.2), Math.PI * (1.1 + 0.9 * Math.min(1, t * 2.4)));
          ctx.stroke();
          ctx.restore();
          ctx.globalAlpha = 1;
        },
      });
      start();
      this.burst(x, y, { color, count: 18, speed: 6 });
    },
    bolts(x1, y1, x2, y2, { color = "#ffb347", count = 6 } = {}) {
      for (let i = 0; i < count; i++) {
        const delay = i * 0.05;
        const oy = (Math.random() - 0.5) * 40;
        strokes.push({
          life: 0.32 + delay,
          max: 0.32 + delay,
          draw(ctx, t) {
            const total = 0.32 + delay;
            const local = (t * total - delay) / 0.32;
            if (local < 0 || local > 1) return;
            const hx = x1 + (x2 - x1) * local;
            const hy = y1 + oy + (y2 - y1 - oy) * local;
            ctx.strokeStyle = color;
            ctx.lineWidth = 4;
            ctx.shadowColor = color;
            ctx.shadowBlur = 16;
            ctx.beginPath();
            ctx.moveTo(hx + (x1 - x2) * 0.08, hy + (y1 - y2) * 0.08);
            ctx.lineTo(hx, hy);
            ctx.stroke();
          },
        });
      }
      start();
    },
    spell(x, y, color = "#c9a2ff") {
      for (let i = 0; i < 40; i++) {
        const a = (i / 40) * Math.PI * 2;
        add({ x: x + Math.cos(a) * 70, y: y + Math.sin(a) * 70, target: { x, y }, color, size: 4, life: 0.5 });
      }
      setTimeout(() => this.burst(x, y, { color, count: 40, speed: 9, size: 4.5 }), 320);
    },
    heal(x, y) {
      for (let i = 0; i < 30; i++) add({ x: x + (Math.random() - 0.5) * 80, y: y + Math.random() * 40, vy: -1.5 - Math.random() * 2, color: Math.random() < 0.5 ? "#7dffb0" : "#ffe58a", size: 3, life: 1, drag: 0.99 });
    },
    motes(x, y, { color = "#7dffe3", count = 60 } = {}) {
      for (let i = 0; i < count; i++) {
        add({ x: x + (Math.random() - 0.5) * 110, y: y - Math.random() * 150, vx: (Math.random() - 0.5) * 0.6, vy: -0.6 - Math.random() * 1.6, swirl: 0.08 + Math.random() * 0.06, color: Math.random() < 0.7 ? color : "#ffffff", size: 2.5 + Math.random() * 2.5, life: 1.4 + Math.random() * 0.9, drag: 0.995 });
      }
    },
    capture(x, y, tx, ty) {
      for (let i = 0; i < 70; i++) {
        add({ x: x + (Math.random() - 0.5) * 140, y: y - Math.random() * 160, target: { x: tx, y: ty }, color: i % 3 ? "#7dffe3" : "#ffd36b", size: 3, life: 0.9 + Math.random() * 0.4 });
      }
    },
    shake(el, power = 10, ms = 320) {
      el.animate(
        Array.from({ length: 8 }, (_, i) => ({ transform: `translate(${(Math.random() - 0.5) * power * (1 - i / 8)}px, ${(Math.random() - 0.5) * power * (1 - i / 8)}px)` })).concat([{ transform: "translate(0,0)" }]),
        { duration: ms },
      );
    },
  };
}

/** A floating number that rises and fades. kind: "dmg" | "crit" | "heal" | "miss". */
export function floatNumber(layer, x, y, text, kind = "dmg") {
  const el = h(`div.dmg${kind !== "dmg" ? "." + kind : ""}`, { style: { left: `${x}px`, top: `${y}px` } }, text);
  layer.append(el);
  el.animate(
    [
      { transform: "translate(-50%, -50%) scale(0.6)", opacity: 0 },
      { transform: "translate(-50%, -90%) scale(1.15)", opacity: 1, offset: 0.2 },
      { transform: "translate(-50%, -140%) scale(1)", opacity: 1, offset: 0.7 },
      { transform: "translate(-50%, -170%) scale(1)", opacity: 0 },
    ],
    { duration: 1100, easing: "ease-out" },
  ).onfinish = () => el.remove();
}

let bannerTimer = null;
/** A short banner across the top of the battle. */
export async function banner(layer, text, kind = "", ms = 1300) {
  layer.querySelectorAll(".banner").forEach((b) => b.remove());
  clearTimeout(bannerTimer);
  const el = h(`div.banner${kind ? "." + kind : ""}`, {}, text);
  layer.append(el);
  bannerTimer = setTimeout(() => el.remove(), ms);
  await wait(Math.min(ms, 700));
}
