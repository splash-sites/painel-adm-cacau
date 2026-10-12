import { expect, test, type Page } from '@playwright/test'
import {
  api,
  confirmDelete,
  E2E_STORE_ID,
  expectToast,
  login,
  RUN,
  STORE_ADMIN,
  SUPER_ADMIN,
  TINY_PNG,
} from './helpers'

// Cria, edita e exclui cada cadastro do painel pelo layout novo, no staging.
// Tudo que nasce aqui leva o sufixo da execução (RUN) e é apagado no próprio teste.

const LOJA_A = '00000000-0000-4000-a000-000000000001'

test.describe('cadastros da loja (store_admin da loja-e2e)', () => {
  test.skip(!STORE_ADMIN.email || !STORE_ADMIN.password, 'E2E_TEST_EMAIL / E2E_TEST_PASSWORD não configurados')

  test.beforeEach(async ({ page }) => {
    await login(page, STORE_ADMIN)
  })

  test('categoria: criar, renomear e excluir', async ({ page }) => {
    const name = `Categoria E2E ${RUN}`
    await page.goto('/produtos/categorias')
    await page.getByRole('button', { name: 'Nova categoria' }).click()
    await page.getByRole('dialog').getByLabel('Nome').fill(name)
    await page.getByRole('dialog').getByRole('button', { name: 'Salvar' }).click()
    await expectToast(page, 'Categoria criada.')
    await expect(page.getByText(name, { exact: true })).toBeVisible()

    await page.getByRole('button', { name: `Editar ${name}` }).click()
    await page.getByRole('dialog').getByLabel('Nome').fill(`${name} editada`)
    await page.getByRole('dialog').getByRole('button', { name: 'Salvar' }).click()
    await expectToast(page, 'Categoria atualizada.')
    await expect(page.getByText(`${name} editada`, { exact: true })).toBeVisible()

    await page.getByRole('button', { name: `Excluir ${name} editada` }).click()
    await confirmDelete(page)
    await expectToast(page, 'Categoria excluída.')
    await expect(page.getByText(`${name} editada`, { exact: true })).toHaveCount(0)
  })

  test('atendente: criar, renomear e excluir', async ({ page }) => {
    const name = `Atendente E2E ${RUN}`
    await page.goto('/atendentes')
    await page.getByRole('button', { name: 'Novo atendente' }).click()
    await page.getByRole('dialog').getByLabel('Nome').fill(name)
    await page.getByRole('dialog').getByRole('button', { name: 'Salvar' }).click()
    await expectToast(page, 'Atendente criado.')
    await expect(page.getByText(name, { exact: true })).toBeVisible()

    await page.getByRole('button', { name: `Editar ${name}` }).click()
    await page.getByRole('dialog').getByLabel('Nome').fill(`${name} editado`)
    await page.getByRole('dialog').getByRole('button', { name: 'Salvar' }).click()
    await expectToast(page, 'Atendente atualizado.')

    await page.getByRole('button', { name: `Excluir ${name} editado` }).click()
    await confirmDelete(page)
    await expectToast(page, 'Atendente excluído.')
    await expect(page.getByText(`${name} editado`, { exact: true })).toHaveCount(0)
  })

  test('produto: criar, mudar preço e excluir', async ({ page }) => {
    const code = `E2E-${RUN}`
    const name = `Produto E2E ${RUN}`
    await page.goto('/produtos')
    await page.getByRole('button', { name: 'Novo produto' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Código').fill(code)
    await dialog.getByLabel('Descrição', { exact: true }).fill(name)
    await dialog.getByLabel('Valor não lover (R$)').fill('12')
    await dialog.getByLabel('Valor lover (R$)').fill('10')
    await dialog.getByRole('button', { name: 'Salvar' }).click()
    await expectToast(page, 'Produto criado.')

    await page.getByLabel('Buscar produtos por código ou nome').fill(code)
    await expect(page.getByText(name, { exact: true })).toBeVisible()
    await page.getByRole('button', { name: `Editar ${name}` }).click()
    await page.getByRole('dialog').getByLabel('Valor não lover (R$)').fill('13.5')
    await page.getByRole('dialog').getByRole('button', { name: 'Salvar' }).click()
    await expectToast(page, 'Produto atualizado.')
    await expect
      .poll(async () => (await api(page, `products?select=price&store_id=eq.${E2E_STORE_ID}&external_code=eq.${code}`)).body[0]?.price)
      .toBe(13.5)

    await page.getByRole('button', { name: `Excluir ${name}` }).click()
    await confirmDelete(page)
    await expectToast(page, 'Produto excluído.')
    await expect(page.getByText(name, { exact: true })).toHaveCount(0)
  })

  test('grupo de adicionais e opção: criar, editar e excluir', async ({ page }) => {
    const group = `Adicionais E2E ${RUN}`
    const option = `Calda E2E ${RUN}`
    await page.goto('/produtos/adicionais')
    await page.getByRole('button', { name: 'Novo grupo' }).click()
    await page.getByRole('dialog').getByLabel('Nome').fill(group)
    await page.getByRole('dialog').getByRole('button', { name: 'Salvar' }).click()
    await expect(page.getByText(group, { exact: true })).toBeVisible()

    await page.getByRole('button', { name: `Expandir ${group}` }).click()
    await page.getByRole('button', { name: 'Novo adicional' }).click()
    await page.getByRole('dialog').getByLabel('Nome').fill(option)
    await page.getByRole('dialog').getByLabel('Preço (R$)').fill('3')
    await page.getByRole('dialog').getByRole('button', { name: 'Salvar' }).click()
    await expect(page.getByText(option, { exact: true })).toBeVisible()

    await page.getByRole('button', { name: `Editar ${option}` }).click()
    await page.getByRole('dialog').getByLabel('Nome').fill(`${option} quente`)
    await page.getByRole('dialog').getByRole('button', { name: 'Salvar' }).click()
    await expect(page.getByText(`${option} quente`, { exact: true })).toBeVisible()

    await page.getByRole('button', { name: `Excluir ${option} quente` }).click()
    await confirmDelete(page)
    await expectToast(page, 'Adicional excluído.')

    await page.getByRole('button', { name: `Excluir ${group}` }).click()
    await confirmDelete(page)
    await expectToast(page, 'Grupo excluído.')
    await expect(page.getByText(group, { exact: true })).toHaveCount(0)
  })

  test('grupo de variação e opção: criar, editar e excluir', async ({ page }) => {
    const group = `Tamanho E2E ${RUN}`
    const option = `Médio E2E ${RUN}`
    await page.goto('/produtos/variacoes')
    await page.getByRole('button', { name: 'Novo grupo' }).click()
    await page.getByRole('dialog').getByLabel('Nome').fill(group)
    await page.getByRole('dialog').getByRole('button', { name: 'Salvar' }).click()
    await expect(page.getByText(group, { exact: true })).toBeVisible()

    await page.getByRole('button', { name: `Expandir ${group}` }).click()
    await page.getByRole('button', { name: 'Nova variação' }).click()
    await page.getByRole('dialog').getByLabel('Nome').fill(option)
    await page.getByRole('dialog').getByLabel('Diferença de preço (R$)').fill('2')
    await page.getByRole('dialog').getByRole('button', { name: 'Salvar' }).click()
    await expect(page.getByText(option, { exact: true })).toBeVisible()

    await page.getByRole('button', { name: `Editar ${option}` }).click()
    await page.getByRole('dialog').getByLabel('Nome').fill(`${option} grande`)
    await page.getByRole('dialog').getByRole('button', { name: 'Salvar' }).click()
    await expect(page.getByText(`${option} grande`, { exact: true })).toBeVisible()

    await page.getByRole('button', { name: `Excluir ${option} grande` }).click()
    await confirmDelete(page)
    await expectToast(page, 'Variação excluída.')

    await page.getByRole('button', { name: `Excluir ${group}` }).click()
    await confirmDelete(page)
    await expectToast(page, 'Grupo excluído.')
    await expect(page.getByText(group, { exact: true })).toHaveCount(0)
  })

  test('promoção: criar com imagem, renomear e excluir', async ({ page }) => {
    const title = `Promo E2E ${RUN}`
    await page.goto('/promocoes')
    await page.getByRole('button', { name: 'Nova promoção' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Título', { exact: true }).fill(title)
    await dialog.getByRole('button', { name: /Buscar produto\.\.\./ }).click()
    await page.getByRole('option', { name: /^Água/ }).first().click()
    await dialog.getByLabel('Imagem').setInputFiles(TINY_PNG)
    await expect(dialog.getByAltText('Prévia da promoção')).toBeVisible({ timeout: 15_000 })
    await dialog.getByRole('button', { name: 'Salvar' }).click()
    await expect(page.getByText(title, { exact: true })).toBeVisible({ timeout: 10_000 })

    await page.getByRole('button', { name: `Editar ${title}` }).click()
    await page.getByRole('dialog').getByLabel('Título', { exact: true }).fill(`${title} nova`)
    await page.getByRole('dialog').getByRole('button', { name: 'Salvar' }).click()
    await expect(page.getByText(`${title} nova`, { exact: true })).toBeVisible({ timeout: 10_000 })

    await page.getByRole('button', { name: `Excluir ${title} nova` }).click()
    await confirmDelete(page)
    await expectToast(page, 'Promoção excluída.')
    await expect(page.getByText(`${title} nova`, { exact: true })).toHaveCount(0)
  })

  test('configurações: editar dados da loja e ligar/desligar canal', async ({ page }) => {
    const storeRow = async () => (await api(page, `stores?select=name,whatsapp_number,supports_delivery&id=eq.${E2E_STORE_ID}`)).body[0]

    try {
      await page.goto('/configuracoes')
      await page.getByLabel('Nome da unidade').fill(`Loja E2E ${RUN}`)
      await page.getByLabel('WhatsApp da loja').fill('5551988887777')
      await expect(page.getByLabel('WhatsApp da loja')).toHaveValue('+55 (51) 9 8888-7777')
      await page.getByRole('button', { name: 'Salvar' }).click()
      await expectToast(page, 'Dados da loja salvos.')
      await expect.poll(async () => (await storeRow()).whatsapp_number).toBe('5551988887777')

      await page.getByRole('button', { name: /Como o cliente pede/ }).click()
      await expect(page).toHaveURL(/secao=pedidos/)
      const delivery = page.getByRole('switch', { name: 'Entrega' })
      await expect(delivery).toHaveAttribute('aria-checked', 'true')
      await delivery.click()
      await expect.poll(async () => (await storeRow()).supports_delivery).toBe(false)
      // espera a tela mostrar o estado novo antes de clicar de novo (senão manda o valor antigo)
      await expect(delivery).toHaveAttribute('aria-checked', 'false')
      await expect(delivery).toBeEnabled()
      await delivery.click()
      await expect.poll(async () => (await storeRow()).supports_delivery).toBe(true)
    } finally {
      // a loja-e2e também é usada pelos E2E do cardápio: volta sempre pro estado do seed
      await api(page, `stores?id=eq.${E2E_STORE_ID}`, {
        method: 'PATCH',
        body: { name: 'Loja E2E', whatsapp_number: null, supports_delivery: true },
      })
    }
  })
})

test.describe('cadastros do administrador geral (super_admin)', () => {
  test.skip(!SUPER_ADMIN.email || !SUPER_ADMIN.password, 'E2E_SUPER_EMAIL / E2E_SUPER_PASSWORD não configurados')

  async function loginSuper(page: Page, storeId: string) {
    await login(page, SUPER_ADMIN, storeId)
    await page.reload()
  }

  test('usuário: cadastrar colaborador, renomear e excluir', async ({ page }) => {
    const name = `Colaborador E2E ${RUN}`
    const email = `e2e-${RUN}@teste.local`
    await loginSuper(page, E2E_STORE_ID)
    await page.goto('/usuarios')
    await page.getByRole('button', { name: 'Novo usuário' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Nome').fill(name)
    await dialog.getByLabel('E-mail').fill(email)
    await dialog.getByLabel('Senha').fill(`Senha-${RUN}-e2e`)
    await dialog.getByRole('button', { name: 'Cadastrar' }).click()
    await expectToast(page, `Conta de ${name} criada.`)
    await dialog.getByRole('button', { name: 'Fechar' }).click()
    await expect(page.getByText(name, { exact: true })).toBeVisible({ timeout: 15_000 })

    await page.getByRole('button', { name: `Editar ${name}` }).click()
    await page.getByRole('dialog').getByLabel('Nome').fill(`${name} editado`)
    await page.getByRole('dialog').getByRole('button', { name: 'Salvar' }).click()
    await expectToast(page, 'Usuário atualizado.')

    await page.getByRole('button', { name: `Excluir ${name} editado` }).click()
    await confirmDelete(page)
    await expectToast(page, 'Usuário excluído.')
    await expect(page.getByText(`${name} editado`, { exact: true })).toHaveCount(0)
  })

  test('loja: criar, abrir nas configurações e excluir', async ({ page }) => {
    const name = `Loja Nova E2E ${RUN}`
    await loginSuper(page, E2E_STORE_ID)
    await page.goto('/lojas/nova')
    await page.getByLabel('Nome').fill(name)
    await page.getByLabel('Slug').fill(`e2e-${RUN}`)
    await page.getByLabel('WhatsApp').fill('5551977776666')
    await page.getByRole('button', { name: 'Salvar' }).click()
    await expect(page).toHaveURL('/')

    await page.goto('/configuracoes')
    await expect(page.getByLabel('Nome da unidade')).toHaveValue(name)
    await page.getByRole('button', { name: /Fechar ou excluir a loja/ }).click()
    await page.getByRole('button', { name: 'Excluir loja' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Excluir loja' }).click()
    await expect(page).toHaveURL('/')
    await expect
      .poll(async () => (await api(page, `stores?select=id&slug=eq.e2e-${RUN}`)).body.length)
      .toBe(0)
  })

  test('revenda: ligar controle de estoque e salvar saldo', async ({ page }) => {
    await loginSuper(page, LOJA_A)
    const productRow = async () =>
      (await api(page, `products?select=id,reseller_track_stock,reseller_stock_quantity&store_id=eq.${LOJA_A}&external_code=eq.A001`)).body[0]
    const original = await productRow()

    await page.goto('/revendedores')
    await page.getByLabel('Buscar produtos de revendedor por código ou nome').fill('A001')
    const qty = page.getByRole('spinbutton', { name: 'Estoque de revendedor de Cappuccino' })
    await expect(qty).toBeVisible({ timeout: 10_000 })
    await qty.fill('77')
    await qty.press('Tab')
    await expect.poll(async () => (await productRow()).reseller_stock_quantity).toBe(77)

    await api(page, `products?id=eq.${original.id}`, {
      method: 'PATCH',
      body: { reseller_track_stock: original.reseller_track_stock, reseller_stock_quantity: original.reseller_stock_quantity },
    })
  })
})
