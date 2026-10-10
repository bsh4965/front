// PWA·iPhone 홈 화면 아이콘(PNG)을 외부 도구 없이 만든다. 실행: npm run icons
// 모양: 둥근 사각형 배경 + 가운데 원(프로젝트)에서 세 갈래로 뻗는 가지(마인드맵).
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')
mkdirSync(out, { recursive: true })

const BG = [59, 91, 219] // #3B5BDB
const FG = [255, 255, 255]

/** 0~1 좌표계에서 점 (x, y)가 도형 안에 있는 정도(안티앨리어싱용 SDF). 음수면 안쪽. */
function sdf(x, y) {
  const circle = (cx, cy, r) => Math.hypot(x - cx, y - cy) - r
  const segment = (ax, ay, bx, by, w) => {
    const px = x - ax, py = y - ay, dx = bx - ax, dy = by - ay
    const t = Math.max(0, Math.min(1, (px * dx + py * dy) / (dx * dx + dy * dy)))
    return Math.hypot(px - dx * t, py - dy * t) - w
  }
  const c = [0.5, 0.52]
  const leaves = [[0.5, 0.2], [0.23, 0.72], [0.77, 0.72]]
  let d = circle(c[0], c[1], 0.11)
  for (const [lx, ly] of leaves) {
    d = Math.min(d, segment(c[0], c[1], lx, ly, 0.035), circle(lx, ly, 0.075))
  }
  return d
}

/** 둥근 사각형 배경(iOS가 다시 둥글게 자르므로 full-bleed로 둔다). */
function inBackground(x, y, rounded) {
  if (!rounded) return true
  const r = 0.22
  const qx = Math.max(Math.abs(x - 0.5) - (0.5 - r), 0)
  const qy = Math.max(Math.abs(y - 0.5) - (0.5 - r), 0)
  return Math.hypot(qx, qy) <= r
}

function render(size, { rounded }) {
  const raw = Buffer.alloc(size * (size * 4 + 1))
  const samples = 4
  for (let py = 0; py < size; py++) {
    raw[py * (size * 4 + 1)] = 0 // filter: none
    for (let px = 0; px < size; px++) {
      let fg = 0, bg = 0
      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const x = (px + (sx + 0.5) / samples) / size
          const y = (py + (sy + 0.5) / samples) / size
          if (!inBackground(x, y, rounded)) continue
          bg++
          if (sdf(x, y) <= 0) fg++
        }
      }
      const total = samples * samples
      const alpha = bg / total
      const mix = bg === 0 ? 0 : fg / bg
      const i = py * (size * 4 + 1) + 1 + px * 4
      for (let ch = 0; ch < 3; ch++) raw[i + ch] = Math.round(BG[ch] * (1 - mix) + FG[ch] * mix)
      raw[i + 3] = Math.round(alpha * 255)
    }
  }
  return png(size, size, raw)
}

function png(width, height, raw) {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    return c >>> 0
  })
  const crc = (buf) => {
    let c = 0xffffffff
    for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
    return (c ^ 0xffffffff) >>> 0
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
    const td = Buffer.concat([Buffer.from(type, 'ascii'), data])
    const c = Buffer.alloc(4); c.writeUInt32BE(crc(td))
    return Buffer.concat([len, td, c])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

writeFileSync(join(out, 'apple-touch-icon.png'), render(180, { rounded: false }))
writeFileSync(join(out, 'pwa-192.png'), render(192, { rounded: false }))
writeFileSync(join(out, 'pwa-512.png'), render(512, { rounded: false }))
console.log('icons written to', out)
