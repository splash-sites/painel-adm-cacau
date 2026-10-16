import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, type Browser, type BrowserContext, type Locator, type Page } from '@playwright/test'
import { BRASA_SLUG } from './brasa-seed'

const HERE = dirname(fileURLToPath(import.meta.url))
export const PRINTS_DIR = resolve(HERE, '../../../prestio-lp/ajuda-insumos/prints')
const MANIFEST = resolve(PRINTS_DIR, '../prints-manifest.json')
export const PAINEL = 'http://localhost:5180'
export const CARDAPIO = `http://localhost:5181/${BRASA_SLUG}`
export const BRAND = '#B5541F'

export const VIEWPORT = {
  celular: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  computador: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 },
}

interface Entry { file: string; tutorial: string; passo: number; descricao: string; tela: string }

function readManifest(): Entry[] {
  return existsSync(MANIFEST) ? (JSON.parse(readFileSync(MANIFEST, 'utf8')) as Entry[]) : []
}

/**
 * Tira o print do passo: [tutorial]-[NN]-[descricao].png. Com `alvo`, contorna o elemento
 * que a pessoa clica (3px na cor da marca) só durante a captura.
 */
export async function print(
  page: Page,
  tutorial: string,
  passo: number,
  descricao: string,
  opts: { alvo?: Locator; pagina?: boolean } = {},
) {
  mkdirSync(PRINTS_DIR, { recursive: true })
  const file = `${tutorial}-${String(passo).padStart(2, '0')}-${descricao}.png`
  await page.waitForTimeout(500)
  if (opts.alvo) {
    await opts.alvo.scrollIntoViewIfNeeded()
    await opts.alvo.evaluate((el, color) => {
      const node = el as HTMLElement
      node.dataset.ajudaOutline = node.style.outline
      node.style.outline = `3px solid ${color}`
      node.style.outlineOffset = '2px'
    }, BRAND)
  }
  await page.screenshot({ path: resolve(PRINTS_DIR, file), fullPage: opts.pagina ?? false, animations: 'disabled', caret: 'hide' })
  if (opts.alvo) {
    await opts.alvo.evaluate((el) => {
      const node = el as HTMLElement
      node.style.outline = node.dataset.ajudaOutline ?? ''
      node.style.outlineOffset = ''
    })
  }
  const vp = page.viewportSize()
  const entries = readManifest().filter((e) => e.file !== file)
  entries.push({ file, tutorial, passo, descricao, tela: vp && vp.width < 500 ? 'celular 390x844' : 'computador 1440x900' })
  mkdirSync(dirname(MANIFEST), { recursive: true })
  writeFileSync(MANIFEST, JSON.stringify(entries.sort((a, b) => a.file.localeCompare(b.file)), null, 2))
  return file
}

/** Contexto do painel com login feito (notificação liberada, pra não aparecer o aviso amarelo). */
export async function painelLogado(
  browser: Browser,
  conta: { email: string; password: string },
  tamanho: keyof typeof VIEWPORT,
  lojaAtiva?: string,
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ ...VIEWPORT[tamanho], permissions: ['notifications'], locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' })
  // navegador automático sempre nega notificação; nos prints a tela aparece como num computador já liberado
  await context.addInitScript(() => Object.defineProperty(Notification, 'permission', { get: () => 'granted' }))
  const page = await context.newPage()
  await page.goto(`${PAINEL}/login`)
  await page.getByLabel('E-mail').fill(conta.email)
  await page.getByLabel('Senha').fill(conta.password)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(`${PAINEL}/`, { timeout: 30_000 })
  if (lojaAtiva) {
    await page.evaluate((id) => localStorage.setItem('splash-active-store', JSON.stringify({ state: { activeStoreId: id }, version: 0 })), lojaAtiva)
    await page.reload()
  }
  await page.waitForTimeout(1500)
  return { context, page }
}

export async function cardapio(browser: Browser): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ ...VIEWPORT.celular, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' })
  return { context, page: await context.newPage() }
}
