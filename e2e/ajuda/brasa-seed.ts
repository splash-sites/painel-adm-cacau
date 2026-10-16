// Prepara a loja de teste "Brasa Burger" no STAGING para os prints da central de ajuda.
// Idempotente: cria só o que falta (loja, contas, catálogo, histórico) e completa os
// pedidos do dia quando o quadro está vazio. Nunca roda contra produção (ver config).
import type { Browser } from '@playwright/test'

const URL = process.env.VITE_SUPABASE_URL!
const KEY = process.env.VITE_SUPABASE_ANON_KEY!
export const BRASA_SLUG = 'brasa-burger'

export const DONO = { email: process.env.AJUDA_DONO_EMAIL!, password: process.env.AJUDA_DONO_PASSWORD!, name: 'Ana Ribeiro' }
export const ADMIN = { email: process.env.AJUDA_ADMIN_EMAIL!, password: process.env.AJUDA_ADMIN_PASSWORD!, name: 'Suporte Prestio' }
const SEED_SUPER = { email: process.env.E2E_SUPER_EMAIL!, password: process.env.E2E_SUPER_PASSWORD! }

type Json = Record<string, unknown>

async function signIn(account: { email: string; password: string }): Promise<string | null> {
  const r = await fetch(`${URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: account.email, password: account.password }),
  })
  if (!r.ok) return null
  return ((await r.json()) as { access_token: string }).access_token
}

function client(token: string | null) {
  const headers = (extra: Json = {}) => ({
    apikey: KEY,
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  })
  return {
    async get<T = Json[]>(path: string): Promise<T> {
      const r = await fetch(`${URL}/rest/v1/${path}`, { headers: headers() })
      if (!r.ok) throw new Error(`GET ${path}: ${r.status} ${await r.text()}`)
      return r.json() as Promise<T>
    },
    async post<T = Json[]>(path: string, body: unknown): Promise<T> {
      const r = await fetch(`${URL}/rest/v1/${path}`, {
        method: 'POST',
        headers: headers({ Prefer: 'return=representation' }),
        body: JSON.stringify(body),
      })
      if (!r.ok) throw new Error(`POST ${path}: ${r.status} ${await r.text()}`)
      const text = await r.text()
      return (text ? JSON.parse(text) : null) as T
    },
    async patch(path: string, body: unknown) {
      const r = await fetch(`${URL}/rest/v1/${path}`, { method: 'PATCH', headers: headers(), body: JSON.stringify(body) })
      if (!r.ok) throw new Error(`PATCH ${path}: ${r.status} ${await r.text()}`)
    },
    async rpc<T = unknown>(fn: string, body: unknown): Promise<T> {
      const r = await fetch(`${URL}/rest/v1/rpc/${fn}`, { method: 'POST', headers: headers(), body: JSON.stringify(body) })
      if (!r.ok) throw new Error(`RPC ${fn}: ${r.status} ${await r.text()}`)
      const text = await r.text()
      return (text ? JSON.parse(text) : null) as T
    },
    async upload(bucket: string, path: string, png: Buffer): Promise<string> {
      const r = await fetch(`${URL}/storage/v1/object/${bucket}/${path}`, {
        method: 'POST',
        headers: { apikey: KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'image/png' },
        body: new Uint8Array(png),
      })
      if (!r.ok) throw new Error(`upload ${path}: ${r.status} ${await r.text()}`)
      return `${URL}/storage/v1/object/public/${bucket}/${path}`
    },
  }
}

// ---------- dados fictícios ----------

function validCpf(seed: number): string {
  const base = String(100000000 + ((seed * 7919) % 899999999)).slice(0, 9).split('').map(Number)
  const dv = (digits: number[]) => {
    const sum = digits.reduce((acc, d, i) => acc + d * (digits.length + 1 - i), 0)
    const rest = (sum * 10) % 11
    return rest === 10 ? 0 : rest
  }
  const d1 = dv(base)
  const d2 = dv([...base, d1])
  return [...base, d1, d2].join('')
}

const CLIENTES = [
  'Mariana Lopes', 'João Pedro Silva', 'Fernanda Rocha', 'Lucas Martins', 'Patrícia Gomes', 'Rafael Lima',
  'Camila Duarte', 'Tiago Nunes', 'Beatriz Alves', 'Gustavo Reis', 'Larissa Teixeira', 'Eduardo Prado',
  'Renata Campos', 'Felipe Moura', 'Juliana Freitas', 'André Barros', 'Sofia Cardoso', 'Bruno Farias',
]
const cliente = (i: number) => ({
  name: CLIENTES[i % CLIENTES.length],
  cpf: validCpf(i + 11),
  phone: `519${String(80000000 + i * 1373).slice(0, 8)}`,
})

type Category = 'Burgers' | 'Acompanhamentos' | 'Bebidas' | 'Sobremesas' | 'Revenda'
interface ProductSeed {
  code: string
  name: string
  category: Category
  description: string
  price: number
  lover: number
  emoji: string
  color: string
  ponto?: boolean
  tamanho?: boolean
  adicionais?: boolean
  molhos?: boolean
  stock?: number
  active?: boolean
  reseller?: number
}

const PRODUTOS: ProductSeed[] = [
  { code: 'B01', name: 'Brasa Clássico', category: 'Burgers', description: 'Pão brioche, blend de 160 g, queijo prato e molho da casa', price: 32, lover: 29, emoji: '🍔', color: '#f4b860', ponto: true, adicionais: true, molhos: true },
  { code: 'B02', name: 'Brasa Bacon', category: 'Burgers', description: 'Blend de 160 g, bacon crocante, cheddar e cebola caramelizada', price: 38, lover: 34, emoji: '🥓', color: '#e8875c', ponto: true, adicionais: true, molhos: true },
  { code: 'B03', name: 'Duplo Cheddar', category: 'Burgers', description: 'Dois blends de 120 g e muito cheddar cremoso', price: 44, lover: 40, emoji: '🧀', color: '#f2c94c', ponto: true, adicionais: true, molhos: true },
  { code: 'B04', name: 'Veggie da Casa', category: 'Burgers', description: 'Hambúrguer de grão-de-bico, rúcula e tomate assado', price: 34, lover: 31, emoji: '🥗', color: '#8cc084', adicionais: true, molhos: true },
  { code: 'A01', name: 'Batata frita', category: 'Acompanhamentos', description: 'Crocante, com sal e alecrim', price: 12, lover: 11, emoji: '🍟', color: '#f6d365', tamanho: true, molhos: true },
  { code: 'A02', name: 'Onion rings', category: 'Acompanhamentos', description: 'Anéis de cebola empanados', price: 18, lover: 16, emoji: '🧅', color: '#e9b872', molhos: true },
  { code: 'A03', name: 'Nuggets (8 un.)', category: 'Acompanhamentos', description: 'Frango empanado, acompanha um molho', price: 19, lover: 17, emoji: '🍗', color: '#d9a05b', molhos: true },
  { code: 'D01', name: 'Refrigerante lata', category: 'Bebidas', description: '350 ml', price: 7, lover: 6, emoji: '🥤', color: '#e05d5d', stock: 48 },
  { code: 'D02', name: 'Suco natural', category: 'Bebidas', description: 'Laranja ou limão, 400 ml', price: 10, lover: 9, emoji: '🍊', color: '#f7a440' },
  { code: 'D03', name: 'Água mineral', category: 'Bebidas', description: '500 ml, com ou sem gás', price: 5, lover: 5, emoji: '💧', color: '#7fb7e6', stock: 30 },
  { code: 'D04', name: 'Milkshake de chocolate', category: 'Bebidas', description: '400 ml, com calda e chantilly', price: 19, lover: 17, emoji: '🥛', color: '#a9746e', stock: 6 },
  { code: 'S01', name: 'Brownie com sorvete', category: 'Sobremesas', description: 'Brownie quente com sorvete de creme', price: 17, lover: 15, emoji: '🍫', color: '#8b5a3c', stock: 12 },
  { code: 'S02', name: 'Petit gâteau', category: 'Sobremesas', description: 'Volta na próxima semana', price: 21, lover: 19, emoji: '🍰', color: '#c98b6b', active: false },
  { code: 'R01', name: 'Hambúrguer congelado (caixa com 10)', category: 'Revenda', description: 'Blend 160 g, para revenda', price: 89, lover: 89, emoji: '📦', color: '#c1a27c', reseller: 40 },
  { code: 'R02', name: 'Molho da casa 250 ml', category: 'Revenda', description: 'Pote fechado, validade de 30 dias', price: 18, lover: 18, emoji: '🫙', color: '#d8a15f', reseller: 120 },
]

/** Desenha a foto do produto (emoji sobre fundo colorido) com o navegador do Playwright. */
export async function renderImage(browser: Browser, emojis: string, color: string, width: number, height: number): Promise<Buffer> {
  const page = await browser.newPage({ viewport: { width, height } })
  await page.setContent(`<body style="margin:0"><div style="width:${width}px;height:${height}px;display:grid;place-items:center;
    background:radial-gradient(circle at 30% 25%, #fff6 0, transparent 45%), ${color};font-size:${Math.round(height * 0.5)}px;
    font-family:'Segoe UI Emoji','Apple Color Emoji','Noto Color Emoji',sans-serif">${emojis}</div></body>`)
  const png = await page.screenshot({ type: 'png' })
  await page.close()
  return png
}

// ---------- preparo ----------

export interface BrasaIds {
  storeId: string
  products: Record<string, string>
  variation: Record<string, string>
  addon: Record<string, string>
  attendants: string[]
  promoCombo: string
}

export async function prepararBrasa(browser: Browser): Promise<BrasaIds> {
  for (const [k, v] of Object.entries({ DONO_EMAIL: DONO.email, DONO_PASSWORD: DONO.password, ADMIN_EMAIL: ADMIN.email, ADMIN_PASSWORD: ADMIN.password })) {
    if (!v) throw new Error(`Falta AJUDA_${k} no .env.staging.local`)
  }
  const seedToken = await signIn(SEED_SUPER)
  if (!seedToken) throw new Error('Não deu para entrar com E2E_SUPER_EMAIL/PASSWORD no staging')
  const sup = client(seedToken)

  // loja
  let [store] = await sup.get<Json[]>(`stores?select=id&slug=eq.${BRASA_SLUG}`)
  if (!store) {
    ;[store] = await sup.post<Json[]>('stores', {
      name: 'Brasa Burger', slug: BRASA_SLUG, active: true, supports_dine_in: true, supports_pickup: true,
      supports_delivery: true, reseller_enabled: true, whatsapp_number: '5551900000000',
    })
  }
  const storeId = store.id as string

  // contas: dona da loja (store_admin) e um administrador geral
  for (const [account, role] of [[DONO, 'store_admin'], [ADMIN, 'super_admin']] as const) {
    if (await signIn(account)) continue
    const r = await fetch(`${URL}/functions/v1/create-admin-user`, {
      method: 'POST',
      headers: { apikey: KEY, Authorization: `Bearer ${seedToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName: account.name, email: account.email, password: account.password, role, storeId: role === 'store_admin' ? storeId : undefined }),
    })
    if (!r.ok) throw new Error(`create-admin-user (${account.email}): ${r.status} ${await r.text()}`)
  }
  const donoToken = await signIn(DONO)
  if (!donoToken) throw new Error('Conta da dona da Brasa não entrou')
  const dono = client(donoToken)

  // catálogo
  const existing = await dono.get<Json[]>(`products?select=id,external_code&store_id=eq.${storeId}`)
  if (existing.length < PRODUTOS.length) await criarCatalogo(browser, dono, storeId)

  const products = Object.fromEntries(
    (await dono.get<Json[]>(`products?select=id,external_code&store_id=eq.${storeId}`)).map((p) => [p.external_code, p.id]),
  ) as Record<string, string>
  const variation = Object.fromEntries(
    (await dono.get<Json[]>(`variation_options?select=id,name,variation_groups!inner(store_id)&variation_groups.store_id=eq.${storeId}`)).map((v) => [v.name, v.id]),
  ) as Record<string, string>
  const addon = Object.fromEntries(
    (await dono.get<Json[]>(`addon_options?select=id,name,addon_groups!inner(store_id)&addon_groups.store_id=eq.${storeId}`)).map((a) => [a.name, a.id]),
  ) as Record<string, string>
  let attendants = (await dono.get<Json[]>(`attendants?select=id&store_id=eq.${storeId}&active=eq.true&order=name`)).map((a) => a.id as string)
  if (attendants.length === 0) {
    await dono.post('attendants', ['Bruno Alves', 'Carla Menezes', 'Diego Souza'].map((name) => ({ store_id: storeId, name, active: true })))
    attendants = (await dono.get<Json[]>(`attendants?select=id&store_id=eq.${storeId}&order=name`)).map((a) => a.id as string)
  }

  let [promo] = await dono.get<Json[]>(`promotions?select=id&store_id=eq.${storeId}&title=eq.Combo%20Brasa`)
  if (!promo) {
    const banner = await renderImage(browser, '🍔🍟🥤', '#e8a75c', 1200, 600)
    const url = await dono.upload('promotions', `${storeId}/combo-brasa-${Date.now()}.png`, banner)
    ;[promo] = await dono.post<Json[]>('promotions', {
      store_id: storeId, title: 'Combo Brasa', subtitle: 'Brasa Clássico, batata frita e refri', badge_label: 'Combo da semana',
      image_url: url, product_id: products.B01, active: true, sort_order: 0, discount_type: 'percent', discount_value: 10,
    })
    await dono.post('promotion_combo_items', [
      { promotion_id: promo.id, product_id: products.A01, quantity: 1 },
      { promotion_id: promo.id, product_id: products.D01, quantity: 1 },
    ])
    const banner2 = await renderImage(browser, '🥓🔥', '#c4573a', 1200, 600)
    const url2 = await dono.upload('promotions', `${storeId}/terca-do-bacon-${Date.now()}.png`, banner2)
    await dono.post('promotions', {
      store_id: storeId, title: 'Terça do Bacon', subtitle: 'Brasa Bacon com R$ 5 de desconto', badge_label: 'Só às terças',
      image_url: url2, product_id: products.B02, active: true, sort_order: 1, discount_type: 'fixed_amount', discount_value: 5,
    })
  }

  const ids: BrasaIds = { storeId, products, variation, addon, attendants, promoCombo: promo.id as string }
  await reporEstoque(dono, ids)
  await garantirPedidos(dono, ids)
  await reporEstoque(dono, ids)
  return ids
}

async function criarCatalogo(browser: Browser, dono: ReturnType<typeof client>, storeId: string) {
  const cats: Category[] = ['Burgers', 'Acompanhamentos', 'Bebidas', 'Sobremesas', 'Revenda']
  const byName = async (table: string, name: string, row: Json) => {
    const [found] = await dono.get<Json[]>(`${table}?select=id&store_id=eq.${storeId}&name=eq.${encodeURIComponent(name)}`)
    return found ?? (await dono.post<Json[]>(table, row))[0]
  }
  const categoryId: Record<string, string> = {}
  for (const [i, name] of cats.entries()) {
    categoryId[name] = (await byName('categories', name, { store_id: storeId, name, active: true, sort_order: i })).id as string
  }
  const optionsOf = async (table: string, groupId: unknown, rows: Json[]) => {
    const have = await dono.get<Json[]>(`${table}?select=id&group_id=eq.${groupId}`)
    if (have.length === 0) await dono.post(table, rows.map((o, i) => ({ ...o, group_id: groupId, active: true, sort_order: i })))
  }

  const ponto = await byName('variation_groups', 'Ponto da carne', { store_id: storeId, name: 'Ponto da carne', price_mode: 'additive', active: true, sort_order: 0 })
  await optionsOf('variation_options', ponto.id, ['Mal passado', 'Ao ponto', 'Bem passado'].map((name) => ({ name, price: 0, lover_price: 0 })))
  const tamanho = await byName('variation_groups', 'Tamanho', { store_id: storeId, name: 'Tamanho', price_mode: 'replace', active: true, sort_order: 1 })
  await optionsOf('variation_options', tamanho.id, [
    { name: 'Pequena', price: 12, lover_price: 11 },
    { name: 'Média', price: 16, lover_price: 14 },
    { name: 'Grande', price: 20, lover_price: 18 },
  ])
  const adicionais = await byName('addon_groups', 'Turbine seu burger', { store_id: storeId, name: 'Turbine seu burger', active: true, sort_order: 0 })
  await optionsOf('addon_options', adicionais.id, [
    { name: 'Bacon', price: 5, lover_price: 4 },
    { name: 'Cheddar extra', price: 4, lover_price: 3.5 },
    { name: 'Ovo', price: 3, lover_price: 3 },
    { name: 'Cebola caramelizada', price: 4, lover_price: 3.5 },
  ])
  const molhos = await byName('addon_groups', 'Molhos', { store_id: storeId, name: 'Molhos', active: true, sort_order: 1 })
  await optionsOf('addon_options', molhos.id, [
    { name: 'Barbecue', price: 2, lover_price: 2 },
    { name: 'Maionese da casa', price: 2, lover_price: 2 },
    { name: 'Mostarda e mel', price: 2, lover_price: 2 },
  ])

  const have = new Set((await dono.get<Json[]>(`products?select=external_code&store_id=eq.${storeId}`)).map((p) => p.external_code))
  for (const [i, p] of PRODUTOS.entries()) {
    if (have.has(p.code)) continue
    const png = await renderImage(browser, p.emoji, p.color, 600, 600)
    const image = await dono.upload('product-images', `${storeId}/${p.code.toLowerCase()}-${Date.now()}.png`, png)
    const isReseller = p.reseller !== undefined
    const [row] = await dono.post<Json[]>('products', {
      store_id: storeId, external_code: p.code, name: p.name, category: p.category, category_id: categoryId[p.category],
      description: p.description, image_url: image, unit: 'UN', price: p.price, lover_price: p.lover, cost_price: Math.round(p.price * 0.38 * 100) / 100,
      track_stock: p.stock !== undefined, stock_quantity: p.stock ?? 0, active: p.active ?? true, sort_order: i,
      available_dine_in: !isReseller, available_pickup: !isReseller, available_delivery: false,
      available_reseller: isReseller, reseller_track_stock: isReseller, reseller_stock_quantity: p.reseller ?? 0,
    })
    if (p.ponto) await dono.post('product_variation_groups', { product_id: row.id, variation_group_id: ponto.id, sort_order: 0 })
    if (p.tamanho) await dono.post('product_variation_groups', { product_id: row.id, variation_group_id: tamanho.id, sort_order: 0 })
    if (p.adicionais) await dono.post('product_addon_groups', { product_id: row.id, addon_group_id: adicionais.id, selection_type: 'multiple', max_quantity: 3, sort_order: 0 })
    if (p.molhos) await dono.post('product_addon_groups', { product_id: row.id, addon_group_id: molhos.id, selection_type: 'multiple', max_quantity: 2, sort_order: 1 })
  }
}

/** Deixa os saldos como no cadastro (pedidos de teste descontam estoque). */
async function reporEstoque(dono: ReturnType<typeof client>, ids: BrasaIds) {
  for (const p of PRODUTOS) {
    if (p.stock !== undefined) await dono.patch(`products?id=eq.${ids.products[p.code]}`, { stock_quantity: p.stock })
    if (p.reseller !== undefined) await dono.patch(`products?id=eq.${ids.products[p.code]}`, { reseller_stock_quantity: p.reseller })
  }
}

// ---------- pedidos ----------

interface ItemSeed {
  code: string
  qty: number
  variations?: string[]
  addons?: string[]
  note?: string
}

async function criarPedido(
  ids: BrasaIds,
  c: ReturnType<typeof cliente>,
  type: 'pickup' | 'delivery' | 'dine_in',
  items: ItemSeed[],
  opts: { table?: string; channel?: 'retail' | 'reseller' } = {},
): Promise<string> {
  const anon = client(null)
  return anon.rpc<string>('confirm_order', {
    p_store_id: ids.storeId,
    p_order_type: type,
    p_customer_name: c.name,
    p_customer_cpf: c.cpf,
    p_customer_phone: type === 'dine_in' ? null : c.phone,
    p_delivery_address: type === 'delivery' ? { street: 'Rua das Palmeiras', number: String(100 + (c.name.length * 7)), neighborhood: 'Centro', city: 'Torres', state: 'RS', zipCode: '95560-000' } : null,
    p_items: items.map((it) => ({
      product_id: ids.products[it.code],
      quantity: it.qty,
      note: it.note ?? null,
      addons: (it.addons ?? []).map((name) => ({ addon_option_id: ids.addon[name], quantity: 1 })),
      variations: (it.variations ?? []).map((name) => ({ variation_option_id: ids.variation[name] })),
    })),
    p_table_number: opts.table ?? null,
    p_sales_channel: opts.channel ?? 'retail',
  })
}

async function avancar(dono: ReturnType<typeof client>, orderId: string, steps: string[], attendant: string) {
  for (const status of steps) {
    await dono.rpc('change_order_status', { p_order_id: orderId, p_new_status: status, p_attendant_id: status === 'preparing' ? attendant : null })
  }
}

const CARDAPIO_VARIADO: ItemSeed[][] = [
  [{ code: 'B01', qty: 1, variations: ['Ao ponto'], addons: ['Bacon'] }, { code: 'A01', qty: 1, variations: ['Média'] }, { code: 'D01', qty: 1 }],
  [{ code: 'B02', qty: 2, variations: ['Ao ponto'] }, { code: 'D02', qty: 2 }],
  [{ code: 'B03', qty: 1, variations: ['Bem passado'], addons: ['Cheddar extra'] }, { code: 'A02', qty: 1 }],
  [{ code: 'B04', qty: 1 }, { code: 'D03', qty: 1 }],
  [{ code: 'A03', qty: 1, addons: ['Barbecue'] }, { code: 'D02', qty: 1 }],
  [{ code: 'B01', qty: 2, variations: ['Mal passado'] }, { code: 'A01', qty: 1, variations: ['Grande'] }, { code: 'A02', qty: 1 }],
]

async function garantirPedidos(dono: ReturnType<typeof client>, ids: BrasaIds) {
  const [a1, a2, a3] = ids.attendants
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  // histórico dos últimos 14 dias, pros relatórios terem o que mostrar
  const finalizados = await dono.get<Json[]>(`orders?select=id&store_id=eq.${ids.storeId}&status=eq.finalized`)
  if (finalizados.length < 30) {
    for (let i = 0; i < 42; i++) {
      const c = cliente(i + (i % 5 === 0 ? 0 : 3))
      const type = (['pickup', 'delivery', 'dine_in'] as const)[i % 3]
      const id = await criarPedido(ids, c, type, CARDAPIO_VARIADO[i % CARDAPIO_VARIADO.length], { table: type === 'dine_in' ? String(1 + (i % 9)) : undefined })
      if (i % 11 === 4) {
        await dono.rpc('change_order_status', { p_order_id: id, p_new_status: 'cancelled', p_reason: i % 2 ? 'Item em falta' : 'Cliente desistiu' })
      } else {
        const steps = type === 'dine_in' ? ['preparing', 'delivered', 'finalized'] : ['preparing', 'out_for_delivery', 'delivered', 'finalized']
        await avancar(dono, id, steps, [a1, a2, a3][i % 3])
        if (i % 3 === 1) await dono.rpc('set_order_lover', { p_order_id: id, p_is_lover: true }).catch(() => undefined)
      }
      const quando = new Date(Date.now() - (1 + (i % 14)) * 86_400_000)
      quando.setHours([11, 12, 12, 13, 19, 19, 20, 20, 21, 18][i % 10], (i * 13) % 60, 0, 0)
      const fim = new Date(quando.getTime() + (12 + (i % 15)) * 60_000).toISOString()
      await dono.patch(`orders?id=eq.${id}`, { created_at: quando.toISOString(), updated_at: fim }).catch(() => undefined)
      // horários das etapas, pro tempo médio de preparo dos relatórios fazer sentido
      const preparo = new Date(quando.getTime() + 3 * 60_000).toISOString()
      await dono.patch(`order_status_history?order_id=eq.${id}&status=eq.received`, { changed_at: quando.toISOString() })
      await dono.patch(`order_status_history?order_id=eq.${id}&status=eq.preparing`, { changed_at: preparo })
      await dono.patch(`order_status_history?order_id=eq.${id}&status=not.in.(received,preparing)`, { changed_at: fim })
    }
  }

  // quadro de hoje: pedidos em todas as colunas
  const deHoje = await dono.get<Json[]>(`orders?select=id&store_id=eq.${ids.storeId}&created_at=gte.${hoje.toISOString()}&status=neq.cancelled`)
  if (deHoje.length >= 8) return
  const novo1 = await criarPedido(ids, cliente(0), 'pickup', [
    { code: 'B01', qty: 1, variations: ['Ao ponto'], addons: ['Bacon', 'Cheddar extra'], note: 'Sem cebola, por favor' },
    { code: 'A01', qty: 1, variations: ['Média'], addons: ['Barbecue'] },
    { code: 'D01', qty: 2 },
  ])
  await criarPedido(ids, cliente(1), 'delivery', [{ code: 'B02', qty: 2, variations: ['Bem passado'] }, { code: 'A02', qty: 1 }, { code: 'D02', qty: 2 }])
  await criarPedido(ids, cliente(2), 'dine_in', [{ code: 'B04', qty: 1 }, { code: 'D03', qty: 1 }], { table: '5' })
  const prep1 = await criarPedido(ids, cliente(3), 'pickup', [{ code: 'B03', qty: 1, variations: ['Ao ponto'] }, { code: 'D04', qty: 1 }])
  await avancar(dono, prep1, ['preparing'], a2)
  const prep2 = await criarPedido(ids, cliente(4), 'dine_in', [{ code: 'A03', qty: 1, addons: ['Mostarda e mel'] }, { code: 'D01', qty: 1 }], { table: '3' })
  await avancar(dono, prep2, ['preparing'], a1)
  const pronto = await criarPedido(ids, cliente(5), 'pickup', [{ code: 'B01', qty: 1, variations: ['Mal passado'] }])
  await avancar(dono, pronto, ['preparing', 'out_for_delivery'], a3)
  const saiu = await criarPedido(ids, cliente(6), 'delivery', [{ code: 'B02', qty: 1, variations: ['Ao ponto'] }, { code: 'D01', qty: 1 }])
  await avancar(dono, saiu, ['preparing', 'out_for_delivery'], a1)
  for (const [i, items] of [
    [7, [{ code: 'B01', qty: 1, variations: ['Ao ponto'] }, { code: 'D02', qty: 1 }]],
    [8, [{ code: 'B04', qty: 1 }, { code: 'S01', qty: 1 }]],
  ] as const) {
    const mesa = await criarPedido(ids, cliente(i), 'dine_in', items as ItemSeed[], { table: '7' })
    await avancar(dono, mesa, ['preparing', 'delivered'], a2)
  }
  const entregue = await criarPedido(ids, cliente(9), 'delivery', [{ code: 'B03', qty: 1, variations: ['Ao ponto'] }])
  await avancar(dono, entregue, ['preparing', 'out_for_delivery', 'delivered'], a3)
  for (const i of [10, 11]) {
    const fim = await criarPedido(ids, cliente(i), 'pickup', CARDAPIO_VARIADO[i % CARDAPIO_VARIADO.length])
    await avancar(dono, fim, ['preparing', 'out_for_delivery', 'delivered', 'finalized'], a1)
  }
  await criarPedido(ids, cliente(12), 'pickup', [{ code: 'R01', qty: 3 }, { code: 'R02', qty: 10 }], { channel: 'reseller' })
  void novo1
}

/**
 * Pedidos novos a cada rodada, um por tutorial da equipe (aceitar, editar, cancelar,
 * voltar etapa, finalizar com preço de clube e fechar a conta da mesa), pra o print
 * sempre ter o pedido no estado certo mesmo depois de rodadas anteriores.
 */
export async function pedidosDosTutoriais(ids: BrasaIds) {
  const token = await signIn(DONO)
  const dono = client(token)
  const [a1, a2] = ids.attendants
  const aceitar = await criarPedido(ids, cliente(13), 'pickup', [
    { code: 'B02', qty: 1, variations: ['Ao ponto'], addons: ['Cheddar extra'], note: 'Bem caprichado no molho' },
    { code: 'A01', qty: 1, variations: ['Média'] },
  ])
  const cancelar = await criarPedido(ids, cliente(14), 'delivery', [{ code: 'B03', qty: 2, variations: ['Bem passado'] }, { code: 'D02', qty: 2 }])
  const voltar = await criarPedido(ids, cliente(15), 'pickup', [{ code: 'B04', qty: 1 }, { code: 'D03', qty: 1 }])
  await avancar(dono, voltar, ['preparing', 'out_for_delivery'], a1)
  const finalizar = await criarPedido(ids, cliente(16), 'pickup', [{ code: 'B01', qty: 2, variations: ['Ao ponto'] }, { code: 'D01', qty: 2 }])
  await avancar(dono, finalizar, ['preparing', 'out_for_delivery', 'delivered'], a2)
  const mesa = '9'
  for (const i of [17, 0]) {
    const id = await criarPedido(ids, cliente(i), 'dine_in', [{ code: 'B01', qty: 1, variations: ['Ao ponto'] }, { code: 'D02', qty: 1 }], { table: mesa })
    await avancar(dono, id, ['preparing', 'delivered'], a1)
  }
  await reporEstoque(dono, ids)
  return { aceitar, cancelar, voltar, finalizar, mesa }
}
