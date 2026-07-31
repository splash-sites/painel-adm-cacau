import { supabase } from '../supabase/client'

export async function uploadPromotionImage(storeId: string, file: File): Promise<string> {
  const path = `${storeId}/${crypto.randomUUID()}-${file.name}`

  const { error } = await supabase.storage.from('promotions').upload(path, file)
  if (error) throw new Error(error.message)

  const { data } = supabase.storage.from('promotions').getPublicUrl(path)
  return data.publicUrl
}
