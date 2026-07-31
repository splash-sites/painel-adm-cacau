export interface ProductImportRow {
  externalCode: string
  name: string
  ncm: string | null
  unit: string | null
  stockQuantity: number
  costPrice: number | null
  price: number
  sortOrder: number
}
