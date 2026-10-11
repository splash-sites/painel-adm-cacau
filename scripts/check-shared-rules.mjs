// Confere se o bloco "Regras compartilhadas" do CLAUDE.md deste repo e identico
// ao do repo irmao (cacau-cardapio), clonado ao lado (../cacau-cardapio).
// Uso: node scripts/check-shared-rules.mjs  -> sai com codigo 1 se divergir.
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sibling = resolve(root, '..', 'cacau-cardapio')
const START = '<!-- REGRAS-COMPARTILHADAS:INICIO -->'
const END = '<!-- REGRAS-COMPARTILHADAS:FIM -->'

function extractBlock(file) {
  const text = readFileSync(file, 'utf8').replace(/\r\n/g, '\n')
  const start = text.indexOf(START)
  const end = text.indexOf(END)
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`Bloco de regras compartilhadas nao encontrado em ${file}`)
  }
  return text.slice(start, end + END.length)
}

const mine = extractBlock(resolve(root, 'CLAUDE.md'))
const siblingFile = resolve(sibling, 'CLAUDE.md')
if (!existsSync(siblingFile)) {
  console.warn(`Aviso: ${siblingFile} nao existe (clone o cacau-cardapio ao lado deste repo). Conferencia pulada.`)
  process.exit(0)
}
const theirs = extractBlock(siblingFile)
if (mine !== theirs) {
  const a = mine.split('\n')
  const b = theirs.split('\n')
  const line = a.findIndex((l, i) => l !== b[i])
  console.error('Regras compartilhadas DIVERGEM entre os dois CLAUDE.md.')
  console.error(`Primeira diferenca na linha ${line + 1} do bloco:`)
  console.error(`  este repo: ${a[line] ?? '(fim)'}`)
  console.error(`  cacau-cardapio: ${b[line] ?? '(fim)'}`)
  process.exit(1)
}
console.log('Regras compartilhadas identicas nos dois repos.')
