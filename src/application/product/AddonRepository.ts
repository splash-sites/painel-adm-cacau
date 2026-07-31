import type { AddonGroup, AddonOption, AddonSelectionType, ProductAddonGroup } from '../../domain/product/Addon'

export interface AddonGroupInput {
  name: string
  active: boolean
}

export interface AddonOptionInput {
  name: string
  price: number
  loverPrice: number | null
  active: boolean
}

export interface ProductAddonGroupInput {
  selectionType: AddonSelectionType
  maxQuantity: number | null
}

export interface AddonRepository {
  listGroups(storeId: string): Promise<AddonGroup[]>
  createGroup(storeId: string, input: AddonGroupInput): Promise<AddonGroup>
  updateGroup(id: string, input: AddonGroupInput): Promise<void>
  deleteGroup(id: string): Promise<void>

  listOptions(groupId: string): Promise<AddonOption[]>
  createOption(groupId: string, input: AddonOptionInput): Promise<AddonOption>
  updateOption(id: string, input: AddonOptionInput): Promise<void>
  deleteOption(id: string): Promise<void>

  listProductAddonGroups(productId: string): Promise<ProductAddonGroup[]>
  linkGroupToProduct(productId: string, addonGroupId: string, input: ProductAddonGroupInput): Promise<void>
  unlinkGroupFromProduct(productId: string, addonGroupId: string): Promise<void>
  /** Grava a nova ordem das seções desse produto — índice no array vira sort_order. */
  reorderProductAddonGroups(productId: string, orderedAddonGroupIds: string[]): Promise<void>
}
