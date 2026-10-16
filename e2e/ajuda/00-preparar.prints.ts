import { test } from '@playwright/test'
import { prepararBrasa } from './brasa-seed'

// Primeiro arquivo da rodada de prints: garante a loja "Brasa Burger" pronta no staging.
test('preparar a loja de teste Brasa Burger', async ({ browser }) => {
  const ids = await prepararBrasa(browser)
  console.log(`Brasa Burger pronta: ${Object.keys(ids.products).length} produtos, ${ids.attendants.length} atendentes`)
})
