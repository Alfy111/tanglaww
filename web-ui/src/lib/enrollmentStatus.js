import { supabase } from "./supabase";

export const STATUS_LABELS = {
  pending: "Pending",
  partially_approved: "Partially Approved",
  approved: "Approved",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

export const STATUS_COLORS = {
  pending: "#F39C12",
  partially_approved: "#2F80ED",
  approved: "#27ae60",
  rejected: "#e74c3c",
  withdrawn: "#7F8C8D",
};

export const PAYMENT_TYPE_LABELS = {
  downpayment: "Downpayment",
  full: "Full Payment",
};

export const ENROLLMENT_SELECT = `
  enrollment_id,
  student_id,
  enrollmentDate,
  student (
    id, firstName, middleName, lastName, email, bachelorsDegree, majorshipTaken,
    lastSchoolAttended, province, profilephotourl, phoneNumber, validIdUrl, formalPhotoUrl
  ),
  curriculum!enrollment_curriculum_id_fkey (curriculumName),
  specialization!enrollment_specialization_id_fkey (specializationName),
  type_of_taker!enrollment_typeOfTaker_id_fkey (typeOfTaker),
  promo!enrollment_promo_id_fkey (promo),
  verification!enrollment_verification_id_fkey (
    verification_id, verificationStatus, verificationNotes, allow_reenrollment, status
  ),
  paymentDetails (
    amountTransferred, referenceNumber, dateOfPayment, proofOfPaymentUrl,
    paymentType, balanceProofUrl, balanceSubmittedAt,
    payment_channel!paymentDetails_paymentChannel_id_fkey (paymentChannelName)
  )
`;

export const first = (value) => (Array.isArray(value) ? value[0] : value);

export const getVerification = (enrollment) => first(enrollment?.verification);

export function getStatus(enrollment) {
  const v = getVerification(enrollment);
  if (v?.status) return v.status;
  if (v?.verificationStatus === true) return "approved";
  if (v?.verificationNotes) return "rejected";
  return "pending";
}

export async function setEnrollmentStatus(verificationId, status, notes) {
  const update = { status, lastVerificationDate: new Date().toISOString() };
  if (notes !== undefined) update.verificationNotes = notes;
  const { error } = await supabase
    .from("verification")
    .update(update)
    .eq("verification_id", verificationId);
  if (error) throw new Error(error.message);
}

export async function sendActivationEmail(to, studentName, code) {
  try {
    const { data, error } = await supabase.functions.invoke(
      "send-activation-email",
      {
        body: { to, studentName, code },
      },
    );
    return !error && data?.success === true;
  } catch {
    return false;
  }
}

const generateCode = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

export async function approveWithCode(enrollment, status) {
  await setEnrollmentStatus(
    getVerification(enrollment)?.verification_id,
    status,
  );

  const { data: existing } = await supabase
    .from("activation_codes")
    .select("code")
    .eq("enrollment_id", enrollment.enrollment_id)
    .eq("is_used", false)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  let code = existing?.code;
  if (!code) {
    code = generateCode();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 3);
    const { error } = await supabase.from("activation_codes").insert({
      code,
      student_id: enrollment.student_id,
      enrollment_id: enrollment.enrollment_id,
      is_used: false,
      expires_at: expiresAt.toISOString(),
    });
    if (error) throw new Error(error.message);
  }

  const emailSent = await sendActivationEmail(
    enrollment.student.email,
    enrollment.student.firstName,
    code,
  );
  return { code, emailSent };
}

export async function getActivationCode(enrollmentId) {
  const { data, error } = await supabase
    .from("activation_codes")
    .select("code, is_used, expires_at")
    .eq("enrollment_id", enrollmentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error)
    return { message: `Could not load activation code: ${error.message}` };
  if (!data) return { message: "No activation code found for this student." };
  if (data.is_used)
    return { message: "This student has already activated their account." };
  if (new Date(data.expires_at) < new Date())
    return { message: "The activation code has expired." };
  return { code: data.code };
}
