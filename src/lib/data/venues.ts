import { createClient } from "@/lib/supabase/server";

export type Venue = {
  id: string;
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
};

export async function getVenues(): Promise<Venue[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("venues")
    .select("id, name, address, lat, lng")
    .order("name");

  if (error) {
    console.error("getVenues", error);
    return [];
  }
  return (data ?? []) as Venue[];
}
