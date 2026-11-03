import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { Stack, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Dimensions,
  Image,
  ImageBackground,
  KeyboardTypeOptions,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { readFileBytes } from "../lib/readFileBytes";
import { supabase } from "../lib/supabase";

const { width } = Dimensions.get("window");

const headerBg = require("../assets/images/header.png");

type PickedFile = { uri: string; name: string; type: string } | null;

interface dataTypes {
  privacyAgreement: boolean | null;
  curriculum: string | null;
  curriculumId: number | null;
  specialization: string;
  specializationId: number | null;
  comments: string;
  examProgram: string;
  tcpProgram: string;
  tcpSchool: string;
  takerType: string | null;
  takerTypeId: number | null;
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  bachelorsDegree: string;
  lastSchool: string;
  facebookName: string;
  facebookLink: string;
  validId: PickedFile;
  formalPhoto: PickedFile;
  photoConsent: boolean;
  tcpSameAsCollege: boolean;
  promo: string;
  promoId: number | null;
  transactionDate: Date | null;
  paymentChannel: string;
  paymentChannelId: number | null;
  paymentType: "downpayment" | "full" | null;
  referenceNumber: string;
  amountTransferred: string;
  paymentNoticeAgreement: boolean;
  receipt: PickedFile;
  extraPayments: ExtraPayment[];
}

type ExtraPayment = {
  key: string;
  paymentChannel: string;
  paymentChannelId: number | null;
  transactionDate: Date | null;
  amountTransferred: string;
  referenceNumber: string;
  receipt: PickedFile;
};
const MAX_PAYMENTS = 5;
const newExtraPayment = (): ExtraPayment => ({
  key: String(Date.now() + Math.random()),
  paymentChannel: "",
  paymentChannelId: null,
  transactionDate: null,
  amountTransferred: "",
  referenceNumber: "",
  receipt: null,
});
const extraPaymentMissing = (p: ExtraPayment) => ({
  paymentChannel: false,
  transactionDate: false,
  amountTransferred:
    !!p.amountTransferred.trim() && !(parseFloat(p.amountTransferred) > 0),
  referenceNumber: false,
});

const defaultValues: dataTypes = {
  privacyAgreement: null,
  curriculum: null,
  curriculumId: null,
  specialization: "",
  specializationId: null,
  comments: "",
  examProgram: "",
  tcpProgram: "",
  tcpSchool: "",
  takerType: null,
  takerTypeId: null,
  firstName: "",
  middleName: "",
  lastName: "",
  email: "",
  bachelorsDegree: "",
  lastSchool: "",
  facebookName: "",
  facebookLink: "",
  validId: null,
  formalPhoto: null,
  photoConsent: false,
  tcpSameAsCollege: false,
  promo: "",
  promoId: null,
  transactionDate: null,
  paymentChannel: "",
  paymentChannelId: null,
  paymentType: null,
  referenceNumber: "",
  amountTransferred: "",
  paymentNoticeAgreement: false,
  receipt: null,
  extraPayments: [],
};

type FieldErrors = Partial<Record<keyof dataTypes, string>>;

const REQUIRED = "Required.";
const hasNumber = (v: string) => /\d/.test(v);
const hasBadMarks = (v: string) =>
  !/[A-Za-zÀ-ÖØ-öø-ÿ]/.test(v) || /[.,'()&-]{2,}/.test(v);
const isFacebookLink = (v: string) =>
  /^(https?:\/\/)?([a-z0-9-]+\.)?(facebook|fb)\.com\/\S+/i.test(v.trim());

function checkText(
  errors: FieldErrors,
  key: keyof dataTypes,
  value: string,
  required: boolean,
  numberMessage: string,
) {
  if (required && !value.trim()) errors[key] = REQUIRED;
  else if (hasNumber(value)) errors[key] = numberMessage;
  else if (value.trim() && hasBadMarks(value))
    errors[key] = "Please use letters, not just symbols.";
}

function validateStep(step: number, form: dataTypes): FieldErrors {
  const errors: FieldErrors = {};

  if (step === 1) {
    if (form.privacyAgreement === null) errors.privacyAgreement = REQUIRED;
    else if (form.privacyAgreement === false)
      errors.privacyAgreement =
        "You must agree to the Data Privacy Notice to proceed.";
  }

  if (step === 2) {
    if (!form.takerTypeId) errors.takerType = REQUIRED;
    if (!form.specializationId) errors.specialization = REQUIRED;
    if (
      form.specializationId &&
      form.curriculumId === null &&
      !form.comments.trim()
    )
      errors.comments = REQUIRED;
  }

  if (step === 3) {
    const nameMsg = "Name cannot contain numbers.";
    checkText(errors, "firstName", form.firstName, true, nameMsg);
    checkText(errors, "middleName", form.middleName, false, nameMsg);
    checkText(errors, "lastName", form.lastName, true, nameMsg);
    if (!form.email.trim()) errors.email = REQUIRED;
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      errors.email = "Please enter a valid email address.";
    if (form.facebookName.trim() && hasBadMarks(form.facebookName))
      errors.facebookName = "Please use letters, not just symbols.";
    checkText(
      errors,
      "bachelorsDegree",
      form.bachelorsDegree,
      true,
      "Degree cannot contain numbers.",
    );
    checkText(
      errors,
      "lastSchool",
      form.lastSchool,
      true,
      "School name cannot contain numbers.",
    );
    checkText(
      errors,
      "tcpProgram",
      form.tcpProgram,
      false,
      "Program cannot contain numbers.",
    );
    checkText(
      errors,
      "tcpSchool",
      form.tcpSchool,
      false,
      "School name cannot contain numbers.",
    );
    if (form.facebookLink.trim() && !isFacebookLink(form.facebookLink))
      errors.facebookLink =
        "Please paste your Facebook profile link (facebook.com/...).";
    if ((form.formalPhoto || form.validId) && !form.photoConsent)
      errors.photoConsent = "Kindly agree before proceeding.";
  }

  if (step === 4) {
    if (
      form.amountTransferred.trim() &&
      !(parseFloat(form.amountTransferred) > 0)
    )
      errors.amountTransferred = "Please enter a valid amount.";
    if (
      form.extraPayments.some((p) =>
        Object.values(extraPaymentMissing(p)).some(Boolean),
      )
    )
      errors.extraPayments =
        "Please complete every added payment, or remove it.";
    if (!form.paymentNoticeAgreement)
      errors.paymentNoticeAgreement = "Kindly confirm before proceeding.";
  }
  return errors;
}

const formatDate = (d: Date | null) =>
  d
    ? d.toLocaleDateString("en-PH", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

const cleanName = (v: string) => v.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ\s.'-]/g, "");
const cleanText = (v: string) =>
  v.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ0-9\s.,'()&-]/g, "");
const nameUpper = (v: string) => cleanName(v).toUpperCase();
const toUpper = (v: string) => cleanText(v).toUpperCase();
const lettersUpper = (v: string) =>
  cleanText(v).replace(/\d/g, "").toUpperCase();
const withHttps = (v: string) =>
  /^https?:\/\//i.test(v.trim()) ? v.trim() : `https://${v.trim()}`;

const PAYMENT_TYPES = [
  { value: "downpayment" as const, name: "Downpayment" },
  { value: "full" as const, name: "Full Payment" },
];

const CHANNEL_DETAILS: {
  match: string;
  color: string;
  rows: { label: string; value: string }[];
}[] = [
  {
    match: "bdo",
    color: "#0D2A94",
    rows: [
      { label: "Account Name", value: "Teacher A Educare Review and Training" },
      { label: "Account Number", value: "010240208269" },
    ],
  },
  {
    match: "bpi",
    color: "#B3261E",
    rows: [
      { label: "Account Name", value: "Ruel M. Atun" },
      { label: "Account Number", value: "1669343481" },
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

const channelDetails = (name: string) =>
  CHANNEL_DETAILS.find((c) => name.toLowerCase().includes(c.match)) ?? null;

const onlyAmount = (v: string) =>
  v.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");

export default function EnrollmentScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isRegistrationComplete, setIsRegistrationComplete] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dataTypes, setDataTypes] = useState<dataTypes>(defaultValues);
  const [isMajorOpen, setIsMajorOpen] = useState(false);
  const [isPromoOpen, setIsPromoOpen] = useState(false);
  const [isMethodOpen, setIsMethodOpen] = useState(false);
  const [isPayTypeOpen, setIsPayTypeOpen] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [openPreviews, setOpenPreviews] = useState<Record<string, boolean>>({});

  const errors: FieldErrors = showErrors ? validateStep(step, dataTypes) : {};

  const [summary, setSummary] = useState<Record<string, boolean>>({
    program: false,
    personalInfo: false,
    payment: false,
  });
  const toggle = (key: string) =>
    setSummary((prev) => ({ ...prev, [key]: !prev[key] }));

  const setField = <field extends keyof dataTypes>(
    key: field,
    value: dataTypes[field],
  ) => setDataTypes((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    if (!dataTypes.tcpSameAsCollege) return;
    setDataTypes((prev) =>
      prev.tcpProgram === prev.bachelorsDegree &&
      prev.tcpSchool === prev.lastSchool
        ? prev
        : {
            ...prev,
            tcpProgram: prev.bachelorsDegree,
            tcpSchool: prev.lastSchool,
          },
    );
  }, [
    dataTypes.tcpSameAsCollege,
    dataTypes.bachelorsDegree,
    dataTypes.lastSchool,
  ]);

  const typeOfTakerOptions = [
    { id: 1, name: "First time" },
    { id: 2, name: "Retaker" },
  ];

  const [examPrograms, setExamPrograms] = useState<
    { id: number; name: string; label: string; curriculumId: number | null }[]
  >([]);

  useEffect(() => {
    supabase
      .from("specialization")
      .select(
        "specialization_id, specializationName, curriculum_id, exam_label, exam_order",
      )
      .not("exam_label", "is", null)
      .order("exam_order")
      .then(({ data, error }) => {
        if (error) {
          console.error("specialization:", error.message);
          return;
        }
        setExamPrograms(
          (data ?? []).map((r: any) => ({
            id: Number(r.specialization_id),
            name: String(r.specializationName),
            label: String(r.exam_label),
            curriculumId:
              r.curriculum_id == null ? null : Number(r.curriculum_id),
          })),
        );
      });
  }, []);

  const isOthers =
    !!dataTypes.specializationId && dataTypes.curriculumId === null;

  const [promoOptions, setPromoOptions] = useState<
    { id: number; name: string }[]
  >([]);

  useEffect(() => {
    supabase
      .from("promo")
      .select("promo_id, promo, is_active")
      .order("promo_id")
      .then(({ data, error }) => {
        if (error) {
          console.error("promo:", error.message);
          return;
        }
        setPromoOptions(
          (data ?? [])
            .filter((r: any) => r.is_active !== false)
            .map((r: any) => ({
              id: Number(r.promo_id),
              name: String(r.promo ?? ""),
            })),
        );
      });
  }, []);

  const [paymentChannels, setPaymentChannels] = useState<
    { id: number; name: string }[]
  >([]);

  useEffect(() => {
    supabase
      .from("payment_channel")
      .select("*")
      .then(({ data, error }) => {
        if (error) {
          console.error("payment_channel:", error.message);
          return;
        }
        setPaymentChannels(
          (data ?? [])
            .map((r: any) => ({
              id: Number(r.paymentChannel_id ?? r.payment_channel_id ?? r.id),
              name: String(r.paymentChannelName ?? r.name ?? ""),
            }))
            .sort((a, b) => a.id - b.id),
        );
      });
  }, []);

  const pickFile = (
    key: "receipt" | "validId" | "formalPhoto",
    title: string,
    allowFiles: boolean,
  ) => chooseFile(title, allowFiles, (f) => setField(key, f));

  const [openMethodFor, setOpenMethodFor] = useState<string | null>(null);
  const [dateFor, setDateFor] = useState<string | null>(null);

  const addExtraPayment = () =>
    setDataTypes((prev) =>
      prev.extraPayments.length + 1 >= MAX_PAYMENTS
        ? prev
        : {
            ...prev,
            extraPayments: [...prev.extraPayments, newExtraPayment()],
          },
    );
  const updateExtraPayment = (key: string, changes: Partial<ExtraPayment>) =>
    setDataTypes((prev) => ({
      ...prev,
      extraPayments: prev.extraPayments.map((p) =>
        p.key === key ? { ...p, ...changes } : p,
      ),
    }));
  const removeExtraPayment = (key: string) =>
    setDataTypes((prev) => ({
      ...prev,
      extraPayments: prev.extraPayments.filter((p) => p.key !== key),
    }));

  const chooseFile = (
    title: string,
    allowFiles: boolean,
    onPicked: (file: NonNullable<PickedFile>) => void,
  ) => {
    const fromImage = (result: ImagePicker.ImagePickerResult) => {
      if (result.canceled) return;
      const asset = result.assets[0];
      onPicked({
        uri: asset.uri,
        name: asset.fileName ?? "photo.jpg",
        type: asset.mimeType ?? "image/jpeg",
      });
    };

    Alert.alert(title, "Choose an option", [
      {
        text: "Camera",
        onPress: async () =>
          fromImage(
            await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              quality: 0.8,
            }),
          ),
      },
      {
        text: "Gallery",
        onPress: async () =>
          fromImage(
            await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              quality: 0.8,
            }),
          ),
      },
      ...(allowFiles
        ? [
            {
              text: "File (PDF/Docs)",
              onPress: async () => {
                const result = await DocumentPicker.getDocumentAsync({
                  type: "*/*",
                  copyToCacheDirectory: true,
                });
                if (result.canceled) return;
                const file = result.assets[0];
                onPicked({
                  uri: file.uri,
                  name: file.name,
                  type: file.mimeType ?? "application/octet-stream",
                });
              },
            },
          ]
        : []),
      { text: "Cancel", style: "cancel" as const },
    ]);
  };

  const uploadFile = async (
    file: PickedFile,
    folder: "payments" | "payments/ids" | "payments/photos",
    label: string,
  ): Promise<string | null> => {
    if (!file) return null;

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${folder}/${Date.now()}_${safeName}`;
    const bytes = await readFileBytes(file.uri);

    const { error } = await supabase.storage
      .from("receipts")
      .upload(path, bytes, { contentType: file.type, upsert: false });

    if (error)
      throw new Error(`Could not upload your ${label}: ${error.message}`);

    return supabase.storage.from("receipts").getPublicUrl(path).data.publicUrl;
  };

  const handleSubmit = async () => {
    if (loading) return;
    setLoading(true);

    try {
      const email = dataTypes.email.trim().toLowerCase();

      const { data: existingStudent } = await supabase
        .from("student")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (existingStudent) {
        const { data: existingEnrollmentCheck } = await supabase
          .from("enrollment")
          .select(
            `
                    enrollment_id,
                    verification!enrollment_verification_id_fkey (
                        allow_reenrollment, verificationStatus
                    )
                `,
          )
          .eq("student_id", existingStudent.id)
          .maybeSingle();

        const v = Array.isArray(existingEnrollmentCheck?.verification)
          ? existingEnrollmentCheck?.verification[0]
          : existingEnrollmentCheck?.verification;

        if (!v?.allow_reenrollment) {
          Alert.alert(
            "Email Already Registered",
            "An account with this email already exists. If you were rejected and want to re-enroll, please contact the admin first.",
          );
          return;
        }
      }

      const [proofUrl, validIdUrl, formalPhotoUrl, ...extraProofUrls] =
        await Promise.all([
          uploadFile(dataTypes.receipt, "payments", "receipt"),
          uploadFile(dataTypes.validId, "payments/ids", "valid ID"),
          uploadFile(dataTypes.formalPhoto, "payments/photos", "photo"),
          ...dataTypes.extraPayments.map((p, i) =>
            uploadFile(p.receipt, "payments", `payment ${i + 2} receipt`),
          ),
        ]);
      const additionalPayments = dataTypes.extraPayments.map((p, i) => ({
        paymentChannel_id: p.paymentChannelId,
        paymentChannelName: p.paymentChannel,
        dateOfPayment: (p.transactionDate ?? new Date()).toISOString(),
        amountTransferred: parseFloat(p.amountTransferred),
        referenceNumber: p.referenceNumber.trim(),
        proofUrl: extraProofUrls[i],
      }));

      const studentFields = {
        firstName: dataTypes.firstName.trim().toUpperCase(),
        lastName: dataTypes.lastName.trim().toUpperCase(),
        middleName: dataTypes.middleName.trim().toUpperCase(),
        bachelorsDegree: dataTypes.bachelorsDegree.trim().toUpperCase(),
        majorshipTaken: dataTypes.specialization,
        lastSchoolAttended: dataTypes.lastSchool.trim().toUpperCase(),
        tcpProgram: dataTypes.tcpProgram.trim().toUpperCase() || null,
        tcpSchool: dataTypes.tcpSchool.trim().toUpperCase() || null,
        facebookName: dataTypes.facebookName.trim() || null,
        facebookLink: dataTypes.facebookLink.trim()
          ? withHttps(dataTypes.facebookLink)
          : null,
        validIdUrl,
        formalPhotoUrl,
        photoConsentAt:
          dataTypes.photoConsent && (dataTypes.formalPhoto || dataTypes.validId)
            ? new Date().toISOString()
            : null,
        dataprivacyconsent: new Date().toISOString(),
      };

      let studentData;
      if (existingStudent) {
        const { data: updatedStudent, error: updateError } = await supabase
          .from("student")
          .update(studentFields)
          .eq("id", existingStudent.id)
          .select()
          .single();
        if (updateError) throw new Error(updateError.message);
        studentData = updatedStudent;
      } else {
        const { data: newStudent, error: studentError } = await supabase
          .from("student")
          .insert({ ...studentFields, email })
          .select()
          .single();
        if (studentError) throw new Error(studentError.message);
        studentData = newStudent;
      }

      const { data: existingEnrollment } = await supabase
        .from("enrollment")
        .select("enrollment_id, verification_id")
        .eq("student_id", studentData.id)
        .maybeSingle();

      let enrollmentData;

      if (existingEnrollment) {
        const { data: updatedEnrollment, error: enrollmentError } =
          await supabase
            .from("enrollment")
            .update({
              curriculum_id: dataTypes.curriculumId,
              specialization_id: dataTypes.specializationId,
              comments: dataTypes.comments.trim() || null,
              typeOfTaker_id: dataTypes.takerTypeId,
              promo_id: dataTypes.promoId,
              enrollmentDate: new Date().toISOString(),
            })
            .eq("enrollment_id", existingEnrollment.enrollment_id)
            .select()
            .single();

        if (enrollmentError) throw new Error(enrollmentError.message);
        enrollmentData = updatedEnrollment;

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
        const { data: verificationData, error: verificationError } =
          await supabase
            .from("verification")
            .insert({
              verificationStatus: false,
              verificationNotes: null,
            })
            .select()
            .single();

        if (verificationError) throw new Error(verificationError.message);

        const { data: newEnrollment, error: enrollmentError } = await supabase
          .from("enrollment")
          .insert({
            student_id: studentData.id,
            curriculum_id: dataTypes.curriculumId,
            specialization_id: dataTypes.specializationId,
            comments: dataTypes.comments.trim() || null,
            typeOfTaker_id: dataTypes.takerTypeId,
            promo_id: dataTypes.promoId,
            verification_id: verificationData.verification_id,
            enrollmentDate: new Date().toISOString(),
          })
          .select()
          .single();

        if (enrollmentError) throw new Error(enrollmentError.message);
        enrollmentData = newEnrollment;

        await supabase
          .from("verification")
          .update({ enrollment_id: enrollmentData.enrollment_id })
          .eq("verification_id", verificationData.verification_id);
      }

      const paymentFields = {
        paymentChannel_id: dataTypes.paymentChannelId,
        referenceNumber: dataTypes.referenceNumber.trim() || null,
        amountTransferred:
          parseFloat(dataTypes.amountTransferred) > 0
            ? parseFloat(dataTypes.amountTransferred)
            : null,
        dateOfPayment: dataTypes.transactionDate
          ? dataTypes.transactionDate.toISOString()
          : null,
        proofOfPaymentUrl: proofUrl,
        additionalPayments,
        paymentType: dataTypes.paymentType,
        balanceProofUrl: null,
        balanceSubmittedAt: null,
        agreedToPaymentNotice: dataTypes.paymentNoticeAgreement,
      };

      const { data: existingPayment } = await supabase
        .from("paymentDetails")
        .select("paymentDetails_id")
        .eq("enrollment_id", enrollmentData.enrollment_id)
        .maybeSingle();

      const { error: paymentError } = existingPayment
        ? await supabase
            .from("paymentDetails")
            .update(paymentFields)
            .eq("paymentDetails_id", existingPayment.paymentDetails_id)
        : await supabase.from("paymentDetails").insert({
            ...paymentFields,
            enrollment_id: enrollmentData.enrollment_id,
          });

      if (paymentError) throw new Error(paymentError.message);

      setIsRegistrationComplete(true);
    } catch (err: any) {
      Alert.alert(
        "Submission Failed",
        err.message ?? "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    const stepErrors = validateStep(step, dataTypes);
    if (Object.keys(stepErrors).length > 0) {
      setShowErrors(true);
      return;
    }
    setShowErrors(false);

    if (step < 5) setStep(step + 1);
    else handleSubmit();
  };

  const hasEnteredData = () =>
    (Object.keys(defaultValues) as (keyof dataTypes)[]).some(
      (k) => k !== "privacyAgreement" && dataTypes[k] !== defaultValues[k],
    );

  const handleBack = () => {
    setShowErrors(false);
    if (step > 1) {
      setStep(step - 1);
      return;
    }
    if (!hasEnteredData()) {
      router.back();
      return;
    }
    Alert.alert(
      "Leave enrollment?",
      "Going back now will exit the enrollment form and clear everything you have entered. You will need to start over.",
      [
        { text: "Stay", style: "cancel" },
        { text: "Leave", style: "destructive", onPress: () => router.back() },
      ],
    );
  };

  const handleBackRef = useRef(handleBack);
  handleBackRef.current = handleBack;
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (isRegistrationComplete) return false;
      handleBackRef.current();
      return true;
    });
    return () => sub.remove();
  }, [isRegistrationComplete]);

  const onDateChange = (event: DateTimePickerEvent, selected?: Date) => {
    setShowDatePicker(false);
    if (event.type === "set" && selected) setField("transactionDate", selected);
  };

  const fieldLabel = (key: keyof dataTypes, text: string, required = false) => (
    <Text style={[styles.label, !!errors[key] && styles.labelError]}>
      {text}
      {required ? "*" : ""}
    </Text>
  );

  const fieldError = (key: keyof dataTypes) =>
    errors[key] ? <Text style={styles.fieldError}>{errors[key]}</Text> : null;

  const textField = ({
    key,
    label,
    placeholder,
    required = false,
    hint,
    keyboardType,
    autoCapitalize,
    clean,
  }: {
    key:
      | "firstName"
      | "middleName"
      | "lastName"
      | "email"
      | "bachelorsDegree"
      | "lastSchool"
      | "facebookName"
      | "facebookLink"
      | "tcpProgram"
      | "tcpSchool"
      | "amountTransferred"
      | "referenceNumber"
      | "comments";
    label: string;
    placeholder: string;
    required?: boolean;
    hint?: string;
    keyboardType?: KeyboardTypeOptions;
    autoCapitalize?: "none" | "words" | "sentences" | "characters";
    clean?: (v: string) => string;
  }) => (
    <>
      {fieldLabel(key, label, required)}
      {hint && <Text style={styles.formatHint}>{hint}</Text>}
      <TextInput
        style={[styles.input, !!errors[key] && styles.inputError]}
        placeholder={placeholder}
        placeholderTextColor="#999"
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        value={dataTypes[key]}
        onChangeText={(val) => setField(key, clean ? clean(val) : val)}
      />
      {fieldError(key)}
    </>
  );

  const filePreview = (
    key: "receipt" | "validId" | "formalPhoto",
    noun: string,
  ) => previewOf(dataTypes[key], key, noun);

  const previewOf = (file: PickedFile, key: string, noun: string) => {
    if (!file) return null;
    if (file.type === "application/pdf" || !file.type.startsWith("image/")) {
      return (
        <TouchableOpacity
          style={styles.previewBtn}
          onPress={() => WebBrowser.openBrowserAsync(file.uri)}
        >
          <Ionicons name="document-outline" size={20} color="#0D2A94" />
          <Text style={styles.previewBtnText}>View File</Text>
        </TouchableOpacity>
      );
    }
    const open = !!openPreviews[key];
    return (
      <>
        <TouchableOpacity
          style={styles.previewBtn}
          onPress={() => setOpenPreviews((p) => ({ ...p, [key]: !open }))}
        >
          <Ionicons
            name={open ? "eye-off-outline" : "eye-outline"}
            size={20}
            color="#0D2A94"
          />
          <Text style={styles.previewBtnText}>
            {open ? `Hide ${noun}` : `View ${noun}`}
          </Text>
        </TouchableOpacity>
        {open && (
          <Image
            source={{ uri: file.uri }}
            style={styles.receiptThumbnail}
            resizeMode="contain"
          />
        )}
      </>
    );
  };

  const uploadField = ({
    key,
    label,
    required,
    hint,
    buttonText,
    allowFiles,
    noun,
  }: {
    key: "receipt" | "validId" | "formalPhoto";
    label: string;
    required: boolean;
    hint?: string;
    buttonText: string;
    allowFiles: boolean;
    noun: string;
  }) => (
    <>
      {fieldLabel(key, label, required)}
      {hint && <Text style={styles.formatHint}>{hint}</Text>}
      <TouchableOpacity
        style={[styles.uploadBtn, !!errors[key] && styles.uploadBtnError]}
        onPress={() =>
          pickFile(key, label.replace(/[:*]/g, "").trim(), allowFiles)
        }
      >
        <Ionicons
          name="attach-outline"
          size={20}
          color="#666"
          style={{ marginBottom: 5 }}
        />
        <Text style={styles.uploadText} numberOfLines={1}>
          {dataTypes[key] ? `✓ ${dataTypes[key]!.name}` : buttonText}
        </Text>
      </TouchableOpacity>
      {fieldError(key)}
      {dataTypes[key] && (
        <View style={{ marginTop: 6 }}>{filePreview(key, noun)}</View>
      )}
    </>
  );

  const radioGroup = <T,>(
    options: { value: T; name: string }[],
    selected: T | null,
    onSelect: (v: T) => void,
  ) =>
    options.map((opt) => (
      <TouchableOpacity
        key={opt.name}
        style={styles.radioRow}
        onPress={() => onSelect(opt.value)}
      >
        <Ionicons
          name={selected === opt.value ? "radio-button-on" : "radio-button-off"}
          size={22}
          color="#0D2A94"
        />
        <Text style={styles.radioLabel}>{opt.name}</Text>
      </TouchableOpacity>
    ));

  const checkbox = (
    key: "photoConsent" | "paymentNoticeAgreement" | "tcpSameAsCollege",
    text: string,
  ) => (
    <>
      <TouchableOpacity
        style={[styles.radioRow, { marginTop: 20 }]}
        onPress={() => setField(key, !dataTypes[key])}
      >
        <Ionicons
          name={dataTypes[key] ? "checkbox" : "square-outline"}
          size={24}
          color={errors[key] ? "#e53935" : "#0D2A94"}
        />
        <Text
          style={[styles.radioLabel, { fontSize: 12, flex: 1, lineHeight: 17 }]}
        >
          {text}
        </Text>
      </TouchableOpacity>
      {fieldError(key)}
    </>
  );

  const renderProgressHeader = (title: string) => (
    <View style={styles.headerContainer}>
      <ImageBackground
        source={headerBg}
        style={styles.headerImage}
        resizeMode="cover"
      >
        <View style={styles.overlay}>
          {!isRegistrationComplete && (
            <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
          )}

          <View style={styles.stepperRow}>
            {[1, 2, 3, 4, 5].map((num) => (
              <View key={num} style={styles.stepWrapper}>
                <View
                  style={[
                    styles.stepCircle,
                    step === num
                      ? styles.stepActive
                      : step > num
                        ? styles.stepDone
                        : styles.stepInactive,
                  ]}
                >
                  <Text
                    style={[styles.stepText, step >= num && { color: "white" }]}
                  >
                    {num}
                  </Text>
                </View>
                {num < 5 && (
                  <View
                    style={[styles.stepLine, step > num && styles.lineActive]}
                  />
                )}
              </View>
            ))}
          </View>
          <Text style={styles.headerTitle}>{title}</Text>
        </View>
      </ImageBackground>
    </View>
  );

  const summaryRow = ({ label, value }: { label: string; value: string }) => (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value || "-"}</Text>
    </View>
  );

  const summarySection = ({
    sectionKey,
    title,
    children,
  }: {
    sectionKey: string;
    title: string;
    children: React.ReactNode;
  }) => {
    const isOpen = summary[sectionKey];
    return (
      <View style={styles.summaryCard}>
        <TouchableOpacity
          style={styles.summaryHeader}
          onPress={() => toggle(sectionKey)}
          activeOpacity={0.8}
        >
          <Text style={styles.summaryTitle}>{title}</Text>
          <Ionicons
            name={isOpen ? "chevron-up" : "chevron-down"}
            size={20}
            color="#555"
          />
        </TouchableOpacity>
        {isOpen && <View style={styles.summaryBody}>{children}</View>}
      </View>
    );
  };

  if (isRegistrationComplete) {
    return (
      <SafeAreaView style={styles.container}>
        {renderProgressHeader("Registration Complete")}
        <View style={styles.completeBody}>
          <Ionicons
            name="checkmark-circle"
            size={100}
            color="#4CD964"
            style={{ marginBottom: 15 }}
          />
          <Text style={styles.thankYouHeader}>
            Thank you for signing up to our services!
          </Text>
          <Text style={styles.statusSubtext}>
            Your registration has been received and is now awaiting admin
            approval.
          </Text>

          <View style={styles.nextStepsContainer}>
            <Text style={styles.nextStepsHeader}>
              <Ionicons name="bulb-outline" size={18} color="#FFB800" /> What
              comes next?
            </Text>
            <View style={styles.checkItem}>
              <Ionicons name="checkmark" size={18} color="#2F459B" />
              <Text style={styles.checkText}>
                You'll receive an email with your activation code once approved.
                Kindly check your email regularly to avoid delays in account
                activation.
              </Text>
            </View>
            <View style={styles.checkItem}>
              <Ionicons name="checkmark" size={18} color="#2F459B" />
              <Text style={styles.checkText}>
                Return to the start page and go to 'Use Enrollment Code'.
              </Text>
            </View>
            <View style={styles.checkItem}>
              <Ionicons name="checkmark" size={18} color="#2F459B" />
              <Text style={styles.checkText}>
                Then, enter the code to activate your account.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.continueBtn, { width: "100%" }]}
            onPress={() => router.replace("/login")}
          >
            <Text style={styles.continueText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ gestureEnabled: false }} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {step === 1 && (
          <View>
            {renderProgressHeader("Data Privacy Notice")}
            <View style={styles.formBody}>
              <Text style={styles.privacyContent}>
                <Text style={styles.bold}>Teacher A Review Center</Text>{" "}
                recognizes its responsibilities under the{" "}
                <Text style={styles.bold}>RA 10173</Text> also known as the{" "}
                <Text style={styles.bold}>Data Privacy Act of 2012</Text> with
                respect to the data they collect, record, organize, update, use,
                consolidate or destruct from the data subject.
              </Text>
              {radioGroup(
                [
                  { value: true, name: "Agree" },
                  { value: false, name: "Disagree" },
                ],
                dataTypes.privacyAgreement,
                (v) => setField("privacyAgreement", v),
              )}
              {fieldError("privacyAgreement")}
            </View>
          </View>
        )}

        {step === 2 && (
          <View>
            {renderProgressHeader("Program & Curriculum")}
            <View style={styles.formBody}>
              {fieldLabel("takerType", "Type of Taker:", true)}
              {radioGroup(
                typeOfTakerOptions.map((o) => ({ value: o.id, name: o.name })),
                dataTypes.takerTypeId,
                (id) => {
                  setField("takerTypeId", id);
                  setField(
                    "takerType",
                    typeOfTakerOptions.find((o) => o.id === id)!.name,
                  );
                },
              )}
              {fieldError("takerType")}

              {fieldLabel("specialization", "Examination Program:", true)}
              <TouchableOpacity
                style={[
                  styles.dropdown,
                  !!errors.specialization && styles.inputError,
                ]}
                onPress={() => setIsMajorOpen(!isMajorOpen)}
              >
                <Text
                  style={{
                    flex: 1,
                    color: dataTypes.examProgram ? "#000" : "#999",
                  }}
                >
                  {dataTypes.examProgram || "Select Examination Program"}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>
              {isMajorOpen && (
                <View style={styles.dropdownMenu}>
                  {examPrograms.map((opt) => (
                    <TouchableOpacity
                      key={opt.id}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setDataTypes((prev) => ({
                          ...prev,
                          examProgram: opt.label,
                          specialization: opt.name,
                          specializationId: opt.id,
                          curriculumId: opt.curriculumId,
                          curriculum:
                            opt.curriculumId === 1
                              ? "BEEd"
                              : opt.curriculumId === 2
                                ? "BSEd"
                                : null,
                          comments:
                            opt.curriculumId === null ? prev.comments : "",
                        }));
                        setIsMajorOpen(false);
                      }}
                    >
                      <Text>{opt.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {fieldError("specialization")}

              {isOthers &&
                textField({
                  key: "comments",
                  label: "Please specify:",
                  placeholder: "Your examination program",
                  required: true,
                  autoCapitalize: "characters",
                  clean: lettersUpper,
                })}
            </View>
          </View>
        )}

        {step === 3 && (
          <View>
            {renderProgressHeader("Personal Information & Verification")}
            <View style={styles.formBody}>
              {textField({
                key: "email",
                label: "Email Address:",
                placeholder: "Email Address",
                required: true,
                keyboardType: "email-address",
                autoCapitalize: "none",
              })}
              {textField({
                key: "firstName",
                label: "First Name:",
                placeholder: "Given Name",
                required: true,
                autoCapitalize: "characters",
                clean: nameUpper,
              })}
              {textField({
                key: "middleName",
                label: "Middle Name:",
                placeholder: "Middle Name",
                autoCapitalize: "characters",
                clean: nameUpper,
              })}
              {textField({
                key: "lastName",
                label: "Last Name:",
                placeholder: "Last Name",
                required: true,
                autoCapitalize: "characters",
                clean: nameUpper,
              })}
              {textField({
                key: "facebookName",
                label: "Facebook Name:",
                placeholder: "Name on your Facebook account (optional)",
                required: false,
                autoCapitalize: "words",
                clean: cleanText,
              })}
              {textField({
                key: "facebookLink",
                label: "Facebook Link:",
                placeholder: "E.g.: https://www.facebook.com/your.name",
                required: false,
                keyboardType: "url",
                autoCapitalize: "none",
                clean: (v: string) => v.replace(/\s/g, ""),
              })}
              {textField({
                key: "bachelorsDegree",
                label: "Bachelor's Degree (College):",
                placeholder: "E.g.: Bachelor of Arts in Psychology",
                required: true,
                autoCapitalize: "characters",
                clean: toUpper,
              })}
              {textField({
                key: "lastSchool",
                label: "Name of School:",
                placeholder: "E.g.: Polytechnic University of the Philippines",
                required: true,
                autoCapitalize: "characters",
                clean: toUpper,
              })}
              {checkbox(
                "tcpSameAsCollege",
                "I took my Teacher Certificate Program (TCP) at the same school. Use my Bachelor's Degree and Name of School above.",
              )}
              {dataTypes.tcpSameAsCollege ? (
                <Text style={styles.formatHint}>
                  TCP Program and School will be the same as your Bachelor's
                  Degree and Name of School.
                </Text>
              ) : (
                <>
                  {textField({
                    key: "tcpProgram",
                    label:
                      "Program Name/Course (for Teacher Certificate Program (TCP)):",
                    hint:
                      "Examples:\n" +
                      "\u2022 Bachelor of Secondary Education Major in (Specialization)\n" +
                      "\u2022 Certificate in Professional Teaching Program Major in (Specialization)\n" +
                      "\u2022 Teacher Certificate Program Major in (Specialization)\n\n" +
                      "Note: Only include courses related to Education.",
                    placeholder: "Optional",
                    autoCapitalize: "characters",
                    clean: toUpper,
                  })}
                  {textField({
                    key: "tcpSchool",
                    label: "Last School Attended (for TCP):",
                    hint:
                      "Note: If you are a Unit Earner, list the school where you earned your teaching units.\n" +
                      "Format: [Full School Name] - [Branch if applicable]",
                    placeholder: "Optional",
                    autoCapitalize: "characters",
                    clean: toUpper,
                  })}
                </>
              )}

              {uploadField({
                key: "formalPhoto",
                label: "Upload Graduation or Formal Photo (optional):",
                required: false,
                buttonText: "Upload photo",
                allowFiles: false,
                noun: "Photo",
              })}
              {uploadField({
                key: "validId",
                label: "Upload Valid ID (optional):",
                required: false,
                buttonText: "Upload valid ID",
                allowFiles: true,
                noun: "ID",
              })}

              {(!!dataTypes.formalPhoto || !!dataTypes.validId) &&
                checkbox(
                  "photoConsent",
                  "I agree that my graduation/formal photo and valid ID may be used in promotional materials and verification purposes.",
                )}
            </View>
          </View>
        )}

        {step === 4 && (
          <View>
            {renderProgressHeader("Promotions & Payment")}
            <View style={styles.warningBanner}>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.warningText}>
                  ATTENTION: Kindly consult with our admins regarding the course
                  prices before proceeding.
                </Text>
              </View>
            </View>
            <View style={[styles.formBody, { paddingTop: 12 }]}>
              <Text style={[styles.label, { marginTop: 0 }]}>
                Promo/Discount to avail:
              </Text>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setIsPromoOpen(!isPromoOpen)}
              >
                <Text
                  style={{
                    color: dataTypes.promo ? "#2F459B" : "#999",
                    flex: 1,
                  }}
                >
                  {dataTypes.promo || "Select promo (optional)"}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>
              {isPromoOpen && (
                <View style={styles.dropdownMenu}>
                  {promoOptions.map((opt) => (
                    <TouchableOpacity
                      key={opt.id}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setField("promo", opt.name);
                        setField("promoId", opt.id);
                        setIsPromoOpen(false);
                      }}
                    >
                      <Text style={{ color: "#2F459B", fontSize: 13 }}>
                        {opt.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {fieldLabel("transactionDate", "Date of Transaction:")}
              <TouchableOpacity
                style={[
                  styles.dropdown,
                  !!errors.transactionDate && styles.inputError,
                ]}
                onPress={() => setShowDatePicker(true)}
              >
                <Text
                  style={{ color: dataTypes.transactionDate ? "#000" : "#999" }}
                >
                  {formatDate(dataTypes.transactionDate) || "Select date"}
                </Text>
                <Ionicons name="calendar-outline" size={20} color="#666" />
              </TouchableOpacity>
              {fieldError("transactionDate")}
              {showDatePicker && (
                <DateTimePicker
                  value={dataTypes.transactionDate ?? new Date()}
                  mode="date"
                  maximumDate={new Date()}
                  onChange={onDateChange}
                />
              )}

              {fieldLabel("paymentChannel", "Payment Method:")}
              <TouchableOpacity
                style={[
                  styles.dropdown,
                  !!errors.paymentChannel && styles.inputError,
                ]}
                onPress={() => setIsMethodOpen(!isMethodOpen)}
              >
                <Text
                  style={{ color: dataTypes.paymentChannel ? "#000" : "#999" }}
                >
                  {dataTypes.paymentChannel || "Select method"}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>
              {isMethodOpen && (
                <View style={styles.dropdownMenu}>
                  {paymentChannels.map((method) => (
                    <TouchableOpacity
                      key={method.id}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setField("paymentChannel", method.name);
                        setField("paymentChannelId", method.id);
                        setIsMethodOpen(false);
                      }}
                    >
                      <Text>{method.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {fieldError("paymentChannel")}
              {(() => {
                const details = channelDetails(dataTypes.paymentChannel);
                if (!details) return null;
                return (
                  <View
                    style={[styles.channelCard, { borderColor: details.color }]}
                  >
                    <Text
                      style={[styles.channelName, { color: details.color }]}
                    >
                      {dataTypes.paymentChannel}
                    </Text>
                    {details.rows.map((row) => (
                      <View key={row.label} style={styles.channelRow}>
                        <Text style={styles.channelLabel}>{row.label}:</Text>
                        <Text style={styles.channelValue} selectable>
                          {row.value || "—"}
                        </Text>
                      </View>
                    ))}
                  </View>
                );
              })()}

              {fieldLabel("paymentType", "Payment Type:", true)}
              <TouchableOpacity
                style={[
                  styles.dropdown,
                  !!errors.paymentType && styles.inputError,
                ]}
                onPress={() => setIsPayTypeOpen(!isPayTypeOpen)}
              >
                <Text
                  style={{ color: dataTypes.paymentType ? "#000" : "#999" }}
                >
                  {dataTypes.paymentType
                    ? PAYMENT_TYPES.find(
                        (t) => t.value === dataTypes.paymentType,
                      )!.name
                    : "Select payment type"}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>
              {isPayTypeOpen && (
                <View style={styles.dropdownMenu}>
                  {PAYMENT_TYPES.map((t) => (
                    <TouchableOpacity
                      key={t.value}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setField("paymentType", t.value);
                        setIsPayTypeOpen(false);
                      }}
                    >
                      <Text>{t.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {fieldError("paymentType")}
              {dataTypes.paymentType === "downpayment" && (
                <Text style={styles.payTypeNote}>
                  With a downpayment, you can access the courses up to LEPT
                  Express. Upload your remaining balance receipt later in your
                  Profile to unlock the rest.
                </Text>
              )}

              {textField({
                key: "amountTransferred",
                label: "Amount Transferred:",
                placeholder: "E.g.: 3500",
                required: false,
                keyboardType: "decimal-pad",
                clean: onlyAmount,
              })}
              {textField({
                key: "referenceNumber",
                label: "Reference Number:",
                placeholder: "Enter Ref #",
                required: false,
                keyboardType: "number-pad",
                clean: (v: string) => v.replace(/\D/g, ""),
              })}

              {uploadField({
                key: "receipt",
                label: "Verification/Receipt:",
                required: false,
                buttonText: "Upload attachment",
                allowFiles: true,
                noun: "Receipt",
              })}
              {dataTypes.extraPayments.map((p, i) => {
                const missing = extraPaymentMissing(p);
                const bad = (k: keyof typeof missing) =>
                  showErrors && missing[k];
                return (
                  <View key={p.key} style={styles.extraPaymentCard}>
                    <View style={styles.extraPaymentHeader}>
                      <Text style={styles.extraPaymentTitle}>
                        Payment {i + 2}
                      </Text>
                      <TouchableOpacity
                        onPress={() => removeExtraPayment(p.key)}
                        hitSlop={8}
                      >
                        <Text style={styles.extraPaymentRemove}>Remove</Text>
                      </TouchableOpacity>
                    </View>

                    <Text
                      style={[
                        styles.label,
                        bad("transactionDate") && styles.labelError,
                      ]}
                    >
                      Date of Transaction:
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.dropdown,
                        bad("transactionDate") && styles.inputError,
                      ]}
                      onPress={() => setDateFor(p.key)}
                    >
                      <Text
                        style={{ color: p.transactionDate ? "#000" : "#999" }}
                      >
                        {formatDate(p.transactionDate) || "Select date"}
                      </Text>
                      <Ionicons
                        name="calendar-outline"
                        size={20}
                        color="#666"
                      />
                    </TouchableOpacity>
                    {dateFor === p.key && (
                      <DateTimePicker
                        value={p.transactionDate ?? new Date()}
                        mode="date"
                        maximumDate={new Date()}
                        onChange={(event, selected) => {
                          setDateFor(null);
                          if (event.type === "set" && selected)
                            updateExtraPayment(p.key, {
                              transactionDate: selected,
                            });
                        }}
                      />
                    )}

                    <Text
                      style={[
                        styles.label,
                        bad("paymentChannel") && styles.labelError,
                      ]}
                    >
                      Payment Method:
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.dropdown,
                        bad("paymentChannel") && styles.inputError,
                      ]}
                      onPress={() =>
                        setOpenMethodFor(openMethodFor === p.key ? null : p.key)
                      }
                    >
                      <Text
                        style={{ color: p.paymentChannel ? "#000" : "#999" }}
                      >
                        {p.paymentChannel || "Select method"}
                      </Text>
                      <Ionicons name="chevron-down" size={20} color="#666" />
                    </TouchableOpacity>
                    {openMethodFor === p.key && (
                      <View style={styles.dropdownMenu}>
                        {paymentChannels.map((method) => (
                          <TouchableOpacity
                            key={method.id}
                            style={styles.dropdownItem}
                            onPress={() => {
                              updateExtraPayment(p.key, {
                                paymentChannel: method.name,
                                paymentChannelId: method.id,
                              });
                              setOpenMethodFor(null);
                            }}
                          >
                            <Text>{method.name}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}

                    <Text
                      style={[
                        styles.label,
                        bad("amountTransferred") && styles.labelError,
                      ]}
                    >
                      Amount Transferred:
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        bad("amountTransferred") && styles.inputError,
                      ]}
                      placeholder="E.g.: 1000"
                      placeholderTextColor="#999"
                      keyboardType="decimal-pad"
                      value={p.amountTransferred}
                      onChangeText={(v) =>
                        updateExtraPayment(p.key, {
                          amountTransferred: onlyAmount(v),
                        })
                      }
                    />

                    <Text
                      style={[
                        styles.label,
                        bad("referenceNumber") && styles.labelError,
                      ]}
                    >
                      Reference Number:
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        bad("referenceNumber") && styles.inputError,
                      ]}
                      placeholder="Enter Ref #"
                      placeholderTextColor="#999"
                      keyboardType="number-pad"
                      value={p.referenceNumber}
                      onChangeText={(v) =>
                        updateExtraPayment(p.key, {
                          referenceNumber: v.replace(/\D/g, ""),
                        })
                      }
                    />

                    <Text style={styles.label}>Verification/Receipt:</Text>
                    <TouchableOpacity
                      style={styles.uploadBtn}
                      onPress={() =>
                        chooseFile(`Payment ${i + 2} Receipt`, true, (f) =>
                          updateExtraPayment(p.key, { receipt: f }),
                        )
                      }
                    >
                      <Ionicons
                        name="attach-outline"
                        size={20}
                        color="#666"
                        style={{ marginBottom: 5 }}
                      />
                      <Text style={styles.uploadText} numberOfLines={1}>
                        {p.receipt
                          ? `✓ ${p.receipt.name}`
                          : "Upload attachment"}
                      </Text>
                    </TouchableOpacity>
                    {p.receipt && (
                      <View style={{ marginTop: 6 }}>
                        {previewOf(p.receipt, `extra-${p.key}`, "Receipt")}
                      </View>
                    )}
                  </View>
                );
              })}
              {fieldError("extraPayments")}

              {dataTypes.extraPayments.length + 1 < MAX_PAYMENTS && (
                <TouchableOpacity
                  style={styles.addPaymentBtn}
                  onPress={addExtraPayment}
                >
                  <Ionicons
                    name="add-circle-outline"
                    size={18}
                    color="#2F459B"
                  />
                  <Text style={styles.addPaymentText}>Add another payment</Text>
                </TouchableOpacity>
              )}
              <Text style={styles.formatHint}>
                Paid in parts or through a different method? Add each payment
                separately.
              </Text>

              {checkbox(
                "paymentNoticeAgreement",
                "I acknowledge that all info is correct and had consulted with an admin before proceeding.",
              )}
            </View>
          </View>
        )}

        {step === 5 && (
          <View>
            {renderProgressHeader("Summary")}
            <View style={styles.formBody}>
              <Text style={styles.summaryIntro}>
                Kindly verify all information before proceeding.
              </Text>
              {summarySection({
                sectionKey: "program",
                title: "Program & Curriculum",
                children: (
                  <>
                    {summaryRow({
                      label: "Type of Taker",
                      value: dataTypes.takerType ?? "—",
                    })}
                    {summaryRow({
                      label: "Examination Program",
                      value: dataTypes.examProgram,
                    })}
                    {isOthers &&
                      summaryRow({
                        label: "Specified Program",
                        value: dataTypes.comments.trim(),
                      })}
                  </>
                ),
              })}
              {summarySection({
                sectionKey: "personalInfo",
                title: "Personal Information & Verification",
                children: (
                  <>
                    {summaryRow({
                      label: "Full Name",
                      value: `${dataTypes.firstName}${dataTypes.middleName ? " " + dataTypes.middleName : ""} ${dataTypes.lastName}`,
                    })}
                    {summaryRow({ label: "Email", value: dataTypes.email })}
                    {summaryRow({
                      label: "Facebook Name",
                      value: dataTypes.facebookName.trim() || "Not provided",
                    })}
                    {summaryRow({
                      label: "Facebook Link",
                      value: dataTypes.facebookLink.trim() || "Not provided",
                    })}
                    {summaryRow({
                      label: "Bachelor's Degree (College)",
                      value: dataTypes.bachelorsDegree,
                    })}
                    {summaryRow({
                      label: "Name of School",
                      value: dataTypes.lastSchool,
                    })}
                    {summaryRow({
                      label: "Program Name/Course (TCP)",
                      value: dataTypes.tcpProgram.trim() || "Not provided",
                    })}
                    {summaryRow({
                      label: "Last School Attended (TCP)",
                      value: dataTypes.tcpSchool.trim() || "Not provided",
                    })}
                    {summaryRow({
                      label: "Graduation or Formal Photo",
                      value: dataTypes.formalPhoto?.name ?? "Not provided",
                    })}
                    {filePreview("formalPhoto", "Photo")}
                    {summaryRow({
                      label: "Valid ID",
                      value: dataTypes.validId?.name ?? "Not provided",
                    })}
                    {filePreview("validId", "ID")}
                  </>
                ),
              })}
              {summarySection({
                sectionKey: "payment",
                title: "Promotions & Payment",
                children: (
                  <>
                    {summaryRow({
                      label: "Promo/Discount",
                      value: dataTypes.promo || "None",
                    })}
                    {summaryRow({
                      label: "Date of Transaction",
                      value: formatDate(dataTypes.transactionDate),
                    })}
                    {summaryRow({
                      label: "Payment Method",
                      value: dataTypes.paymentChannel,
                    })}
                    {summaryRow({
                      label: "Payment Type",
                      value:
                        dataTypes.paymentType === "downpayment"
                          ? "Downpayment"
                          : dataTypes.paymentType === "full"
                            ? "Full Payment"
                            : "—",
                    })}
                    {summaryRow({
                      label: "Amount Transferred",
                      value: dataTypes.amountTransferred,
                    })}
                    {summaryRow({
                      label: "Reference Number",
                      value: dataTypes.referenceNumber,
                    })}
                    {summaryRow({
                      label: "Receipt",
                      value: dataTypes.receipt?.name ?? "—",
                    })}
                    {filePreview("receipt", "Receipt")}
                    {dataTypes.extraPayments.map((p, i) => (
                      <View
                        key={`sum-${p.key}`}
                        style={styles.summaryPaymentBlock}
                      >
                        <Text style={styles.extraPaymentTitle}>
                          Payment {i + 2}
                        </Text>
                        {summaryRow({
                          label: "Date of Transaction",
                          value: formatDate(p.transactionDate),
                        })}
                        {summaryRow({
                          label: "Payment Method",
                          value: p.paymentChannel,
                        })}
                        {summaryRow({
                          label: "Amount Transferred",
                          value: p.amountTransferred,
                        })}
                        {summaryRow({
                          label: "Reference Number",
                          value: p.referenceNumber,
                        })}
                        {summaryRow({
                          label: "Receipt",
                          value: p.receipt?.name ?? "—",
                        })}
                        {previewOf(p.receipt, `sum-${p.key}`, "Receipt")}
                      </View>
                    ))}
                  </>
                ),
              })}
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.continueBtn, loading && { opacity: 0.7 }]}
          onPress={handleContinue}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.continueText}>Continue</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white" },
  headerContainer: { height: 220 },
  headerImage: { width: "100%", height: "100%" },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(13, 42, 148, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  backBtn: { position: "absolute", top: 40, left: 20 },
  headerTitle: {
    color: "white",
    fontSize: 26,
    fontWeight: "bold",
    marginTop: 20,
    textAlign: "center",
  },
  stepperRow: { flexDirection: "row", alignItems: "center", marginTop: 30 },
  stepWrapper: { flexDirection: "row", alignItems: "center" },
  stepCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
  },
  stepActive: {
    backgroundColor: "#0D2A94",
    borderWidth: 2,
    borderColor: "#FFB800",
  },
  stepDone: { backgroundColor: "#FFB800" },
  stepInactive: { backgroundColor: "white" },
  stepText: { fontWeight: "bold", color: "#999", fontSize: 12 },
  stepLine: {
    width: 25,
    height: 2,
    backgroundColor: "#ccc",
    marginHorizontal: 2,
  },
  lineActive: { backgroundColor: "#FFB800" },
  formBody: { padding: 20 },
  label: {
    fontWeight: "bold",
    fontSize: 14,
    color: "#000",
    marginTop: 15,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 4,
    color: "#000",
  },
  labelError: { color: "#e53935" },
  inputError: { borderColor: "#e53935" },
  uploadBtnError: { borderColor: "#e53935" },
  fieldError: { color: "#e53935", fontSize: 11, marginTop: 2, marginBottom: 6 },
  formatHint: { fontSize: 11, color: "#777", marginTop: -4, marginBottom: 6 },
  dropdown: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
  },
  dropdownMenu: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    marginTop: 5,
    backgroundColor: "#fff",
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  radioRow: { flexDirection: "row", alignItems: "center", marginVertical: 10 },
  radioLabel: { marginLeft: 10, fontSize: 14 },
  uploadBtn: {
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: "#000",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
  },
  uploadText: { color: "#666", maxWidth: width - 80 },
  summaryItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 18,
    borderWidth: 1,
    borderColor: "#000",
    borderRadius: 10,
    marginBottom: 15,
  },
  summaryText: { fontWeight: "bold" },
  footer: { padding: 20, borderTopWidth: 1, borderColor: "#eee" },
  continueBtn: {
    backgroundColor: "#0D2A94",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
  },
  continueText: { color: "white", fontWeight: "bold" },
  completeBody: { flex: 1, alignItems: "center", padding: 25 },
  thankYouHeader: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
  },
  statusSubtext: { textAlign: "center", color: "#666", marginBottom: 25 },
  nextStepsContainer: { width: "100%", marginBottom: 30 },
  nextStepsHeader: { fontWeight: "bold", marginBottom: 15, fontSize: 15 },
  checkItem: { flexDirection: "row", marginBottom: 12 },
  checkText: {
    marginLeft: 10,
    fontSize: 13,
    color: "#333",
    flex: 1,
    lineHeight: 18,
  },
  privacyContent: {
    fontSize: 14,
    color: "#333",
    lineHeight: 22,
    marginBottom: 15,
  },
  warningBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#fff8e1",
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 4,
  },
  warningText: {
    color: "#b9770e",
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "regular",
  },
  required: { color: "#c0392b" },
  summaryIntro: {
    fontSize: 14,
    color: "#555",
    marginBottom: 16,
    lineHeight: 20,
  },
  summaryCard: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    marginBottom: 12,
    overflow: "hidden",
  },
  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
  },
  summaryTitle: { fontWeight: "bold", fontSize: 15, color: "#000" },
  summaryBody: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 4,
    backgroundColor: "#fafbff",
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  summaryRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  summaryLabel: {
    fontSize: 12,
    color: "#0D2A94",
    fontWeight: "700",
    marginBottom: 2,
  },
  summaryValue: { fontSize: 14, color: "#000" },
  bold: { fontWeight: "bold" },
  channelCard: {
    borderWidth: 2,
    borderRadius: 10,
    padding: 14,
    marginTop: 10,
    marginBottom: 4,
    backgroundColor: "#fff",
  },
  channelName: { fontWeight: "bold", fontSize: 15, marginBottom: 8 },
  channelRow: { flexDirection: "row", marginBottom: 4 },
  channelLabel: { fontSize: 13, color: "#333", fontWeight: "600", width: 120 },
  channelValue: { fontSize: 13, color: "#000", flex: 1 },
  payTypeNote: {
    fontSize: 12,
    color: "#2F459B",
    backgroundColor: "#EEF1FF",
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 6,
    lineHeight: 17,
  },
  previewBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderWidth: 1,
    borderColor: "#0D2A94",
    borderRadius: 8,
    marginTop: 5,
    gap: 8,
  },
  previewBtnText: {
    color: "#0D2A94",
    fontWeight: "600",
    fontSize: 13,
  },
  extraPaymentCard: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 14,
    marginTop: 16,
  },
  extraPaymentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  extraPaymentTitle: { fontWeight: "bold", fontSize: 15, color: "#2F459B" },
  extraPaymentRemove: { color: "#e53935", fontWeight: "600", fontSize: 13 },
  addPaymentBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
    marginBottom: 8,
    alignSelf: "flex-start",
  },
  addPaymentText: { color: "#2F459B", fontWeight: "700", fontSize: 14 },
  summaryPaymentBlock: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  receiptThumbnail: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#ddd",
  },
});
