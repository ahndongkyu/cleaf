import { createClient } from "@/lib/supabase/server";

export type ManagerTitle = { id: string; label: string };

export async function getManagerTitles(): Promise<ManagerTitle[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("manager_titles").select("id, label").order("sort").order("created_at");
  return (data ?? []) as ManagerTitle[];
}
