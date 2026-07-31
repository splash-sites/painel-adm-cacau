import type {
  ProductVariationGroup,
  VariationGroup,
  VariationOption,
  VariationPriceMode,
} from '../../domain/product/Variation'

export interface VariationGroupInput {
  name: string
  active: boolean
  priceMode: VariationPriceMode
}

export interface VariationOptionInput {
  name: string
  price: number
  loverPrice: number | null
  active: boolean
}

export interface VariationRepository {
  listGroups(storeId: string): Promise<VariationGroup[]>
  createGroup(storeId: string, input: VariationGroupInput): Promise<VariationGroup>
  updateGroup(id: string, input: VariationGroupInput): Promise<void>
  deleteGroup(id: string): Promise<void>

  listOptions(groupId: string): Promise<VariationOption[]>
  createOption(groupId: string, input: VariationOptionInput): Promise<VariationOption>
  updateOption(id: string, input: VariationOptionInput): Promise<void>
  deleteOption(id: string): Promise<void>

  listProductVariationGroups(productId: string): Promise<ProductVariationGroup[]>
  linkGroupToProduct(productId: string, variationGroupId: string): Promise<void>
  unlinkGroupFromProduct(productId: string, variationGroupId: string): Promise<void>
  /** Grava a nova ordem das seções desse produto — índice no array vira sort_order. */
  reorderProductVariationGroups(productId: string, orderedVariationGroupIds: string[]): Promise<void>
}
