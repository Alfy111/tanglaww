import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  ImageBackground,
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

interface dataTypes {
  privacyAgreement: boolean | null;
  curriculum: string | null;
  curriculumId: number | null;
  specialization: string;
  specializationId: number | null;
  takerType: string | null;
  takerTypeId: number | null;
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  bachelorsDegree: string;
  lastSchool: string;
  province: string;
  promo: string;
  promoId: number | null;
  paymentChannel: string;
  paymentChannelId: number | null;
  referenceNumber: string;
  amountTransferred: string;
  paymentNoticeAgreement: boolean;
  attachmentUri: string | null;
  attachmentName: string | null;
  attachmentType: string | null;
}

const defaultValues: dataTypes = {
  privacyAgreement: null,
  curriculum: null,
  curriculumId: null,
  specialization: "",
  specializationId: null,
  takerType: null,
  takerTypeId: null,
  firstName: "",
  middleName: "",
  lastName: "",
  email: "",
  bachelorsDegree: "",
  lastSchool: "",
  province: "",
  promo: "",
  promoId: null,
  paymentChannel: "",
  paymentChannelId: null,
  referenceNumber: "",
  amountTransferred: "",
  paymentNoticeAgreement: false,
  attachmentUri: null,
  attachmentName: null,
  attachmentType: null,
};

function validateStep(step: number, form: dataTypes): string[] {
  const errors: string[] = [];

  if (step === 1) {
    if (form.privacyAgreement === null)
      errors.push("Kindly select Agree or Disagree to the Privacy Notice.");
    if (form.privacyAgreement === false)
      errors.push(
        "To proceed with the enrollment, you must agree to the Data Privacy Notice.",
      );
  }

  if (step === 2) {
    const isEmpty =
      !form.curriculumId || !form.specializationId || !form.takerTypeId;
    if (isEmpty) errors.push("Please fill in all necessary informations.");
  }

  if (step === 3) {
    const isEmpty =
      !form.firstName.trim() ||
      !form.lastName.trim() ||
      !form.email.trim() ||
      !form.bachelorsDegree.trim() ||
      !form.lastSchool.trim() ||
      !form.province.trim();
    if (isEmpty) errors.push("Please fill in all necessary informations.");
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errors.push("Please enter a valid email address.");
  }

  if (step === 4) {
    if (
      !form.paymentChannelId ||
      !form.referenceNumber.trim() ||
      !form.amountTransferred.trim()
    )
      errors.push("Please fill in all necessary informations.");
    if (!form.attachmentUri)
      errors.push("Please upload your payment receipt/verification.");
    if (!form.paymentNoticeAgreement)
      errors.push("Kindly acknowledge that all information is correct.");
  }
  return errors;
}

export default function EnrollmentScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isRegistrationComplete, setIsRegistrationComplete] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [dataTypes, setDataTypes] = useState<dataTypes>(defaultValues);
  const [isMajorOpen, setIsMajorOpen] = useState(false);
  const [isPromoOpen, setIsPromoOpen] = useState(false);
  const [isMethodOpen, setIsMethodOpen] = useState(false);
  const [receiptPreview, setReceiptPreview] = useState(false);

  const [summary, setSummary] = useState<Record<string, boolean>>({
    program: false,
    personalInfo: false,
    promo: false,
    payment: false,
  });
  const toggle = (key: string) =>
    setSummary((prev) => ({ ...prev, [key]: !prev[key] }));

  const setField = <field extends keyof dataTypes>(
    key: field,
    value: dataTypes[field],
  ) => setDataTypes((prev) => ({ ...prev, [key]: value }));

  const typeOfTakerOptions = [
    { id: 1, name: "First time" },
    { id: 2, name: "Retaker" },
  ];

  const curriculumOptions = [
    { id: 1, name: "Bachelor of Elementary Education (BEEd)" },
    { id: 2, name: "Bachelor of Secondary Education (BSEd)" },
  ];

  const majorshipOptions = [
    { id: 1, name: "English" },
    { id: 2, name: "Filipino" },
    { id: 3, name: "Mathematics" },
    { id: 4, name: "Science" },
    { id: 5, name: "Social Values" },
    { id: 6, name: "Values Education" },
  ];

  const promoOptions = [
    {
      id: 1,
      name: "Advocacy Promo (BSEd and BEEd with specialization - 3500)",
    },
    { id: 2, name: "Advocacy Promo (BEEd - 2500)" },
    { id: 3, name: "Regular Rates (BSEd and BEEd with specialization - 5000)" },
    { id: 4, name: "Regular Rates (BEEd - 4000)" },
    { id: 5, name: "Summa Cum Laude" },
  ];

  const paymentChannels = [
    { id: 1, name: "GCash" },
    { id: 2, name: "Maya" },
    { id: 3, name: "Bank Transfer" },
    { id: 4, name: "Cash" },
    { id: 5, name: "Others" },
  ];

  const handleAttachment = () => {
    Alert.alert("Upload Attachment", "Choose an option", [
      {
        text: "Camera",
        onPress: async () => {
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
          });
          if (!result.canceled) {
            const asset = result.assets[0];
            setField("attachmentUri", asset.uri);
            setField("attachmentName", asset.fileName ?? "photo.jpg");
            setField("attachmentType", asset.mimeType ?? "image/jpeg");
          }
        },
      },
      {
        text: "Gallery",
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
          });
          if (!result.canceled) {
            const asset = result.assets[0];
            setField("attachmentUri", asset.uri);
            setField("attachmentName", asset.fileName ?? "photo.jpg");
            setField("attachmentType", asset.mimeType ?? "image/jpeg");
          }
        },
      },
      {
        text: "File (PDF/Docs)",
        onPress: async () => {
          const result = await DocumentPicker.getDocumentAsync({
            type: "*/*",
            copyToCacheDirectory: true,
          });
          if (!result.canceled) {
            const file = result.assets[0];
            setField("attachmentUri", file.uri);
            setField("attachmentName", file.name);
            setField(
              "attachmentType",
              file.mimeType ?? "application/octet-stream",
            );
          }
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const uploadAttachment = async (): Promise<string | null> => {
    if (!dataTypes.attachmentUri) return null;

    const safeName = (dataTypes.attachmentName ?? "receipt").replace(
      /[^a-zA-Z0-9._-]/g,
      "_",
    );
    const fileName = `${Date.now()}_${safeName}`;

    const bytes = await readFileBytes(dataTypes.attachmentUri);

    const { error } = await supabase.storage
      .from("receipts")
      .upload(`payments/${fileName}`, bytes, {
        contentType: dataTypes.attachmentType ?? "image/jpeg",
        upsert: false,
      });

    if (error)
      throw new Error("Could not upload your receipt: " + error.message);

    const { data: urlData } = supabase.storage
      .from("receipts")
      .getPublicUrl(`payments/${fileName}`);

    return urlData.publicUrl;
  };

  const handleSubmit = async () => {
    if (loading) return;
    setLoading(true);

    try {
      const { data: existingStudent } = await supabase
        .from("student")
        .select("id")
        .eq("email", dataTypes.email.trim().toLowerCase())
        .maybeSingle();

      let studentData;

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
          setLoading(false);
          return;
        }

        const { data: updatedStudent, error: updateError } = await supabase
          .from("student")
          .update({
            firstName: dataTypes.firstName,
            lastName: dataTypes.lastName,
            middleName: dataTypes.middleName,
            bachelorsDegree: dataTypes.bachelorsDegree,
            majorshipTaken: dataTypes.specialization,
            lastSchoolAttended: dataTypes.lastSchool,
            province: dataTypes.province,
            dataprivacyconsent: new Date().toISOString(),
          })
          .eq("id", existingStudent.id)
          .select()
          .single();

        if (updateError) throw new Error(updateError.message);
        studentData = updatedStudent;
      } else {
        const { data: newStudent, error: studentError } = await supabase
          .from("student")
          .insert({
            firstName: dataTypes.firstName,
            lastName: dataTypes.lastName,
            middleName: dataTypes.middleName,
            email: dataTypes.email,
            bachelorsDegree: dataTypes.bachelorsDegree,
            majorshipTaken: dataTypes.specialization,
            lastSchoolAttended: dataTypes.lastSchool,
            province: dataTypes.province,
            dataprivacyconsent: new Date().toISOString(),
          })
          .select()
          .single();

        if (studentError) throw new Error(studentError.message);
        studentData = newStudent;
      }

      const proofUrl = await uploadAttachment();

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

      const { data: existingPayment } = await supabase
        .from("paymentDetails")
        .select("paymentDetails_id")
        .eq("enrollment_id", enrollmentData.enrollment_id)
        .maybeSingle();

      if (existingPayment) {
        const { error: paymentError } = await supabase
          .from("paymentDetails")
          .update({
            paymentChannel_id: dataTypes.paymentChannelId,
            referenceNumber: dataTypes.referenceNumber,
            amountTransferred: parseFloat(dataTypes.amountTransferred),
            dateOfPayment: new Date().toISOString(),
            proofOfPaymentUrl: proofUrl,
            agreedToPaymentNotice: dataTypes.paymentNoticeAgreement,
          })
          .eq("paymentDetails_id", existingPayment.paymentDetails_id);

        if (paymentError) throw new Error(paymentError.message);
      } else {
        const { error: paymentError } = await supabase
          .from("paymentDetails")
          .insert({
            enrollment_id: enrollmentData.enrollment_id,
            paymentChannel_id: dataTypes.paymentChannelId,
            referenceNumber: dataTypes.referenceNumber,
            amountTransferred: parseFloat(dataTypes.amountTransferred),
            dateOfPayment: new Date().toISOString(),
            proofOfPaymentUrl: proofUrl,
            agreedToPaymentNotice: dataTypes.paymentNoticeAgreement,
          });

        if (paymentError) throw new Error(paymentError.message);
      }

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

    if (stepErrors.length > 0) {
      setErrors(stepErrors);
      return;
    }
    setErrors([]);

    if (step < 5) setStep(step + 1);
    else handleSubmit();
  };

  const handleBack = () => {
    setErrors([]);
    if (step > 1) setStep(step - 1);
    else router.back();
  };

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

  const errorRender = () => {
    if (errors.length === 0) return null;
    return (
      <View style={styles.errorBanner}>
        <Ionicons
          name="alert-circle"
          size={18}
          color="#c0392b"
          style={{
            marginTop: 2,
          }}
        />
        <View style={{ flex: 1, marginLeft: 8 }}>
          {errors.map((e, i) => (
            <Text key={i} style={styles.errorText}>
              . {e}
            </Text>
          ))}
        </View>
      </View>
    );
  };

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
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {step === 1 && (
          <View>
            {renderProgressHeader("Data Privacy Notice")}
            <View style={styles.formBody}>
              {errorRender()}
              <Text style={styles.privacyContent}>
                <Text style={styles.bold}>Teacher A Review Center</Text>{" "}
                recognizes its responsibilities under the{" "}
                <Text style={styles.bold}>RA 10173</Text> also known as the{" "}
                <Text style={styles.bold}>Data Privacy Act of 2012</Text> with
                respect to the data they collect, record, organize, update, use,
                consolidate or destruct from the data subject.
              </Text>
              <Text style={[styles.label, { color: "#c0392b" }]}>
                * You must agree to proceed.
              </Text>
              <TouchableOpacity
                style={styles.radioRow}
                onPress={() => setField("privacyAgreement", true)}
              >
                <Ionicons
                  name={
                    dataTypes.privacyAgreement === true
                      ? "radio-button-on"
                      : "radio-button-off"
                  }
                  size={24}
                  color="#0D2A94"
                />
                <Text style={styles.radioLabel}>Agree</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.radioRow}
                onPress={() => setField("privacyAgreement", false)}
              >
                <Ionicons
                  name={
                    dataTypes.privacyAgreement === false
                      ? "radio-button-on"
                      : "radio-button-off"
                  }
                  size={24}
                  color="#555"
                />
                <Text style={styles.radioLabel}>Disagree</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {step === 2 && (
          <View>
            {renderProgressHeader("Program & Curriculum")}
            <View style={styles.formBody}>
              {errorRender()}
              <Text style={styles.label}>Type of Taker:*</Text>
              {typeOfTakerOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.id}
                  style={styles.radioRow}
                  onPress={() => {
                    setField("takerType", opt.name);
                    setField("takerTypeId", opt.id);
                  }}
                >
                  <Ionicons
                    name={
                      dataTypes.takerType === opt.name
                        ? "radio-button-on"
                        : "radio-button-off"
                    }
                    size={22}
                    color="#0D2A94"
                  />
                  <Text style={styles.radioLabel}>{opt.name}</Text>
                </TouchableOpacity>
              ))}

              <Text style={styles.label}>Curriculum:*</Text>
              {curriculumOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.id}
                  style={styles.radioRow}
                  onPress={() => {
                    setField("curriculum", opt.name);
                    setField("curriculumId", opt.id);
                  }}
                >
                  <Ionicons
                    name={
                      dataTypes.curriculum === opt.name
                        ? "radio-button-on"
                        : "radio-button-off"
                    }
                    size={22}
                    color="#0D2A94"
                  />
                  <Text style={styles.radioLabel}>{opt.name}</Text>
                </TouchableOpacity>
              ))}

              <Text style={styles.label}>Specialization:*</Text>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setIsMajorOpen(!isMajorOpen)}
              >
                <Text
                  style={{ color: dataTypes.specialization ? "#000" : "#999" }}
                >
                  {" "}
                  {dataTypes.specialization || "Select Specialization"}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>
              {isMajorOpen && (
                <View style={styles.dropdownMenu}>
                  {majorshipOptions.map((opt) => (
                    <TouchableOpacity
                      key={opt.id}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setField("specialization", opt.name);
                        setField("specializationId", opt.id);
                        setIsMajorOpen(false);
                      }}
                    >
                      <Text>{opt.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}

        {step === 3 && (
          <View>
            {renderProgressHeader("Personal Information")}
            <View style={styles.formBody}>
              {errorRender()}
              <Text style={styles.label}>First Name: *</Text>
              <TextInput
                style={styles.input}
                placeholder="Juan"
                placeholderTextColor="#666"
                value={dataTypes.firstName}
                onChangeText={(val) => setField("firstName", val)}
              />
              <Text style={styles.label}>Middle Name:</Text>
              <TextInput
                style={styles.input}
                placeholder="Santos"
                placeholderTextColor="#666"
                value={dataTypes.middleName}
                onChangeText={(val) => setField("middleName", val)}
              />
              <Text style={styles.label}>Last Name: *</Text>
              <TextInput
                style={styles.input}
                placeholder="Dela Cruz"
                placeholderTextColor="#666"
                value={dataTypes.lastName}
                onChangeText={(val) => setField("lastName", val)}
              />
              <Text style={styles.label}>Email Address: *</Text>
              <TextInput
                style={styles.input}
                placeholder="delacruzjuan@example.com"
                placeholderTextColor="#666"
                keyboardType="email-address"
                autoCapitalize="none"
                value={dataTypes.email}
                onChangeText={(val) => setField("email", val)}
              />
              <Text style={styles.label}>Bachelor's Degree & Majorship: *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. BSEd English"
                placeholderTextColor="#666"
                value={dataTypes.bachelorsDegree}
                onChangeText={(val) => setField("bachelorsDegree", val)}
              />
              <Text style={styles.label}>Last School Attended: *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. University of Santo Tomas"
                placeholderTextColor="#666"
                value={dataTypes.lastSchool}
                onChangeText={(val) => setField("lastSchool", val)}
              />
              <Text style={styles.label}>Province: *</Text>
              <TextInput
                style={styles.input}
                placeholder="Metro Manila"
                placeholderTextColor="#666"
                value={dataTypes.province}
                onChangeText={(val) => setField("province", val)}
              />
            </View>
          </View>
        )}

        {step === 4 && (
          <View>
            {renderProgressHeader("Promotions & Payment")}
            <View style={styles.warningBanner}>
              <Ionicons
                name="alert-circle"
                size={18}
                color="#b9770e"
                style={{ marginTop: 2 }}
              />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.warningText}>
                  ATTENTION: Kindly consult with our admins regarding the course
                  prices before proceeding.
                </Text>
              </View>
            </View>
            <View style={styles.formBody}>
              {errorRender()}
              <Text style={styles.label}>Promo/Discount to avail</Text>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setIsPromoOpen(!isPromoOpen)}
              >
                <Text style={{ color: dataTypes.promo ? "#2F459B" : "#999" }}>
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

              <Text style={styles.label}>Payment Method:*</Text>
              <TouchableOpacity
                style={styles.dropdown}
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

              <Text style={styles.label}>Amount Transferred:*</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 3500"
                placeholderTextColor="#666"
                keyboardType="numeric"
                value={dataTypes.amountTransferred}
                onChangeText={(val) => setField("amountTransferred", val)}
              />

              <Text style={styles.label}>Reference Number:*</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter Ref #"
                placeholderTextColor="#666"
                keyboardType="numeric"
                value={dataTypes.referenceNumber}
                onChangeText={(val) => setField("referenceNumber", val)}
              />

              <Text style={[styles.label, { marginTop: 15 }]}>
                Verification/Receipt:*
              </Text>
              <TouchableOpacity
                style={styles.uploadBtn}
                onPress={handleAttachment}
              >
                <Ionicons
                  name="attach-outline"
                  size={20}
                  color="#666"
                  style={{ marginBottom: 5 }}
                />
                <Text style={styles.uploadText}>
                  {dataTypes.attachmentName
                    ? `✓ ${dataTypes.attachmentName}`
                    : "Upload attachment"}
                </Text>
              </TouchableOpacity>

              {dataTypes.attachmentUri && (
                <View style={{ marginTop: 10 }}>
                  {dataTypes.attachmentType === "application/pdf" ? (
                    <TouchableOpacity
                      style={styles.previewBtn}
                      onPress={() =>
                        WebBrowser.openBrowserAsync(dataTypes.attachmentUri!)
                      }
                    >
                      <Ionicons
                        name="document-outline"
                        size={20}
                        color="#0D2A94"
                      />
                      <Text style={styles.previewBtnText}>View PDF</Text>
                    </TouchableOpacity>
                  ) : (
                    <>
                      <TouchableOpacity
                        style={styles.previewBtn}
                        onPress={() => setReceiptPreview(!receiptPreview)}
                      >
                        <Ionicons
                          name={
                            receiptPreview ? "eye-off-outline" : "eye-outline"
                          }
                          size={20}
                          color="#0D2A94"
                        />
                        <Text style={styles.previewBtnText}>
                          {receiptPreview ? "Hide Receipt" : "View Receipt"}
                        </Text>
                      </TouchableOpacity>
                      {receiptPreview && (
                        <Image
                          source={{ uri: dataTypes.attachmentUri }}
                          style={styles.receiptThumbnail}
                          resizeMode="contain"
                        />
                      )}
                    </>
                  )}
                </View>
              )}

              <TouchableOpacity
                style={[styles.radioRow, { marginTop: 20 }]}
                onPress={() =>
                  setField(
                    "paymentNoticeAgreement",
                    !dataTypes.paymentNoticeAgreement,
                  )
                }
              >
                <Ionicons
                  name={
                    dataTypes.paymentNoticeAgreement
                      ? "checkbox"
                      : "square-outline"
                  }
                  size={24}
                  color="#0D2A94"
                />
                <Text
                  style={[
                    styles.radioLabel,
                    { fontSize: 12, flex: 1, lineHeight: 17 },
                  ]}
                >
                  I acknowledge that all info is correct and had consulted with
                  an admin before proceeding.
                </Text>
              </TouchableOpacity>
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
                      label: "Curriculum",
                      value: dataTypes.curriculum ?? "—",
                    })}
                    {summaryRow({
                      label: "Specialization",
                      value: dataTypes.specialization,
                    })}
                    {summaryRow({
                      label: "Type of Taker",
                      value: dataTypes.takerType ?? "—",
                    })}
                  </>
                ),
              })}
              {summarySection({
                sectionKey: "personalInfo",
                title: "Personal Information",
                children: (
                  <>
                    {summaryRow({
                      label: "Full Name",
                      value: `${dataTypes.firstName}${dataTypes.middleName ? " " + dataTypes.middleName : ""} ${dataTypes.lastName}`,
                    })}
                    {summaryRow({ label: "Email", value: dataTypes.email })}
                    {summaryRow({
                      label: "Degree / Majorship",
                      value: dataTypes.bachelorsDegree,
                    })}
                    {summaryRow({
                      label: "Last School",
                      value: dataTypes.lastSchool,
                    })}
                    {summaryRow({
                      label: "Province",
                      value: dataTypes.province,
                    })}
                  </>
                ),
              })}
              {summarySection({
                sectionKey: "promo",
                title: "Promotions & Verification",
                children: (
                  <>
                    {summaryRow({
                      label: "Promo/Discount",
                      value: dataTypes.promo || "None",
                    })}
                    {summaryRow({
                      label: "Attachment",
                      value: dataTypes.attachmentName ?? "None",
                    })}
                    {dataTypes.attachmentUri && (
                      <View style={{ marginTop: 10 }}>
                        {dataTypes.attachmentType === "application/pdf" ? (
                          <TouchableOpacity
                            style={styles.previewBtn}
                            onPress={() =>
                              WebBrowser.openBrowserAsync(
                                dataTypes.attachmentUri!,
                              )
                            }
                          >
                            <Ionicons
                              name="document-outline"
                              size={20}
                              color="#0D2A94"
                            />
                            <Text style={styles.previewBtnText}>View PDF</Text>
                          </TouchableOpacity>
                        ) : (
                          <>
                            <TouchableOpacity
                              style={styles.previewBtn}
                              onPress={() => setReceiptPreview(!receiptPreview)}
                            >
                              <Ionicons
                                name={
                                  receiptPreview
                                    ? "eye-off-outline"
                                    : "eye-outline"
                                }
                                size={20}
                                color="#0D2A94"
                              />
                              <Text style={styles.previewBtnText}>
                                {receiptPreview
                                  ? "Hide Receipt"
                                  : "View Receipt"}
                              </Text>
                            </TouchableOpacity>
                            {receiptPreview && (
                              <Image
                                source={{ uri: dataTypes.attachmentUri }}
                                style={styles.receiptThumbnail}
                                resizeMode="contain"
                              />
                            )}
                          </>
                        )}
                      </View>
                    )}
                  </>
                ),
              })}
              {summarySection({
                sectionKey: "payment",
                title: "Payment Information",
                children: (
                  <>
                    {summaryRow({
                      label: "Payment Method",
                      value: dataTypes.paymentChannel,
                    })}
                    {summaryRow({
                      label: "Amount",
                      value: dataTypes.amountTransferred,
                    })}
                    {summaryRow({
                      label: "Reference #",
                      value: dataTypes.referenceNumber,
                    })}
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
    marginBottom: 10,
    color: "#000",
  },
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
  uploadText: { color: "#666" },
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
  errorBanner: {
    flexDirection: "row",
    backgroundColor: "#fff5f5",
    borderWidth: 1,
    borderColor: "#e74c3c",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { color: "#c0392b", fontSize: 13, lineHeight: 20 },
  warningBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#fff8e1",
    borderWidth: 1,
    borderColor: "#b9770e",
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
  receiptThumbnail: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#ddd",
  },
});
