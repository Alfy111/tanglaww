import { supabase } from "./supabase";

const BUCKET = "carousel";

export async function getSlides() {
  const { data, error } = await supabase
    .from("carousel_slide")
    .select("slide_id, image_url, storage_path, position")
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function addSlide(file, position) {
  if (!file) return null;

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw new Error(userError.message);
  if (!user) throw new Error("You must be signed in to add a dashboard photo.");

  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const storagePath = `slide_${Date.now()}_${Math.random().toString(36).slice(2)}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, {
      contentType: file.type || "image/jpeg",
      upsert: false,
    });

  if (uploadError) throw new Error(uploadError.message);

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  const { data, error: insertError } = await supabase
    .from("carousel_slide")
    .insert({
      image_url: urlData.publicUrl,
      storage_path: storagePath,
      position,
      admin_id: user.id,
    })
    .select("slide_id, image_url, storage_path, position")
    .single();

  if (insertError) {
    const { error: cleanupError } = await supabase.storage.from(BUCKET).remove([storagePath]);
    if (cleanupError) console.error("Failed to remove uploaded carousel image after insert failure", cleanupError);
    throw new Error(insertError.message);
  }

  return data;
}

export async function deleteSlide(slide) {
  const { error: deleteError } = await supabase
    .from("carousel_slide")
    .delete()
    .eq("slide_id", slide.slide_id);

  if (deleteError) throw new Error(deleteError.message);

  const { error: storageError } = await supabase.storage
    .from(BUCKET)
    .remove([slide.storage_path]);

  if (storageError) {
    throw new Error(`Photo removed from the carousel, but its stored image could not be deleted: ${storageError.message}`);
  }
}

export async function swapSlides(first, second) {
  const { error: firstError } = await supabase
    .from("carousel_slide")
    .update({ position: second.position })
    .eq("slide_id", first.slide_id);
  if (firstError) throw new Error(firstError.message);

  const { error: secondError } = await supabase
    .from("carousel_slide")
    .update({ position: first.position })
    .eq("slide_id", second.slide_id);
  if (secondError) throw new Error(secondError.message);
}
