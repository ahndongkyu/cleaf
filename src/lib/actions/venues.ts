"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isManager } from "@/lib/data/auth";

function venueValues(formData: FormData) {
  const name = String(formData.get("place") ?? "").trim();
  const address = String(formData.get("place_address") ?? "").trim();
  const latValue = String(formData.get("place_lat") ?? "").trim();
  const lngValue = String(formData.get("place_lng") ?? "").trim();
  return {
    name,
    address,
    lat: latValue ? Number(latValue) : null,
    lng: lngValue ? Number(lngValue) : null,
  };
}

export async function addVenue(formData: FormData) {
  if (!(await isManager())) return { ok: false, message: "경기장 등록 권한이 없어요" };
  const venue = venueValues(formData);
  if (!venue.name || !venue.address) return { ok: false, message: "경기장명과 주소를 입력해 주세요" };

  const supabase = await createClient();
  const { error } = await supabase.from("venues").insert(venue);
  if (error) {
    return {
      ok: false,
      message: error.code === "23505" ? "이미 등록된 경기장이에요" : "경기장을 등록하지 못했어요",
    };
  }
  revalidatePath("/admin/team");
  return { ok: true, message: "경기장 등록 완료" };
}

export async function updateVenue(formData: FormData) {
  if (!(await isManager())) return;
  const id = String(formData.get("id") ?? "");
  const venue = venueValues(formData);
  if (!id || !venue.name || !venue.address) return;

  const supabase = await createClient();
  await supabase.from("venues").update(venue).eq("id", id);
  revalidatePath("/admin/team");
}

export async function removeVenue(formData: FormData) {
  if (!(await isManager())) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("venues").delete().eq("id", id);
  revalidatePath("/admin/team");
}
