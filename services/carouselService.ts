import * as ImagePicker from "expo-image-picker";
import { readFileBytes } from "../lib/readFileBytes";
import { supabase } from "../lib/supabase";

const BUCKET = "carousel";

export interface Slide {
  slide_id: number;
  image_url: string;
  storage_path: string;
  position: number;
}

export async function getSlides(): Promise<Slide[]> {
  const { data, error } = await supabase
    .from("carousel_slide")
    .select("slide_id, image_url, storage_path, position")
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Slide[];
}
export async function addSlide(nextPosition: number): Promise<boolean> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Please allow access to your photos to add a slide.");
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [16, 9],
    quality: 0.8,
  });
  if (result.canceled) return false;

  const asset = result.assets[0];
  const ext = (asset.fileName?.split(".").pop() ?? "jpg").toLowerCase();
  const storagePath = `slide_${Date.now()}.${ext}`;

  const bytes = await readFileBytes(asset.uri);

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, bytes, {
      contentType: asset.mimeType ?? "image/jpeg",
      upsert: false,
    });
  if (uploadError) throw new Error(uploadError.message);

  const { data: urlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(storagePath);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error: dbError } = await supabase.from("carousel_slide").insert({
    image_url: urlData.publicUrl,
    storage_path: storagePath,
    position: nextPosition,
    admin_id: user?.id ?? null,
  });
  if (dbError) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
    throw new Error(dbError.message);
  }
  return true;
}

export async function deleteSlide(slide: Slide): Promise<void> {
  const { error } = await supabase
    .from("carousel_slide")
    .delete()
    .eq("slide_id", slide.slide_id);
  if (error) throw new Error(error.message);
  await supabase.storage.from(BUCKET).remove([slide.storage_path]);
}

export async function swapSlides(a: Slide, b: Slide): Promise<void> {
  const r1 = await supabase
    .from("carousel_slide")
    .update({ position: b.position })
    .eq("slide_id", a.slide_id);
  if (r1.error) throw new Error(r1.error.message);
  const r2 = await supabase
    .from("carousel_slide")
    .update({ position: a.position })
    .eq("slide_id", b.slide_id);
  if (r2.error) throw new Error(r2.error.message);
}
