import { supabase } from "./supabase";

export const SPECIALIZATIONS = [
  "English",
  "Filipino",
  "Mathematics",
  "Science",
  "Social Values",
  "Values Education",
];

export const PROMOS = [
  { id: 1, name: "Advocacy Promo (BSEd and BEEd with specialization - 3500)" },
  { id: 2, name: "Advocacy Promo (BEEd - 2500)" },
  { id: 3, name: "Regular Rates (BSEd and BEEd with specialization - 5000)" },
  { id: 4, name: "Regular Rates (BEEd - 4000)" },
  { id: 5, name: "Summa Cum Laude" },
];

export const PAYMENT_TYPES = [
  { value: "downpayment", name: "Downpayment" },
  { value: "full", name: "Full Payment" },
];

export const CHANNEL_DETAILS = [
  {
    match: "bdo",
    color: "#0D2A94",
    rows: [
      { label: "Account Name", value: "Ruel M. Atun" },
      { label: "Account Number", value: "004250314645" },
      { label: "Place", value: "Legaspi" },
    ],
  },
  {
    match: "bpi",
    color: "#B3261E",
    rows: [
      { label: "Account Name", value: "Ruel M. Atun" },
      { label: "Account Number", value: "1669343481" },
      { label: "Place", value: "Makati" },
    ],
  },
  {
    match: "gcash",
    color: "#0D2A94",
    rows: [
      { label: "Account Name", value: "Ruel M. Atun" },
      { label: "GCash Number", value: "09499410149" },
    ],
  },
  {
    match: "stc",
    color: "#0D2A94",
    rows: [
      { label: "Account Name", value: "Ross O. Toding" },
      { label: "STC Pay Number", value: "+966 58 059 0149" },
    ],
  },
];

export const channelDetails = (name) =>
  CHANNEL_DETAILS.find((c) => (name || "").toLowerCase().includes(c.match)) ??
  null;

const CURRICULUM_IDS = { BEEd: 1, BSEd: 2 };
const TAKER_TYPE_IDS = { "First time taker": 1, Retaker: 2 };

export const CURRICULUM_NAMES = {
  BEEd: "Bachelor of Elementary Education (BEEd)",
  BSEd: "Bachelor of Secondary Education (BSEd)",
};

export async function getSpecializations() {
  const { data, error } = await supabase
    .from("specialization")
    .select("specialization_id, specializationName, curriculum_id")
    .order("specialization_id");
  if (error) {
    console.error("specialization:", error.message);
    return [];
  }
  return (data ?? []).map((r) => ({
    id: Number(r.specialization_id),
    name: String(r.specializationName),
    curriculumId: Number(r.curriculum_id),
  }));
}

export const specializationsFor = (all, curriculum) =>
  all.filter((s) => s.curriculumId === CURRICULUM_IDS[curriculum]);

export async function getPaymentChannels() {
  const { data, error } = await supabase.from("payment_channel").select("*");
  if (error) {
    console.error("payment_channel:", error.message);
    return [];
  }
  return (data ?? [])
    .map((r) => ({
      id: Number(r.paymentChannel_id ?? r.payment_channel_id ?? r.id),
      name: String(r.paymentChannelName ?? r.name ?? ""),
    }))
    .sort((a, b) => a.id - b.id);
}

async function uploadFile(file, folder, label) {
  if (!file) return null;
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${folder}/${Date.now()}_${safeName}`;

  const { error } = await supabase.storage
    .from("receipts")
    .upload(path, file, { contentType: file.type || undefined, upsert: false });
  if (error)
    throw new Error(`Could not upload your ${label}: ${error.message}`);

  return supabase.storage.from("receipts").getPublicUrl(path).data.publicUrl;
}

const upper = (v) => (v || "").trim().toUpperCase();

export async function submitEnrollment(data) {
  const email = data.email.trim().toLowerCase();

  const { data: existingStudent } = await supabase
    .from("student")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existingStudent) {
    const { data: check } = await supabase
      .from("enrollment")
      .select(
        "enrollment_id, verification!enrollment_verification_id_fkey (allow_reenrollment)",
      )
      .eq("student_id", existingStudent.id)
      .maybeSingle();

    const v = Array.isArray(check?.verification)
      ? check.verification[0]
      : check?.verification;
    if (!v?.allow_reenrollment) {
      throw new Error(
        "An account with this email already exists. If you were rejected and want to re-enroll, please contact the admin first.",
      );
    }
  }

  const [proofUrl, validIdUrl, formalPhotoUrl] = await Promise.all([
    uploadFile(data.proofOfPayment, "payments", "receipt"),
    uploadFile(data.validId, "payments/ids", "valid ID"),
    uploadFile(data.graduationPhoto, "payments/photos", "photo"),
  ]);

  const now = new Date().toISOString();
  const studentFields = {
    firstName: upper(data.firstName),
    middleName: upper(data.middleName),
    lastName: upper(data.lastName),
    bachelorsDegree: upper(data.degree),
    majorshipTaken: data.specialization,
    lastSchoolAttended: upper(data.school),
    province: upper(data.province),
    validIdUrl,
    formalPhotoUrl,
    photoConsentAt: now,
    dataprivacyconsent: now,
  };

  let student;
  if (existingStudent) {
    const { data: updated, error } = await supabase
      .from("student")
      .update(studentFields)
      .eq("id", existingStudent.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    student = updated;
  } else {
    const { data: created, error } = await supabase
      .from("student")
      .insert({ ...studentFields, email })
      .select()
      .single();
    if (error) throw new Error(error.message);
    student = created;
  }

  const enrollmentFields = {
    curriculum_id: CURRICULUM_IDS[data.curriculum],
    specialization_id:
      data.specializationId ?? SPECIALIZATIONS.indexOf(data.specialization) + 1,
    typeOfTaker_id: TAKER_TYPE_IDS[data.takerType],
    promo_id: data.promoId ?? null,
    enrollmentDate: now,
  };

  const { data: existingEnrollment } = await supabase
    .from("enrollment")
    .select("enrollment_id, verification_id")
    .eq("student_id", student.id)
    .maybeSingle();

  let enrollment;
  if (existingEnrollment) {
    const { data: updated, error } = await supabase
      .from("enrollment")
      .update(enrollmentFields)
      .eq("enrollment_id", existingEnrollment.enrollment_id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    enrollment = updated;

    await supabase
      .from("verification")
      .update({
        verificationStatus: false,
        verificationNotes: null,
        allow_reenrollment: false,
        lastVerificationDate: null,
      })
      .eq("verification_id", existingEnrollment.verification_id);
  } else {
    const { data: verification, error: vError } = await supabase
      .from("verification")
      .insert({ verificationStatus: false, verificationNotes: null })
      .select()
      .single();
    if (vError) throw new Error(vError.message);

    const { data: created, error } = await supabase
      .from("enrollment")
      .insert({
        ...enrollmentFields,
        student_id: student.id,
        verification_id: verification.verification_id,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    enrollment = created;

    await supabase
      .from("verification")
      .update({ enrollment_id: enrollment.enrollment_id })
      .eq("verification_id", verification.verification_id);
  }

  const paymentFields = {
    paymentChannel_id: data.paymentChannelId,
    referenceNumber: data.referenceNumber,
    amountTransferred: parseFloat(data.amount),
    dateOfPayment: new Date(data.paymentDate).toISOString(),
    proofOfPaymentUrl: proofUrl,
    paymentType: data.paymentType,
    balanceProofUrl: null,
    balanceSubmittedAt: null,
    agreedToPaymentNotice: !!data.paymentNoticeAgreement,
  };

  const { data: existingPayment } = await supabase
    .from("paymentDetails")
    .select("paymentDetails_id")
    .eq("enrollment_id", enrollment.enrollment_id)
    .maybeSingle();

  const { error: paymentError } = existingPayment
    ? await supabase
        .from("paymentDetails")
        .update(paymentFields)
        .eq("paymentDetails_id", existingPayment.paymentDetails_id)
    : await supabase
        .from("paymentDetails")
        .insert({ ...paymentFields, enrollment_id: enrollment.enrollment_id });
  if (paymentError) throw new Error(paymentError.message);
}
