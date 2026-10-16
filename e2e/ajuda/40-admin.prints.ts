import { expect, test } from '@playwright/test'
import { ADMIN, prepararBrasa } from './brasa-seed'
import { PAINEL, painelLogado, print } from './shot'

// Prints do que só o administrador geral faz: relatórios, usuários, várias lojas,
// copiar catálogo e criar loja. Nada é gravado aqui: as janelas são abertas e fechadas.

test.describe.configure({ mode: 'serial' })

let storeId = ''
test.beforeAll(async ({ browser }) => {
  storeId = (await prepararBrasa(browser)).storeId
})

test('administrador geral: relatórios, usuários e lojas', async ({ browser }) => {
  const { context, page } = await painelLogado(browser, ADMIN, 'computador', storeId)

  await page.goto(`${PAINEL}/relatorios`)
  await page.getByRole('button', { name: '30 dias' }).click()
  await expect(page.getByText('Faturamento ao longo do tempo')).toBeVisible({ timeout: 20_000 })
  await page.waitForTimeout(2500)
  await print(page, 'admin-relatorios', 1, 'periodo-e-numeros', { alvo: page.getByRole('button', { name: '30 dias' }) })
  await print(page, 'admin-relatorios', 2, 'relatorio-completo', { pagina: true })
  await print(page, 'admin-relatorios', 3, 'exportar-planilha', { alvo: page.getByRole('button', { name: 'Exportar planilha' }) })

  await page.goto(`${PAINEL}/usuarios`)
  await page.waitForTimeout(1500)
  await print(page, 'admin-usuarios', 1, 'lista-de-usuarios', { alvo: page.getByRole('button', { name: 'Novo usuário' }) })
  await page.getByRole('button', { name: 'Novo usuário' }).click()
  await page.getByRole('dialog').getByLabel('Nome').fill('Marcos Antunes')
  await page.getByRole('dialog').getByLabel('E-mail').fill('marcos@brasaburger.teste')
  await print(page, 'admin-usuarios', 2, 'cadastrar-usuario', { alvo: page.getByRole('dialog').getByRole('button', { name: 'Cadastrar' }) })
  await page.keyboard.press('Escape')

  await page.goto(`${PAINEL}/`)
  await page.waitForTimeout(1500)
  const unidade = page.getByRole('button', { name: /Trocar unidade/ })
  await print(page, 'admin-varias-lojas', 1, 'seletor-de-unidade', { alvo: unidade })
  await unidade.click()
  await print(page, 'admin-varias-lojas', 2, 'escolher-a-loja')
  await page.keyboard.press('Escape')

  await page.goto(`${PAINEL}/produtos`)
  await page.waitForTimeout(1200)
  await page.getByRole('button', { name: 'Mais ações do catálogo' }).click()
  await print(page, 'admin-copiar-catalogo', 1, 'menu-copiar', { alvo: page.getByRole('menuitem', { name: /Copiar catálogo/ }) })
  await page.getByRole('menuitem', { name: /Copiar catálogo/ }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.waitForTimeout(800)
  await print(page, 'admin-copiar-catalogo', 2, 'escolher-loja-de-origem')
  await page.keyboard.press('Escape')

  await page.goto(`${PAINEL}/lojas/nova`)
  await page.waitForTimeout(1000)
  await page.getByLabel('Nome').fill('Brasa Burger Centro')
  await page.getByLabel('Slug').fill('brasa-burger-centro')
  await print(page, 'admin-criar-loja', 1, 'dados-da-loja-nova', { alvo: page.getByRole('button', { name: 'Salvar' }) })
  await context.close()
})
