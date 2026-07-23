"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isManager } from "@/lib/data/auth";
import { boundedText, LIMITS, optionalCoordinate } from "@/lib/validation";

function venueValues(formData: FormData) {
  const name = boundedText(formData.get("place"), LIMITS.shortText);
  const address = boundedText(formData.get("place_address"), 200);
  const lat = optionalCoordinate(formData.get("place_lat"), -90, 90);
  const lng = optionalCoordinate(formData.get("place_lng"), -180, 180);
  if (!name || !address || lat === undefined || lng === undefined) return null;
  return {
    name,
    address,
    lat,
    lng,
  };
}

export async function addVenue(formData: FormData) {
  if (!(await isManager())) return { ok: false, message: "경기장 등록 권한이 없어요" };
  const venue = venueValues(formData);
  if (!venue) return { ok: false, message: "경기장명과 주소를 다시 확인해 주세요" };

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
  if (!(await isManager())) return { ok: false, message: "경기장 수정 권한이 없어요" };
  const id = String(formData.get("id") ?? "");
  const venue = venueValues(formData);
  if (!id || !venue) return { ok: false, message: "경기장 정보를 다시 확인해 주세요" };

  const supabase = await createClient();
  const { error } = await supabase.from("venues").update(venue).eq("id", id);
  if (error) {
    return {
      ok: false,
      message: error.code === "23505" ? "이미 등록된 경기장이에요" : "경기장을 수정하지 못했어요",
    };
  }
  revalidatePath("/admin/team");
  return { ok: true, message: "경기장 정보가 수정됐어요" };
}

export async function removeVenue(formData: FormData) {
  if (!(await isManager())) return { ok: false, message: "경기장 삭제 권한이 없어요" };
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, message: "삭제할 경기장을 찾을 수 없어요" };

  const supabase = await createClient();
  const { error } = await supabase.from("venues").delete().eq("id", id);
  if (error) return { ok: false, message: "경기장을 삭제하지 못했어요" };
  revalidatePath("/admin/team");
  return { ok: true, message: "경기장이 삭제됐어요" };
}
