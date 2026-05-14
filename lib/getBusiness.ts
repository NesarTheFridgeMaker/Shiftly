import { supabase } from "./supabaseClient";
import { getBusinessId } from "./getBusinessId";

export async function getBusiness() {
  const businessId = await getBusinessId();

  if (!businessId) return null;

  const { data, error } = await supabase
    .from("businesses")
    .select("name")
    .eq("id", businessId)
    .single();

  if (error) {
    console.error(error);
    return null;
  }

  return data;
}