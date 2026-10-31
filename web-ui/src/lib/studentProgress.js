import { supabase } from "./supabase";

export const SEGMENT_SECONDS = 5;
export const VIDEO_COMPLETION_THRESHOLD = 0.8;
export const MAX_SESSION_SECONDS = 30 * 60;

const MIN_VIEW_SECONDS = 60;
const MAX_REQUIRED_VIEW_SECONDS = 300;
const SECONDS_PER_MB = 30;

export function requiredViewSeconds(fileSizeBytes) {
  const mb = (fileSizeBytes ?? 0) / (1024 * 1024);
  return Math.round(
    Math.min(MAX_REQUIRED_VIEW_SECONDS, MIN_VIEW_SECONDS + mb * SECONDS_PER_MB),
  );
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
    .from("material_progress")
    .select("material_id")
    .eq("student_id", studentId)
    .eq("isCompleted", true)
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
    if (error) throw new Error(error.message);
  }

  const { error: openError } = await supabase.rpc("mark_material_opened", {
    p_material_id: materialId,
  });
  if (openError)
    console.warn(
      "[progress] updating lastAccessedAt failed",
      openError.message,
    );

  return getTotalViewSeconds(studentId, materialId);
}

export async function markMaterialCompleted(materialId, source, viewSeconds) {
  const { error } = await supabase.rpc("mark_material_completed", {
    p_material_id: materialId,
    p_source: source,
    p_view_seconds: viewSeconds ?? null,
  });
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
