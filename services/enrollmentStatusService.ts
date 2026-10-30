import { supabase } from "../lib/supabase";

export type EnrollmentStatus =
  | "pending"
  | "partially_approved"
  | "approved"
  | "rejected"
  | "withdrawn";

export const STATUS_LABELS: Record<EnrollmentStatus, string> = {
  pending: "Pending",
  partially_approved: "Partially Approved",
  approved: "Approved",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

export const STATUS_COLORS: Record<EnrollmentStatus, string> = {
  pending: "#F39C12",
  partially_approved: "#2F80ED",
  approved: "#27ae60",
  rejected: "#e74c3c",
  withdrawn: "#7F8C8D",
};

export const PAYMENT_TYPE_LABELS: Record<string, string> = {
  downpayment: "Downpayment",
  full: "Full Payment",
};

export function getVerification(enrollment: any) {
  return Array.isArray(enrollment?.verification)
    ? enrollment.verification[0]
    : enrollment?.verification;
}

export function getStatus(enrollment: any): EnrollmentStatus {
  const v = getVerification(enrollment);
  if (v?.status) return v.status as EnrollmentStatus;
  if (v?.verificationStatus === true) return "approved";
  if (v?.verificationNotes) return "rejected";
  return "pending";
}

export async function setEnrollmentStatus(
  verificationId: number,
  status: EnrollmentStatus,
  notes?: string,
): Promise<void> {
  const update: Record<string, any> = {
    status,
    lastVerificationDate: new Date().toISOString(),
  };
  if (notes !== undefined) update.verificationNotes = notes;

  const { error } = await supabase
    .from("verification")
    .update(update)
    .eq("verification_id", verificationId);
  if (error) throw new Error(error.message);
}

const generateCode = (): string =>
  Math.floor(100000 + Math.random() * 900000).toString();

export async function sendActivationEmail(
  to: string,
  studentName: string,
  code: string,
): Promise<boolean> {
  try {
    const response = await fetch(
      "https://ohqzmjlerxudlhggxqnn.supabase.co/functions/v1/send-activation-email",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!}`,
        },
        body: JSON.stringify({ to, studentName, code }),
      },
    );
    const data = JSON.parse(await response.text());
    return data?.success === true;
  } catch (err) {
    console.error("Email send error:", err);
    return false;
  }
}

export async function approveWithCode(
  enrollment: any,
  status: "approved" | "partially_approved",
): Promise<{ code: string; emailSent: boolean }> {
  const v = getVerification(enrollment);
  await setEnrollmentStatus(v?.verification_id, status);

  const { data: existingCode } = await supabase
    .from("activation_codes")
    .select("code")
    .eq("enrollment_id", enrollment.enrollment_id)
    .eq("is_used", false)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  let code: string;
  if (existingCode) {
    code = existingCode.code;
  } else {
    code = generateCode();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 3);
    const { error: codeError } = await supabase
      .from("activation_codes")
      .insert({
        code,
        student_id: enrollment.student_id,
        enrollment_id: enrollment.enrollment_id,
        is_used: false,
        expires_at: expiresAt.toISOString(),
      });
    if (codeError) throw new Error(codeError.message);
  }

  const emailSent = await sendActivationEmail(
    enrollment.student.email,
    enrollment.student.firstName,
    code,
  );
  return { code, emailSent };
}
