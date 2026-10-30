import * as DocumentPicker from "expo-document-picker";
import { readFileBytes } from "../lib/readFileBytes";
import { supabase } from "../lib/supabase";
import { deleteMaterial, LearningMaterial } from "./materialService";

export const extractYoutubeId = (url: string): string | null => {
  const patterns = [
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
};

export async function uploadHandouts(
  moduleId: number,
  adminId: string,
  onProgress?: (done: number, total: number) => void,
): Promise<{ uploaded: number; failed: string[] } | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ],
    multiple: true,
    copyToCacheDirectory: true,
  });
  if (result.canceled) return null;

  const failed: string[] = [];
  let uploaded = 0;
  const files = result.assets;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    onProgress?.(i, files.length);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "pdf";
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storagePath = `module_${moduleId}/${Date.now()}_${i}_${safeName}`;
      const bytes = await readFileBytes(file.uri);

      const { error: storageError } = await supabase.storage
        .from("learning-materials")
        .upload(storagePath, bytes, {
          contentType: file.mimeType ?? "application/octet-stream",
          upsert: false,
        });
      if (storageError) throw new Error(storageError.message);

      const { data: urlData } = supabase.storage
        .from("learning-materials")
        .getPublicUrl(storagePath);

      const { error: dbError } = await supabase
        .from("learning_material")
        .insert({
          title: file.name,
          fileType: ext,
          fileUrl: urlData.publicUrl,
          storagePath,
          isDownloadable: true,
          fileSize: file.size ?? 0,
          materialType: "handout",
          module_id: moduleId,
          admin_id: adminId,
          uploadedAt: new Date().toISOString(),
        });
      if (dbError) throw new Error(dbError.message);
      uploaded++;
    } catch (err: any) {
      failed.push(`${file.name}: ${err.message ?? "failed"}`);
    }
  }
  onProgress?.(files.length, files.length);
  return { uploaded, failed };
}

export async function addRecordedSessions(
  moduleId: number,
  adminId: string,
  sessions: { title: string; url: string; youtubeId: string }[],
): Promise<void> {
  const now = Date.now();
  const rows = sessions.map((s, i) => ({
    title: s.title,
    fileType: "youtube",
    fileUrl: s.url,
    youtubeId: s.youtubeId,
    storagePath: null,
    isDownloadable: false,
    fileSize: null,
    materialType: "recorded_session",
    module_id: moduleId,
    admin_id: adminId,
    uploadedAt: new Date(now + i).toISOString(),
  }));
  const { error } = await supabase.from("learning_material").insert(rows);
  if (error) throw new Error(error.message);
}

export async function deleteMaterials(
  items: LearningMaterial[],
): Promise<{ deleted: number; failed: string[] }> {
  const failed: string[] = [];
  let deleted = 0;
  for (const item of items) {
    const result = await deleteMaterial(item);
    if (result.success) deleted++;
    else failed.push(`${item.title}: ${result.error ?? "failed"}`);
  }
  return { deleted, failed };
}

export async function saveMaterialOrder(ids: number[]): Promise<void> {
  const { error } = await supabase.rpc("set_material_order", { p_ids: ids });
  if (error) throw new Error(error.message);
}
