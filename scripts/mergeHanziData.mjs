import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, basename } from 'node:path'

const SRC_DIR = join(import.meta.dirname, '..', 'public', 'hanzi-data')
const OUT_FILE = join(import.meta.dirname, '..', 'src', 'assets', 'hanziData.json')

const files = readdirSync(SRC_DIR).filter((f) => f.endsWith('.json'))
const merged = {}

for (const file of files) {
  const char = basename(file, '.json')
  const raw = readFileSync(join(SRC_DIR, file), 'utf-8')
  merged[char] = JSON.parse(raw)
}

writeFileSync(OUT_FILE, JSON.stringify(merged), 'utf-8')
console.log(`Merged ${files.length} characters into ${OUT_FILE}`)
