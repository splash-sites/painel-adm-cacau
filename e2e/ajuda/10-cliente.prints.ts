import { expect, test, type Page } from '@playwright/test'
import { CARDAPIO, cardapio, print } from './shot'

// Prints do cardápio (cliente final), em tela de celular. Os pedidos feitos aqui vão
// pra loja de teste Brasa Burger no staging.

const CLIENTE = { nome: 'Helena Vieira', cpf: '111.444.777-35', telefone: '51 9 9000-1234' }

async function abrirProduto(page: Page, nome: string) {
  const row = page.locator(`button[aria-label="Ver detalhes de ${nome}" i]`)
  for (let i = 0; i < 20 && !(await row.isVisible()); i++) await page.mouse.wheel(0, 500)
  return row
}

/** Clica no produto e espera a tela dele abrir (tenta de novo se o clique se perder). */
async function abrir(page: Page, row: ReturnType<Page['locator']>) {
  for (let i = 0; i < 3; i++) {
    await row.click()
    try {
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 4000 })
      return
    } catch {
      /* tenta de novo */
    }
  }
  throw new Error('A tela do produto não abriu')
}

/** Responde as etapas do produto escolhendo a primeira opção de cada variação. */
async function passarEtapas(page: Page) {
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await page.waitForTimeout(400)
  const continuar = dialog.getByRole('button', { name: 'Continuar' })
  while (await continuar.isVisible()) {
    const radio = dialog.getByRole('radiogroup').first().getByRole('radio').first()
    if ((await radio.count()) && (await radio.getAttribute('aria-checked')) === 'false') await radio.click()
    await continuar.click()
    await page.waitForTimeout(250)
  }
  await dialog.getByRole('button', { name: 'Adicionar ao pedido' }).click()
  await expect(dialog).toHaveCount(0)
}

test('cliente: pedir na mesa pelo QR Code', async ({ browser }) => {
  const { context, page } = await cardapio(browser)
  const T = 'cliente-pedir-na-mesa'
  await page.goto(`${CARDAPIO}/mesa/7`)
  await print(page, T, 1, 'boas-vindas-da-mesa', { alvo: page.getByRole('button', { name: 'Ver o cardápio' }) })
  await page.getByRole('button', { name: 'Ver o cardápio' }).click()
  await page.waitForURL('**/cardapio')
  await page.waitForTimeout(1500)
  const produto = await abrirProduto(page, 'Brasa Clássico')
  await print(page, T, 2, 'escolher-produto', { alvo: produto })
  await abrir(page, produto)
  await passarEtapas(page)
  await print(page, T, 3, 'ver-sacola', { alvo: page.getByRole('button', { name: /Ver sacola/ }) })
  await page.getByRole('button', { name: /Ver sacola/ }).click()
  await print(page, T, 4, 'sacola', { alvo: page.getByRole('button', { name: 'Continuar' }) })
  await page.getByRole('button', { name: 'Continuar' }).click()
  await page.getByLabel('Nome completo').fill(CLIENTE.nome)
  await page.getByLabel('CPF').fill(CLIENTE.cpf)
  await print(page, T, 5, 'seus-dados', { alvo: page.getByRole('button', { name: 'Continuar' }) })
  await page.getByRole('button', { name: 'Continuar' }).click()
  await page.waitForURL('**/revisao')
  await print(page, T, 6, 'confirmar', { alvo: page.getByRole('button', { name: 'Confirmar pedido' }) })
  await page.getByRole('button', { name: 'Confirmar pedido' }).click()
  await expect(page.getByRole('heading', { name: 'Pedido enviado!' })).toBeVisible({ timeout: 20_000 })
  await page.waitForTimeout(1500)
  await print(page, T, 7, 'pedido-enviado')
  await print(page, 'cliente-acompanhar-pedido', 1, 'linha-do-tempo')

  // Meus pedidos: o CPF ficou salvo neste celular
  await page.goto(`${CARDAPIO}/pedidos`)
  await page.waitForTimeout(1500)
  await print(page, 'cliente-meus-pedidos', 3, 'lista-de-hoje', { alvo: page.getByRole('tab', { name: 'Histórico' }) })
  await context.close()
})

test('cliente: escolher tamanho, ponto e adicionais', async ({ browser }) => {
  const { context, page } = await cardapio(browser)
  const T = 'cliente-escolher-opcoes'
  await page.goto(CARDAPIO)
  await page.getByRole('button', { name: /Pedir na cafeteria/ }).click()
  await page.waitForURL('**/cardapio')
  await page.waitForTimeout(1200)
  const produto = await abrirProduto(page, 'Brasa Bacon')
  await abrir(page, produto)
  const dialog = page.getByRole('dialog')
  await print(page, T, 1, 'primeira-etapa', { alvo: dialog.getByRole('radio', { name: /Ao ponto/ }) })
  await dialog.getByRole('radio', { name: /Ao ponto/ }).click()
  await print(page, T, 2, 'opcao-escolhida', { alvo: dialog.getByRole('button', { name: 'Continuar' }) })
  await dialog.getByRole('button', { name: 'Continuar' }).click()
  await dialog.getByRole('checkbox', { name: /Cheddar extra/ }).click()
  await print(page, T, 3, 'adicionais', { alvo: dialog.getByRole('checkbox', { name: /Cheddar extra/ }) })
  await dialog.getByRole('button', { name: 'Continuar' }).click()
  await dialog.getByRole('checkbox', { name: /Barbecue/ }).click()
  await dialog.getByRole('button', { name: 'Aumentar quantidade' }).click()
  await dialog.getByRole('button', { name: 'Adicionar observação' }).click()
  await dialog.getByLabel('Observação').fill('Sem cebola')
  await print(page, T, 4, 'quantidade-e-observacao', { alvo: dialog.getByRole('button', { name: 'Adicionar ao pedido' }) })
  await dialog.getByRole('button', { name: 'Adicionar ao pedido' }).click()
  await page.waitForTimeout(600)
  await print(page, T, 5, 'item-na-sacola', { alvo: page.getByRole('button', { name: /Ver sacola/ }) })

  // preço de clube: aparece do lado do preço normal em toda a lista
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(400)
  await print(page, 'cliente-preco-de-clube', 1, 'lista-com-preco-de-clube')
  await context.close()
})

test('cliente: comprar um combo da promoção', async ({ browser }) => {
  const { context, page } = await cardapio(browser)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const T = 'cliente-promocao-combo'
  await page.goto(CARDAPIO)
  await page.getByRole('button', { name: /Pedir para levar/ }).click()
  await page.waitForURL('**/cardapio')
  await page.waitForTimeout(1500)
  const slide = page.locator(`div[role="button"][aria-label="Ver detalhes de Brasa Clássico" i]`)
  await print(page, T, 1, 'carrossel-de-promocoes', { alvo: slide })
  await slide.click()
  const dialog = page.getByRole('dialog', { name: 'Combo Brasa' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText('Carregando opções…')).toHaveCount(0)
  await print(page, T, 2, 'escolhas-do-combo')
  await dialog.getByRole('radio', { name: /Ao ponto/ }).first().click()
  await dialog.getByRole('radio', { name: /Média/ }).first().click()
  await print(page, T, 3, 'adicionar-combo', { alvo: dialog.getByRole('button', { name: 'Adicionar combo' }) })
  await dialog.getByRole('button', { name: 'Adicionar combo' }).click()
  await page.getByRole('button', { name: /Ver sacola/ }).click()
  await print(page, T, 4, 'combo-na-sacola')
  await context.close()
})

test('cliente: pedir para entregar e avisar pelo WhatsApp', async ({ browser }) => {
  const { context, page } = await cardapio(browser)
  const T = 'cliente-pedir-para-levar-ou-entregar'
  await page.goto(CARDAPIO)
  await print(page, T, 1, 'entrada-da-loja', { alvo: page.getByRole('button', { name: /Pedir para levar/ }) })
  await page.getByRole('button', { name: /Pedir para levar/ }).click()
  await page.waitForURL('**/cardapio')
  await page.waitForTimeout(1200)
  await abrir(page, await abrirProduto(page, 'Duplo Cheddar'))
  await passarEtapas(page)
  await page.getByRole('button', { name: /Ver sacola/ }).click()
  await page.getByRole('button', { name: 'Continuar' }).click()
  const toggle = page.getByRole('radiogroup', { name: 'Retirar ou receber' })
  await print(page, T, 2, 'retirar-ou-receber', { alvo: toggle })
  await toggle.getByRole('radio', { name: 'Receber em casa' }).click()
  await page.getByLabel('Nome completo').fill(CLIENTE.nome)
  await page.getByLabel('CPF').fill(CLIENTE.cpf)
  await page.getByLabel('Telefone').fill(CLIENTE.telefone)
  await page.getByLabel('Rua').fill('Rua das Gaivotas')
  await page.getByLabel('Número').fill('250')
  await page.getByLabel('Bairro').fill('Praia Grande')
  await page.getByLabel('Cidade').fill('Torres')
  await page.getByLabel('UF').fill('RS')
  await page.getByLabel('CEP').fill('95560000')
  await print(page, T, 3, 'endereco-de-entrega', { pagina: true })
  await page.getByRole('button', { name: 'Continuar' }).click()
  await page.waitForURL('**/revisao')
  await print(page, T, 4, 'confirmar-entrega', { alvo: page.getByRole('button', { name: 'Confirmar pedido' }) })
  await page.getByRole('button', { name: 'Confirmar pedido' }).click()
  await expect(page.getByRole('heading', { name: 'Pedido enviado!' })).toBeVisible({ timeout: 20_000 })
  await page.waitForTimeout(1200)
  await print(page, 'cliente-whatsapp-entrega', 1, 'abrir-whatsapp', { alvo: page.getByRole('link', { name: 'Abrir WhatsApp' }) })
  await context.close()
})

test('cliente: ver meus pedidos pelo CPF', async ({ browser }) => {
  const { context, page } = await cardapio(browser)
  const T = 'cliente-meus-pedidos'
  await page.goto(CARDAPIO)
  await print(page, T, 1, 'ver-meus-pedidos', { alvo: page.getByRole('link', { name: 'Ver meus pedidos' }) })
  await page.getByRole('link', { name: 'Ver meus pedidos' }).click()
  await page.getByLabel('CPF').fill(CLIENTE.cpf)
  await print(page, T, 2, 'digitar-cpf', { alvo: page.getByRole('button', { name: 'Ver meus pedidos' }) })
  await context.close()
})

test('cliente: cardápio de revenda', async ({ browser }) => {
  const { context, page } = await cardapio(browser)
  const T = 'cliente-revenda'
  await page.goto(`${CARDAPIO}/revendedor`)
  await page.waitForURL('**/cardapio')
  await page.waitForTimeout(1500)
  await print(page, T, 1, 'cardapio-de-revenda')
  await context.close()
})
