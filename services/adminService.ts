import { supabase } from "../lib/supabase";

const ENROLLMENT_SELECT = `
  enrollment_id,
  student_id,
  student (
    id,
    firstName,
    lastName,
    email,
    profilephotourl
  ),
  paymentDetails (
    referenceNumber, paymentType,
    payment_channel!paymentDetails_paymentChannel_id_fkey (paymentChannelName)
  ),
  curriculum!enrollment_curriculum_id_fkey (curriculumName),
  specialization!enrollment_specialization_id_fkey (specializationName),
  type_of_taker!enrollment_typeOfTaker_id_fkey (typeOfTaker),
  promo!enrollment_promo_id_fkey (promo),
  verification!enrollment_verification_id_fkey (
    verificationStatus,
    verification_id,
    verificationNotes,
    status
  )`;

function logError(
  where: string,
  error: {
    message: string;
    code?: string;
    details?: string | null;
    hint?: string | null;
  },
) {
  console.error(
    `[adminService.${where}]`,
    error.code,
    error.message,
    error.details ?? "",
    error.hint ?? "",
  );
}

export const adminService = {
  async getAuditRequests() {
    const { data, error } = await supabase
      .from("enrollment")
      .select(ENROLLMENT_SELECT)
      .order("enrollment_id", { ascending: false });
    if (error) {
      logError("getAuditRequests", error);
      return [];
    }
    return data ?? [];
  },

  async getStudentRegistry() {
    const { data, error } = await supabase
      .from("enrollment")
      .select(ENROLLMENT_SELECT)
      .order("enrollment_id", { ascending: false });
    if (error) {
      logError("getStudentRegistry", error);
      return [];
    }
    return data ?? [];
  },

  async processAudit(id: string, status: "approved" | "rejected") {
    const { data, error } = await supabase
      .from("verification")
      .update({
        verificationStatus: status === "approved",
        lastVerificationDate: new Date().toISOString(),
      })
      .eq("verification_id", id)
      .select("verification_id");

    if (error) {
      logError("processAudit", error);
      return false;
    }
    if (!data || data.length === 0) {
      console.error(
        "[adminService.processAudit] 0 rows updated. Check the id, or that RLS lets admins UPDATE verification.",
      );
      return false;
    }
    return true;
  },
};
