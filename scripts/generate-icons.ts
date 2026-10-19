// Regenerates the raster icons from src/app/icon.svg.
// Run with `bun run icons` after changing the logo.
import sharp from 'sharp'
import { readFile, writeFile } from 'node:fs/promises'

const appDir = new URL('../src/app/', import.meta.url)
const svg = await readFile(new URL('icon.svg', appDir), 'utf8')

const png = (source: string, size: number) =>
  sharp(Buffer.from(source), { density: (72 * size) / 64 })
    .resize(size, size)
    .png()
    .toBuffer()

// iOS masks the corners itself, so the touch icon is a full-bleed square.
const fullBleed = svg.replace('rx="14"', 'rx="0"')
await writeFile(new URL('apple-icon.png', appDir), await png(fullBleed, 180))

// An .ico file is a small directory header followed by PNG images.
const sizes = [16, 32, 48]
const images = await Promise.all(sizes.map((size) => png(svg, size)))
const header = Buffer.alloc(6 + 16 * images.length)
header.writeUInt16LE(0, 0) // reserved
header.writeUInt16LE(1, 2) // type: icon
header.writeUInt16LE(images.length, 4)
let offset = header.length
images.forEach((image, i) => {
  const entry = 6 + 16 * i
  header.writeUInt8(sizes[i], entry) // width
  header.writeUInt8(sizes[i], entry + 1) // height
  header.writeUInt16LE(1, entry + 4) // color planes
  header.writeUInt16LE(32, entry + 6) // bits per pixel
  header.writeUInt32LE(image.length, entry + 8)
  header.writeUInt32LE(offset, entry + 12)
  offset += image.length
})
await writeFile(
  new URL('favicon.ico', appDir),
  Buffer.concat([header, ...images]),
)

console.log('Wrote apple-icon.png and favicon.ico')
