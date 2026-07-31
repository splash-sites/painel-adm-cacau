import { supabase } from '../supabase/client'

export async function uploadProductImage(storeId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop()
  const path = `${storeId}/${crypto.randomUUID()}.${ext}`

  const { error } = await supabase.storage.from('product-images').upload(path, file)
  if (error) throw new Error(error.message)

  const { data } = supabase.storage.from('product-images').getPublicUrl(path)
  return data.publicUrl
}
