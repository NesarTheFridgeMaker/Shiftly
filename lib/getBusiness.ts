import { supabase } from "./supabaseClient";
import { getBusinessId } from "./getBusinessId";

export type Business = {
  id: string;
  name: string;
  status: string;
};

export async function getBusiness(): Promise<Business | null> {
  const businessId = await getBusinessId();

  if (!businessId) return null;

  const { data, error } = await supabase
    .from("businesses")
    .select("id, name, status")
    .eq("id", businessId)
    .single();

  if (error) {
    console.error(error);
    return null;
  }

  return data as Business;
}