import { supabase } from "./supabase";

export const SEGMENT_SECONDS = 5;
export const VIDEO_COMPLETION_THRESHOLD = 0.7;
export const MAX_SESSION_SECONDS = 30 * 60;

const MIN_VIEW_SECONDS = 240;
const MAX_REQUIRED_VIEW_SECONDS = 300;
const SECONDS_PER_MB = 15;

export function requiredViewSeconds(fileSizeBytes) {
  const mb = (fileSizeBytes ?? 0) / (1024 * 1024);
  return Math.round(
    Math.min(MAX_REQUIRED_VIEW_SECONDS, MIN_VIEW_SECONDS + mb * SECONDS_PER_MB),
  );
}

export function estimatePdfReadingSeconds(pageCount, wordCount) {
  const pages = Math.max(1, Number(pageCount) || 0);
  const words = Math.max(0, Number(wordCount) || 0);
  const wordsPerPage = words / pages;
  const textEstimate = words > 0 ? Math.round((words / 200) * 60) : pages * 60;
  const estimated = words > 0
    ? Math.max(pages * 60, textEstimate)
    : pages * 60;

  return Math.max(pages * 60, Math.min(pages * 120, estimated + (wordsPerPage > 300 ? 30 : 0)));
}

export function videoCoverage(watchedSegments, mediaDurationSeconds) {
  if (mediaDurationSeconds <= 0) return 0;
  const total = Math.ceil(mediaDurationSeconds / SEGMENT_SECONDS);
  let covered = 0;
  watchedSegments.forEach((s) => {
    if (s >= 0 && s < total) covered++;
  });
  return Math.min(1, covered / total);
}

export async function getCompletedMaterialIds(studentId, materialIds) {
  if (!studentId || materialIds.length === 0) return new Set();
  const { data, error } = await supabase
    .from("student_material_progress")
    .select("material_id")
    .eq("student_id", studentId)
    .in("material_id", materialIds);
  if (error) throw new Error(error.message);
  return new Set((data ?? []).map((row) => Number(row.material_id)));
}

export async function getTotalViewSeconds(studentId, materialId) {
  const { data, error } = await supabase
    .from("student_material_views")
    .select("duration_seconds")
    .eq("student_id", studentId)
    .eq("material_id", materialId);
  if (error) throw new Error(error.message);
  return (data ?? []).reduce(
    (sum, row) => sum + Number(row.duration_seconds ?? 0),
    0,
  );
}

export async function getWatchedSegments(studentId, materialId) {
  const { data, error } = await supabase
    .from("student_material_views")
    .select("watched_segments")
    .eq("student_id", studentId)
    .eq("material_id", materialId)
    .not("watched_segments", "is", null);
  if (error) throw new Error(error.message);
  const all = new Set();
  (data ?? []).forEach((row) =>
    (row.watched_segments ?? []).forEach((s) => all.add(Number(s))),
  );
  return all;
}

export async function recordMaterialView(
  studentId,
  materialId,
  startedAt,
  activeSeconds,
  video,
) {
  const duration = Math.min(
    MAX_SESSION_SECONDS,
    Math.max(0, Math.round(activeSeconds)),
  );
  const hasVideoData = !!video && video.watchedSegments.length > 0;

  if (duration > 0 || hasVideoData) {
    const { error } = await supabase.from("student_material_views").insert({
      student_id: studentId,
      material_id: materialId,
      started_at: startedAt.toISOString(),
      ended_at: new Date().toISOString(),
      duration_seconds: duration,
      watched_segments: video ? video.watchedSegments : null,
      media_duration_seconds: video
        ? Math.round(video.mediaDurationSeconds)
        : null,
    });
    if (error) console.warn("[progress] saving view duration failed", error.message);
  }

  const { error: openError } = await supabase.rpc("mark_material_opened", {
    p_material_id: materialId,
  });
  if (openError)
    console.warn(
      "[progress] updating lastAccessedAt failed",
      openError.message,
    );

  return getTotalViewSeconds(studentId, materialId).catch((error) => {
    console.warn("[progress] loading view duration failed", error.message);
    return 0;
  });
}

export async function markMaterialCompleted(
  studentId,
  materialId,
  source,
  viewSeconds,
) {
  if (!studentId) throw new Error("Could not identify the student.");

  const { error } = await supabase
    .from("student_material_progress")
    .upsert(
      {
        student_id: studentId,
        material_id: materialId,
        completed_at: new Date().toISOString(),
      },
      { onConflict: "student_id,material_id" },
    );
  if (error) throw new Error(error.message);
}

let youtubeApi = null;
export function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!youtubeApi) {
    youtubeApi = new Promise((resolve) => {
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previous?.();
        resolve(window.YT);
      };
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(script);
    });
  }
  return youtubeApi;
}
