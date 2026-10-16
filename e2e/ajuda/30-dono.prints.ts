import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test, type Locator, type Page } from '@playwright/test'
import { DONO, prepararBrasa, renderImage } from './brasa-seed'
import { PAINEL, painelLogado, print } from './shot'

// Prints do dono da loja no painel: catálogo, estoque, promoções, equipe e configurações.
// Conta: dona da Brasa Burger (store_admin). Só o produto "Brasa Picante" é criado e
// apagado na própria rodada; a importação da planilha atualiza 3 produtos de exemplo.

test.describe.configure({ mode: 'serial' })

const NOVO = { codigo: 'B09', nome: 'Brasa Picante' }

test.beforeAll(async ({ browser }) => {
  await prepararBrasa(browser)
})

async function editar(page: Page, nome: string) {
  await page.goto(`${PAINEL}/produtos`)
  await page.getByLabel('Buscar produtos por código ou nome').fill(nome)
  await page.waitForTimeout(1200)
  await page.getByRole('button', { name: `Editar ${nome}` }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await page.waitForTimeout(800)
  return dialog
}

async function rolarAte(locator: Locator) {
  await locator.scrollIntoViewIfNeeded()
  await locator.page().waitForTimeout(300)
}

test('dono: catálogo de produtos', async ({ browser }) => {
  const { context, page } = await painelLogado(browser, DONO, 'computador')

  // apaga o produto de exemplo se sobrou de uma rodada anterior
  await page.goto(`${PAINEL}/produtos`)
  await page.getByLabel('Buscar produtos por código ou nome').fill(NOVO.codigo)
  await page.waitForTimeout(1200)
  const sobra = page.getByRole('button', { name: `Excluir ${NOVO.nome}` })
  if (await sobra.count()) {
    await sobra.click()
    await page.getByRole('dialog').getByRole('button', { name: 'Confirmar exclusão' }).click()
    await page.waitForTimeout(1200)
  }

  // cadastrar produto
  const T = 'dono-cadastrar-produto'
  await page.goto(`${PAINEL}/produtos`)
  await page.waitForTimeout(1500)
  await print(page, T, 1, 'lista-de-produtos', { alvo: page.getByRole('button', { name: 'Novo produto' }) })
  await page.getByRole('button', { name: 'Novo produto' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Código').fill(NOVO.codigo)
  await dialog.getByLabel('Descrição', { exact: true }).fill(NOVO.nome)
  await dialog.getByLabel('Descrição detalhada').fill('Blend de 160 g, pimenta jalapeño e maionese defumada')
  await dialog.getByLabel('Valor não lover (R$)').fill('36')
  await dialog.getByLabel('Valor lover (R$)').fill('33')
  await print(page, T, 2, 'dados-e-precos', { alvo: dialog.getByLabel('Valor lover (R$)') })
  await dialog.getByRole('button', { name: /Buscar categoria/ }).click()
  await page.getByRole('option', { name: 'Burgers' }).click()
  await rolarAte(dialog.getByText('Tipo cardápio'))
  await print(page, T, 3, 'categoria-e-onde-aparece', { alvo: dialog.getByText('Tipo cardápio').locator('..') })
  const foto = await renderImage(browser, '🌶️', '#d9534f', 600, 600)
  const fotoArquivo = join(mkdtempSync(join(tmpdir(), 'ajuda-')), 'brasa-picante.png')
  writeFileSync(fotoArquivo, foto)
  await dialog.getByLabel('Foto').setInputFiles(fotoArquivo)
  await expect(dialog.getByText('Enviando imagem...')).toHaveCount(0, { timeout: 20_000 })
  await rolarAte(dialog.getByRole('button', { name: 'Salvar' }))
  await print(page, T, 4, 'foto-e-salvar', { alvo: dialog.getByRole('button', { name: 'Salvar' }) })
  await dialog.getByRole('button', { name: 'Salvar' }).click()
  await expect(page.getByText('Produto criado.')).toBeVisible({ timeout: 20_000 })
  await page.getByLabel('Buscar produtos por código ou nome').fill(NOVO.codigo)
  await page.waitForTimeout(1500)
  await print(page, T, 5, 'produto-na-lista', { alvo: page.getByRole('row').filter({ hasText: NOVO.nome }) })

  // adicionais e variações dentro do produto
  const V = 'dono-opcoes-do-produto'
  const brasa = await editar(page, 'Brasa Clássico')
  await rolarAte(brasa.getByText(/^Variações/))
  await print(page, V, 1, 'variacoes-do-produto', { alvo: brasa.getByText(/^Variações/).locator('..') })
  await rolarAte(brasa.getByText('Adicionais', { exact: true }))
  await print(page, V, 2, 'adicionais-do-produto', { alvo: brasa.getByText('Adicionais', { exact: true }).locator('..') })
  await page.keyboard.press('Escape')

  // pausar produto
  const P = 'dono-pausar-produto'
  const petit = await editar(page, 'Petit gâteau')
  const ativo = petit.getByText('Produto ativo')
  await rolarAte(ativo)
  await print(page, P, 1, 'desmarcar-produto-ativo', { alvo: ativo.locator('..') })
  await page.keyboard.press('Escape')

  // estoque do varejo
  const E = 'dono-estoque-do-varejo'
  const milk = await editar(page, 'Milkshake de chocolate')
  const estoque = milk.getByText('Controlar estoque desse item')
  await rolarAte(estoque)
  await print(page, E, 1, 'controlar-estoque', { alvo: estoque.locator('..') })
  await page.keyboard.press('Escape')

  // exportar planilha
  await page.goto(`${PAINEL}/produtos`)
  await page.waitForTimeout(1200)
  await page.getByRole('button', { name: 'Mais ações do catálogo' }).click()
  await print(page, 'dono-exportar-planilha', 1, 'menu-mais-acoes', { alvo: page.getByRole('menuitem', { name: /Exportar planilha/ }) })
  await page.keyboard.press('Escape')

  // importar planilha
  const I = 'dono-importar-planilha'
  const csv = [
    'Código;Descrição;Descrição detalhada;Categoria;Preço R$;Lover R$;Utilizará estoque;Estoque',
    'B10;Brasa Costela;Blend de costela de 180 g com queijo coalho;Burgers;42;38;não;',
    'D05;Chá gelado;Chá preto com limão, 400 ml;Bebidas;9;8;sim;24',
    'A04;Mandioca frita;Porção com maionese da casa;Acompanhamentos;16;14;não;',
  ].join('\n')
  const planilha = join(mkdtempSync(join(tmpdir(), 'ajuda-')), 'produtos-brasa.csv')
  writeFileSync(planilha, '﻿' + csv)
  await print(page, I, 1, 'botao-importar', { alvo: page.getByRole('button', { name: 'Importar planilha' }) })
  await page.locator('input[type="file"][accept=".xlsx,.csv"]').setInputFiles(planilha)
  await page.waitForURL('**/produtos/importar')
  await expect(page.getByRole('button', { name: 'Confirmar importação' })).toBeVisible({ timeout: 20_000 })
  await print(page, I, 2, 'conferir-antes-de-gravar', { alvo: page.getByRole('button', { name: 'Confirmar importação' }) })
  await page.getByRole('button', { name: 'Confirmar importação' }).click()
  await expect(page.getByText(/Importação concluída/)).toBeVisible({ timeout: 30_000 })
  await print(page, I, 3, 'importacao-concluida')

  // categorias, adicionais, variações e ordem do cardápio
  await page.goto(`${PAINEL}/produtos/categorias`)
  await page.waitForTimeout(1200)
  await print(page, 'dono-categorias', 1, 'lista-de-categorias', { alvo: page.getByRole('button', { name: 'Nova categoria' }) })
  await page.getByRole('button', { name: 'Nova categoria' }).click()
  await print(page, 'dono-categorias', 2, 'nova-categoria')
  await page.keyboard.press('Escape')

  await page.goto(`${PAINEL}/produtos/adicionais`)
  await page.waitForTimeout(1200)
  await page.getByRole('button', { name: 'Expandir Turbine seu burger' }).click()
  await page.waitForTimeout(800)
  await print(page, 'dono-adicionais', 1, 'grupo-de-adicionais', { alvo: page.getByRole('button', { name: 'Novo adicional' }) })
  await page.getByRole('button', { name: 'Novo adicional' }).click()
  await print(page, 'dono-adicionais', 2, 'novo-adicional')
  await page.keyboard.press('Escape')

  await page.goto(`${PAINEL}/produtos/variacoes`)
  await page.waitForTimeout(1200)
  await page.getByRole('button', { name: 'Expandir Tamanho' }).click()
  await page.waitForTimeout(800)
  await print(page, 'dono-variacoes', 1, 'grupo-de-variacoes', { alvo: page.getByRole('button', { name: 'Novo grupo' }) })
  await page.getByRole('button', { name: 'Novo grupo' }).click()
  await print(page, 'dono-variacoes', 2, 'novo-grupo-e-efeito-no-preco')
  await page.keyboard.press('Escape')

  await page.goto(`${PAINEL}/produtos/ordenar`)
  await page.waitForTimeout(1500)
  await print(page, 'dono-organizar-cardapio', 1, 'arrastar-para-ordenar', { alvo: page.getByRole('button', { name: /Arrastar categoria Burgers/ }) })

  // excluir o produto de exemplo
  const X = 'dono-excluir-produto'
  await page.goto(`${PAINEL}/produtos`)
  await page.getByLabel('Buscar produtos por código ou nome').fill(NOVO.codigo)
  await page.waitForTimeout(1500)
  await print(page, X, 1, 'botao-excluir', { alvo: page.getByRole('button', { name: `Excluir ${NOVO.nome}` }) })
  await page.getByRole('button', { name: `Excluir ${NOVO.nome}` }).click()
  await print(page, X, 2, 'confirmar-exclusao', { alvo: page.getByRole('dialog').getByRole('button', { name: 'Confirmar exclusão' }) })
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar exclusão' }).click()
  await expect(page.getByText('Produto excluído.')).toBeVisible({ timeout: 20_000 })
  await context.close()
})

test('dono: revenda, promoções, atendentes e configurações', async ({ browser }) => {
  const { context, page } = await painelLogado(browser, DONO, 'computador')

  await page.goto(`${PAINEL}/revendedores`)
  await page.waitForTimeout(1500)
  await print(page, 'dono-estoque-da-revenda', 1, 'estoque-da-revenda', {
    alvo: page.getByRole('spinbutton', { name: /Estoque de revendedor de Hambúrguer congelado/ }),
  })
  await page.getByRole('button', { name: 'Pedidos' }).click()
  await page.waitForTimeout(1200)
  await print(page, 'dono-estoque-da-revenda', 2, 'pedidos-da-revenda')

  await page.goto(`${PAINEL}/promocoes`)
  await page.waitForTimeout(1500)
  await print(page, 'dono-promocoes-e-combos', 1, 'lista-de-promocoes', { alvo: page.getByRole('button', { name: 'Nova promoção' }) })
  await page.getByRole('button', { name: 'Editar Combo Brasa' }).click()
  const promo = page.getByRole('dialog')
  await expect(promo).toBeVisible()
  await page.waitForTimeout(800)
  await print(page, 'dono-promocoes-e-combos', 2, 'dados-da-promocao')
  await rolarAte(promo.getByText('Itens do combo (opcional)'))
  await print(page, 'dono-promocoes-e-combos', 3, 'itens-e-desconto', { alvo: promo.getByText('Itens do combo (opcional)').locator('..') })
  await page.keyboard.press('Escape')

  await page.goto(`${PAINEL}/atendentes`)
  await page.waitForTimeout(1200)
  await print(page, 'dono-atendentes', 1, 'lista-de-atendentes', { alvo: page.getByRole('button', { name: 'Novo atendente' }) })
  await page.getByRole('button', { name: 'Novo atendente' }).click()
  await print(page, 'dono-atendentes', 2, 'novo-atendente')
  await page.keyboard.press('Escape')

  await page.goto(`${PAINEL}/configuracoes`)
  await page.waitForTimeout(1200)
  await print(page, 'dono-dados-da-loja', 1, 'dados-da-loja', { alvo: page.getByLabel('WhatsApp da loja') })
  await print(page, 'dono-abrir-cardapio', 1, 'botoes-abrir', { alvo: page.getByRole('link', { name: 'Abrir cardápio' }) })

  await page.getByRole('button', { name: /Como o cliente pede/ }).click()
  await page.waitForTimeout(800)
  await print(page, 'dono-canais-de-pedido', 1, 'ligar-e-desligar-canais', { alvo: page.getByRole('switch', { name: 'Entrega' }) })

  await page.getByRole('button', { name: /Mesas e QR Code/ }).click()
  await page.waitForTimeout(1200)
  await print(page, 'dono-qr-codes-das-mesas', 1, 'gerar-qr-codes', { alvo: page.getByRole('button', { name: 'Gerar e imprimir' }) })

  await page.getByRole('button', { name: /Fechar ou excluir a loja/ }).click()
  await page.waitForTimeout(800)
  await print(page, 'dono-fechar-a-loja', 1, 'fechar-loja', { alvo: page.getByRole('button', { name: 'Fechar loja' }) })
  await page.getByRole('button', { name: 'Fechar loja' }).click()
  await print(page, 'dono-fechar-a-loja', 2, 'confirmar-fechamento')
  await page.keyboard.press('Escape')
  await context.close()
})
