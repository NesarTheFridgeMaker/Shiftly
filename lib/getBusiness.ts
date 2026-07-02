import { supabase } from "./supabaseClient";
import { getBusinessId } from "./getBusinessId";

export type Business = {
  id: string;
  name: string;
  status: string;
  subscription_status: string | null;
  trial_ends_at: string | null;
  current_period_end: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
};

export async function getBusiness(): Promise<Business | null> {
  const businessId = await getBusinessId();

  if (!businessId) return null;

  const { data, error } = await supabase
    .from("businesses")
    .select(
      "id, name, status, subscription_status, trial_ends_at, current_period_end, stripe_customer_id, stripe_subscription_id"
    )
    .eq("id", businessId)
    .single();

  if (error) {
    console.error(error);
    return null;
  }

  return data as Business;
}