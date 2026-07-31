import { expect, test } from '@playwright/test'

const EMAIL = process.env.E2E_TEST_EMAIL
const PASSWORD = process.env.E2E_TEST_PASSWORD

test.skip(!EMAIL || !PASSWORD, 'E2E_TEST_EMAIL / E2E_TEST_PASSWORD não configurados em .env.local')

/**
 * Requer pelo menos 1 pedido em status "received" na loja da conta de teste
 * no momento em que o teste roda (o painel não cria pedidos, só o storefront/RPC faz isso).
 */
test('login e avanço de status refletem no kanban', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('E-mail').fill(EMAIL!)
  await page.getByLabel('Senha').fill(PASSWORD!)
  await page.getByRole('button', { name: 'Entrar' }).click()

  await expect(page).toHaveURL('/')

  const receivedColumn = page.getByTestId('kanban-column-received')
  await expect(receivedColumn.getByTestId('order-card').first()).toBeVisible({ timeout: 10_000 })

  const card = receivedColumn.getByTestId('order-card').first()
  const orderId = await card.getAttribute('data-order-id')

  await card.getByRole('button', { name: 'Avançar etapa' }).click()

  await expect(page.getByText('Quem vai preparar?')).toBeVisible()
  await page.getByRole('button', { name: 'Novo atendente' }).click()
  const attendantName = `E2E ${Date.now()}`
  await page.getByLabel('Nome').fill(attendantName)
  await page.getByRole('dialog').filter({ hasText: 'Novo atendente' }).getByRole('button', { name: 'Salvar' }).click()
  await page.getByRole('button', { name: 'Aceitar pedido' }).click()

  const preparingColumn = page.getByTestId('kanban-column-preparing')
  const movedCard = preparingColumn.locator(`[data-order-id="${orderId}"]`)
  await expect(movedCard).toBeVisible({ timeout: 10_000 })

  await expect(receivedColumn.locator(`[data-order-id="${orderId}"]`)).toHaveCount(0)

  // limpa o atendente de teste — não pode excluir de verdade porque o pedido movido acima já
  // ficou vinculado a ele (FK on delete restrict), então só desativa.
  await page.goto('/atendentes')
  await page.getByRole('button', { name: `Editar ${attendantName}` }).click()
  await page.getByText('Atendente ativo').click()
  await page.getByRole('button', { name: 'Salvar' }).click()
})
