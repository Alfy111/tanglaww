import * as DocumentPicker from "expo-document-picker";
import * as LegacyFileSystem from "expo-file-system/legacy";
import { readFileBytes } from "../lib/readFileBytes";
import { supabase } from "../lib/supabase";

export type MaterialType = "handout" | "recorded_session";

export interface LearningMaterial {
  material_id: number;
  title: string;
  fileType: string;
  fileUrl: string;
  youtubeId: string | null;
  storagePath: string | null;
  isDownloadable: boolean;
  fileSize: number | null;
  uploadedAt: string;
  materialType: MaterialType;
  module_id: number;
  admin_id: string;
}

export async function getMaterialsByModule(
  moduleId: number,
  type: MaterialType,
): Promise<LearningMaterial[]> {
  const { data, error } = await supabase
    .from("learning_material")
    .select("*")
    .eq("module_id", moduleId)
    .eq("materialType", type)
    // The order the admin set by dragging (new uploads go to the end)
    .order("position", { ascending: true, nullsFirst: false })
    .order("uploadedAt", { ascending: false });

  if (error) {
    return [];
  }
  return (data ?? []) as LearningMaterial[];
}

// All materials of one type across every module of a course
export async function getMaterialsByCourse(
  courseId: number,
  type: MaterialType,
): Promise<LearningMaterial[]> {
  const { data, error } = await supabase
    .from("learning_material")
    .select("*, module!inner(course_id)")
    .eq("module.course_id", courseId)
    .eq("materialType", type)
    // The order the admin set by dragging (new uploads go to the end)
    .order("position", { ascending: true, nullsFirst: false })
    .order("uploadedAt", { ascending: false });

  if (error) {
    console.error("getMaterialsByCourse:", error.message);
    return [];
  }
  return (data ?? []) as LearningMaterial[];
}

export async function uploadHandout(
  moduleId: number,
  adminId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
      ],
      copyToCacheDirectory: true,
    });

    if (result.canceled) return { success: false };

    const file = result.assets[0];
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "pdf";
    const storagePath = `module_${moduleId}/${Date.now()}_${file.name}`;

    // Read the picked file as bytes (avoids empty uploads and the
    // File API's "missing READ permission" error)
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

    const { error: dbError } = await supabase.from("learning_material").insert({
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
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function addRecordedSession(
  moduleId: number,
  adminId: string,
  title: string,
  youtubeUrl: string,
  youtubeId: string,
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.from("learning_material").insert({
    title,
    fileType: "youtube",
    fileUrl: youtubeUrl,
    youtubeId,
    storagePath: null,
    isDownloadable: false,
    fileSize: null,
    materialType: "recorded_session",
    module_id: moduleId,
    admin_id: adminId,
    uploadedAt: new Date().toISOString(),
  });

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function deleteMaterial(
  material: LearningMaterial,
): Promise<{ success: boolean; error?: string }> {
  if (material.storagePath) {
    const { error: storageError } = await supabase.storage
      .from("learning-materials")
      .remove([material.storagePath]);
    if (storageError) return { success: false, error: storageError.message };
  }

  const { error } = await supabase
    .from("learning_material")
    .delete()
    .eq("material_id", material.material_id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

const MIME_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

export function materialMimeType(material: LearningMaterial): string {
  return (
    MIME_TYPES[material.fileType?.toLowerCase()] ?? "application/octet-stream"
  );
}

export function materialFileName(material: LearningMaterial): string {
  const ext = (material.fileType || "pdf").toLowerCase();
  const base = material.title
    .replace(new RegExp(`\\.${ext}$`, "i"), "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_");
  return `${base}.${ext}`;
}

export async function downloadMaterial(
  material: LearningMaterial,
): Promise<{ success: boolean; uri?: string; error?: string }> {
  try {
    const { data, error } = await supabase.storage
      .from("learning-materials")
      .createSignedUrl(material.storagePath!, 300);
    if (error || !data?.signedUrl) {
      throw new Error(error?.message ?? "Could not get the download link.");
    }

    const target = `${LegacyFileSystem.cacheDirectory}${materialFileName(material)}`;
    const result = await LegacyFileSystem.downloadAsync(data.signedUrl, target);
    if (result.status !== 200) {
      throw new Error(`Download failed (status ${result.status}).`);
    }

    return { success: true, uri: result.uri };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// The course a module belongs to (for screens opened with only a moduleId)
export async function getCourseIdForModule(
  moduleId: number,
): Promise<number | null> {
  const { data, error } = await supabase
    .from("module")
    .select("course_id")
    .eq("module_id", moduleId)
    .single();
  if (error) {
    console.error("getCourseIdForModule:", error.message);
    return null;
  }
  return data?.course_id ?? null;
}

export async function getModulesByCourse(courseId: number) {
  const { data, error } = await supabase
    .from("module")
    .select("module_id, moduleName, description")
    .eq("course_id", courseId)
    .eq("is_diagnostic", false) // the diagnostic module has its own card
    .order("module_id");

  if (error) {
    return [];
  }
  return data ?? [];
}

// ------------------------------------------------------------------
// Completion tracking (students only; the database ignores admins)
// ------------------------------------------------------------------

export async function markMaterialOpened(materialId: number): Promise<void> {
  const { error } = await supabase.rpc("mark_material_opened", {
    p_material_id: materialId,
  });
  if (error) console.error("markMaterialOpened:", error.message);
}

export async function markMaterialCompleted(materialId: number): Promise<void> {
  const { error } = await supabase.rpc("mark_material_completed", {
    p_material_id: materialId,
  });
  if (error) console.error("markMaterialCompleted:", error.message);
}

export async function getCompletedMaterialIds(
  moduleId: number,
): Promise<Set<number>> {
  const { data, error } = await supabase.rpc("get_my_completed_materials", {
    p_module_id: moduleId,
  });
  if (error) {
    console.error("getCompletedMaterialIds:", error.message);
    return new Set();
  }
  return new Set(((data as number[]) ?? []).map(Number));
}

export async function getCompletedCourseMaterialIds(
  courseId: number,
): Promise<Set<number>> {
  const { data, error } = await supabase.rpc(
    "get_my_completed_course_materials",
    {
      p_course_id: courseId,
    },
  );
  if (error) {
    console.error("getCompletedCourseMaterialIds:", error.message);
    return new Set();
  }
  return new Set(((data as number[]) ?? []).map(Number));
}

export interface SectionProgress {
  done: number;
  total: number;
}

export interface CourseProgress {
  percent: number;
  // null = unlocked; "access" = no enrollment/access; "previous" = earlier course not finished
  lockReason: "access" | "previous" | "payment" | "not_applicable" | null;
  previousCourseName: string | null;
  handouts: SectionProgress;
  sessions: SectionProgress;
  quizzes: SectionProgress;
}

export async function getMyCourseProgress(): Promise<
  Map<number, CourseProgress>
> {
  const { data, error } = await supabase.rpc("get_my_course_progress");
  if (error) {
    console.error("getMyCourseProgress:", error.message);
    return new Map();
  }
  return new Map(
    ((data as any[]) ?? []).map((r) => [
      Number(r.course_id),
      {
        percent: Number(r.percent),
        lockReason: r.lockReason ?? null,
        previousCourseName: r.previousCourseName ?? null,
        handouts: {
          done: Number(r.handoutsDone),
          total: Number(r.handoutsTotal),
        },
        sessions: {
          done: Number(r.sessionsDone),
          total: Number(r.sessionsTotal),
        },
        quizzes: { done: Number(r.quizzesDone), total: Number(r.quizzesTotal) },
      },
    ]),
  );
}
