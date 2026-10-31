import { supabase } from "./supabase";

export async function getCourseName(courseId) {
  const { data } = await supabase
    .from("course")
    .select("courseName")
    .eq("course_id", courseId)
    .maybeSingle();
  return data?.courseName ?? "Course";
}

export async function getCourseMaterials(courseId, materialType) {
  const { data, error } = await supabase
    .from("learning_material")
    .select("*, module!inner(course_id, is_diagnostic)")
    .eq("module.course_id", courseId)
    .eq("module.is_diagnostic", false)
    .eq("materialType", materialType)
    .order("position", { ascending: true, nullsFirst: false })
    .order("uploadedAt", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getUploadModuleId(courseId) {
  const { data } = await supabase
    .from("module")
    .select("module_id")
    .eq("course_id", courseId)
    .eq("is_diagnostic", false)
    .order("module_id")
    .limit(1)
    .maybeSingle();
  return data?.module_id ?? null;
}

export async function deleteMaterials(items) {
  const failed = [];
  let deleted = 0;
  for (const item of items) {
    if (item.storagePath) {
      await supabase.storage
        .from("learning-materials")
        .remove([item.storagePath]);
    }
    const { error } = await supabase
      .from("learning_material")
      .delete()
      .eq("material_id", item.material_id);
    if (error) failed.push(`${item.title}: ${error.message}`);
    else deleted++;
  }
  return { deleted, failed };
}

export async function saveMaterialOrder(ids) {
  const { error } = await supabase.rpc("set_material_order", { p_ids: ids });
  if (error) throw new Error(error.message);
}

export const extractYoutubeId = (url) => {
  const match = (url || "").match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  );
  return match ? match[1] : null;
};

export const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

export const formatBytes = (bytes) => {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
