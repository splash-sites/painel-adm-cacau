import { expect, test, type Page } from '@playwright/test'
import { DONO, pedidosDosTutoriais, prepararBrasa } from './brasa-seed'
import { PAINEL, VIEWPORT, painelLogado, print } from './shot'

// Prints do dia a dia da equipe no painel (quadro de pedidos), com a conta da dona da
// Brasa Burger. Cada rodada cria pedidos novos pra cada tutorial (pedidosDosTutoriais).

test.describe.configure({ mode: 'serial' })

let pedidos: Awaited<ReturnType<typeof pedidosDosTutoriais>>

test.beforeAll(async ({ browser }) => {
  const ids = await prepararBrasa(browser)
  pedidos = await pedidosDosTutoriais(ids)
})

const card = (page: Page, id: string) => page.locator(`[data-order-id="${id}"]`)

test('equipe: entrar no painel', async ({ browser }) => {
  const context = await browser.newContext({ ...VIEWPORT.computador, locale: 'pt-BR' })
  const page = await context.newPage()
  await page.goto(`${PAINEL}/login`)
  await page.waitForTimeout(800)
  await print(page, 'equipe-entrar-no-painel', 1, 'tela-de-entrar', { alvo: page.getByRole('button', { name: 'Entrar' }) })
  await context.close()
})

test('equipe: quadro de pedidos e as ações de cada pedido', async ({ browser }) => {
  const { context, page } = await painelLogado(browser, DONO, 'computador')
  await expect(card(page, pedidos.aceitar)).toBeVisible({ timeout: 20_000 })
  await page.waitForTimeout(1500)
  await print(page, 'equipe-quadro-de-pedidos', 1, 'visao-geral')
  await print(page, 'equipe-quadro-de-pedidos', 2, 'coluna-novos', { alvo: page.getByRole('heading', { name: /^Novos/ }) })

  // detalhes
  await print(page, 'equipe-detalhes-do-pedido', 1, 'botao-detalhes', { alvo: card(page, pedidos.aceitar).getByRole('button', { name: 'Detalhes' }) })
  await card(page, pedidos.aceitar).getByRole('button', { name: 'Detalhes' }).click()
  await print(page, 'equipe-detalhes-do-pedido', 2, 'gaveta-de-detalhes')
  await page.keyboard.press('Escape')

  // editar antes de aceitar
  const editar = card(page, pedidos.cancelar).getByRole('button', { name: 'Editar' })
  await print(page, 'equipe-editar-itens', 1, 'botao-editar', { alvo: editar })
  await editar.click()
  await expect(page.getByRole('dialog', { name: 'Editar itens do pedido' })).toBeVisible()
  await print(page, 'equipe-editar-itens', 2, 'janela-editar-itens')
  await page.keyboard.press('Escape')

  // aceitar e imprimir
  const aceitar = card(page, pedidos.aceitar).getByRole('button', { name: 'Aceitar pedido' })
  await print(page, 'equipe-aceitar-pedido', 1, 'botao-aceitar', { alvo: aceitar })
  await aceitar.click()
  const modal = page.getByRole('dialog', { name: 'Quem vai preparar?' })
  await expect(modal).toBeVisible()
  await modal.getByRole('radio').first().check()
  await print(page, 'equipe-aceitar-pedido', 2, 'escolher-quem-prepara', { alvo: modal.getByRole('button', { name: 'Aceitar pedido' }) })
  await page.evaluate(() => { window.print = () => undefined })
  await modal.getByRole('button', { name: 'Aceitar pedido' }).click()
  await expect(page.getByTestId('kanban-column-preparing').locator(`[data-order-id="${pedidos.aceitar}"]`)).toBeVisible({ timeout: 20_000 })
  await page.waitForTimeout(800)
  await print(page, 'equipe-aceitar-pedido', 3, 'pedido-em-preparo', { alvo: card(page, pedidos.aceitar) })

  // cancelar com motivo
  const cancelar = card(page, pedidos.cancelar).getByRole('button', { name: 'Cancelar' })
  await print(page, 'equipe-cancelar-pedido', 1, 'botao-cancelar', { alvo: cancelar })
  await cancelar.click()
  const dialogCancelar = page.getByRole('dialog').filter({ hasText: 'Motivo' })
  await dialogCancelar.getByRole('button', { name: 'Cliente desistiu' }).click()
  await print(page, 'equipe-cancelar-pedido', 2, 'escolher-motivo', { alvo: dialogCancelar.getByRole('button', { name: 'Cancelar pedido' }) })
  await dialogCancelar.getByRole('button', { name: 'Cancelar pedido' }).click()
  await expect(card(page, pedidos.cancelar)).toHaveCount(0, { timeout: 20_000 })

  // voltar etapa
  const voltar = card(page, pedidos.voltar).getByRole('button', { name: 'Voltar etapa' })
  await print(page, 'equipe-voltar-etapa', 1, 'botao-voltar-etapa', { alvo: voltar })
  await voltar.click()
  await expect(page.getByTestId('kanban-column-preparing').locator(`[data-order-id="${pedidos.voltar}"]`)).toBeVisible({ timeout: 20_000 })
  await page.waitForTimeout(600)
  await print(page, 'equipe-voltar-etapa', 2, 'pedido-voltou', { alvo: card(page, pedidos.voltar) })

  // avançar e finalizar com a pergunta do preço de clube
  const pronto = card(page, pedidos.voltar).getByRole('button', { name: 'Pronto pra retirada' })
  await print(page, 'equipe-avancar-etapa', 1, 'botao-da-proxima-etapa', { alvo: pronto })
  await pronto.click()
  await expect(page.getByTestId('kanban-column-ready_for_pickup').locator(`[data-order-id="${pedidos.voltar}"]`)).toBeVisible({ timeout: 20_000 })

  const finalizar = card(page, pedidos.finalizar).getByRole('button', { name: 'Finalizar' })
  await print(page, 'equipe-finalizar-pedido', 1, 'botao-finalizar', { alvo: finalizar })
  await finalizar.click()
  const lover = page.getByRole('dialog', { name: /Cliente é do clube/ })
  await expect(lover).toBeVisible()
  await print(page, 'equipe-finalizar-pedido', 2, 'pergunta-preco-de-clube', { alvo: lover.getByRole('button', { name: /Sim, é do clube/ }) })
  await lover.getByRole('button', { name: /Sim, é do clube/ }).click()
  await expect(page.getByTestId('kanban-column-finalized').locator(`[data-order-id="${pedidos.finalizar}"]`)).toBeVisible({ timeout: 20_000 })

  // conta da mesa
  const mesaCard = page.getByTestId('table-group-card').filter({ hasText: `Mesa ${pedidos.mesa}` })
  await print(page, 'equipe-conta-da-mesa', 1, 'pedidos-da-mesa-juntos', { alvo: mesaCard.getByRole('button', { name: 'Finalizar mesa' }) })
  await mesaCard.getByRole('button', { name: 'Finalizar mesa' }).click()
  const loverMesa = page.getByRole('dialog', { name: /Cliente é do clube/ })
  await expect(loverMesa).toBeVisible()
  await print(page, 'equipe-conta-da-mesa', 2, 'pergunta-da-mesa-inteira')
  await loverMesa.getByRole('button', { name: /Não, preço normal/ }).click()
  await expect(mesaCard).toHaveCount(0, { timeout: 20_000 })
  const chip = page.locator('div').filter({ has: page.getByText(`Mesa ${pedidos.mesa}`, { exact: true }) }).filter({ has: page.getByRole('button', { name: 'Fechar mesa' }) }).last()
  await page.evaluate(() => window.scrollTo(0, 0))
  await print(page, 'equipe-conta-da-mesa', 3, 'fechar-a-mesa', { alvo: chip.getByRole('button', { name: 'Fechar mesa' }) })
  await chip.getByRole('button', { name: 'Fechar mesa' }).click()
  await page.waitForTimeout(1200)

  // histórico
  await page.goto(`${PAINEL}/historico`)
  await page.waitForTimeout(1500)
  await page.getByRole('button', { name: '7 dias' }).click()
  await page.waitForTimeout(1200)
  await print(page, 'equipe-historico', 1, 'lista-de-pedidos', { alvo: page.getByRole('button', { name: '7 dias' }) })

  // aviso de pedido novo
  await page.goto(`${PAINEL}/configuracoes?secao=avisos`)
  await page.waitForTimeout(1200)
  await print(page, 'equipe-aviso-de-pedido-novo', 1, 'som-e-notificacao', { alvo: page.getByRole('switch', { name: 'Tocar som' }) })
  await context.close()
})

test('equipe: quadro de pedidos no celular', async ({ browser }) => {
  const { context, page } = await painelLogado(browser, DONO, 'celular')
  await page.waitForTimeout(1500)
  await print(page, 'equipe-quadro-no-celular', 1, 'quadro-no-celular')
  await page.getByRole('button', { name: 'Abrir menu' }).click()
  await print(page, 'equipe-quadro-no-celular', 2, 'menu-aberto')
  await context.close()
})
