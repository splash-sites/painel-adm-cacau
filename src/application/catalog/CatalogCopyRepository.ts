export interface CopyCatalogParams {
  fromStoreId: string
  toStoreId: string
  /** Produtos que já existem no destino: true = atualiza com os dados da origem, false = pula. */
  updateExisting: boolean
  /**
   * true = só calcula e devolve o resumo, não grava nada (prévia).
   * false = grava — e aí `password` é obrigatória e revalidada na Edge Function.
   */
  dryRun: boolean
  /** Senha do usuário logado. Só usada/exigida quando `dryRun` é false. */
  password?: string
}

export interface CopyCatalogResult {
  dryRun: boolean
  created: number
  updated: number
  skipped: number
  /** Quantas fotos a operação real copiaria/copiou. */
  imageCount: number
  imagesCopied: number
  imageErrors: number
}

export interface CatalogCopyRepository {
  copy(params: CopyCatalogParams): Promise<CopyCatalogResult>
}
