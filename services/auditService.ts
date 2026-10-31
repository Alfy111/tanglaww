import { supabase } from "../lib/supabase";

export type AuditAction =
  | "admin_approved_enrollment"
  | "admin_partially_approved_enrollment"
  | "admin_rejected_enrollment"
  | "admin_generated_code"
  | "admin_unlocked_course_single"
  | "admin_unlocked_course_all"
  | "admin_locked_course_single"
  | "admin_locked_course_all"
  | "admin_uploaded_material"
  | "admin_deleted_material"
  | "admin_added_session"
  | "admin_deleted_session"
  | "student_login"
  | "student_logout"
  | "student_viewed_material"
  | "student_downloaded_material"
  | "student_viewed_session"
  | "student_opened_quiz"
  | "student_attempted_quiz"
  | "student_passed_quiz"
  | "student_failed_quiz"
  | "student_joined_session";

interface AuditPayload {
  actorType: "admin" | "student";
  actorId: string;
  actorName?: string;
  action: AuditAction;
  targetType?:
    | "student"
    | "course"
    | "material"
    | "quiz"
    | "enrollment"
    | "session";
  targetId?: string;
  targetName?: string;
  metadata?: Record<string, any>;
}

export async function logAudit(payload: AuditPayload): Promise<void> {
  try {
    const { error } = await supabase.from("audit_logs").insert({
      userType: payload.actorType,
      userId: payload.actorId,
      userName: payload.actorName ?? null,
      action: payload.action,
      targetType: payload.targetType ?? null,
      targetId: payload.targetId ?? null,
      targetName: payload.targetName ?? null,
      metadata: payload.metadata ?? null,
    });

    if (error) console.error("Audit log error:", error.message);
  } catch (err) {
    console.error("Audit log exception:", err);
  }
}

export function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    admin_approved_enrollment: "Approved Enrollment",
    admin_rejected_enrollment: "Rejected Enrollment",
    admin_generated_code: "Generated Activation Code",
    admin_unlocked_course_single: "Unlocked Course (Single Student)",
    admin_unlocked_course_all: "Unlocked Course (All Students)",
    admin_locked_course_single: "Locked Course (Single Student)",
    admin_locked_course_all: "Locked Course (All Students)",
    admin_uploaded_material: "Uploaded Material",
    admin_deleted_material: "Deleted Material",
    admin_added_session: "Added Recorded Session",
    admin_deleted_session: "Deleted Recorded Session",
    student_login: "Logged In",
    student_logout: "Logged Out",
    student_viewed_material: "Viewed Material",
    student_downloaded_material: "Downloaded Material",
    student_viewed_session: "Viewed Recorded Session",
    student_opened_quiz: "Viewed Quiz",
    student_attempted_quiz: "Attempted Quiz",
    student_passed_quiz: "Passed Quiz",
    student_failed_quiz: "Failed Quiz",
    student_joined_session: "Joined Session",
  };
  return labels[action] ?? action;
}

export function getActionColor(action: string): string {
  if (
    action.includes("approved") ||
    action.includes("unlocked") ||
    action.includes("passed")
  )
    return "#27ae60";
  if (
    action.includes("rejected") ||
    action.includes("locked") ||
    action.includes("failed")
  )
    return "#e74c3c";
  if (action.includes("deleted")) return "#e67e22";
  if (action.includes("admin_")) return "#2F459B";
  return "#7f8c8d";
}
