import { useAdmin } from "@/context/AdminContext";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  Linking,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  approveWithCode,
  EnrollmentStatus,
  getStatus,
  getVerification,
  PAYMENT_TYPE_LABELS,
  sendActivationEmail,
  setEnrollmentStatus,
  STATUS_COLORS,
  STATUS_LABELS,
} from "../../../services/enrollmentStatusService";

const { height } = Dimensions.get("window");

export default function RegistrantDetails() {
  const { id, name } = useLocalSearchParams();
  const router = useRouter();
  const { refreshData } = useAdmin();

  const [remarks, setRemarks] = useState("");
  const [showRemarks, setShowRemarks] = useState(false);
  const [loading, setLoading] = useState(true);
  const [enrollment, setEnrollment] = useState<any>(null);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [paymentPreview, setPaymentPreview] = useState(false);
  const slideAnimation = useState(new Animated.Value(height))[0];

  const [codeModal, setCodeModal] = useState(false);
  const [generatedCode, setGeneratedCode] = useState("");
  const [emailSent, setEmailSent] = useState<boolean | null>(null);
  const [codeStudent, setCodeStudent] = useState<{
    name: string;
    email: string;
  } | null>(null);
  const [approveLoading, setApproveLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState("Proof of Payment");

  const [allowReenrollment, setAllowReenrollment] = useState(false);
  const [toggleLoading, setToggleLoading] = useState(false);

  const displayName =
    typeof name === "string" ? name.toUpperCase() : "REGISTRANT";

  useEffect(() => {
    fetchEnrollmentDetails();
  }, [id]);

  const fetchEnrollmentDetails = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("enrollment")
      .select(
        `
        enrollment_id,
        student_id,
        student (
          firstName, lastName, middleName,
          email, bachelorsDegree, lastSchoolAttended,
          province, profilephotourl, phoneNumber,
          validIdUrl, formalPhotoUrl
        ),
        curriculum!enrollment_curriculum_id_fkey (curriculumName),
        specialization!enrollment_specialization_id_fkey (specializationName),
        type_of_taker!enrollment_typeOfTaker_id_fkey (typeOfTaker),
        promo!enrollment_promo_id_fkey (promo),
        verification!enrollment_verification_id_fkey (
          verification_id, verificationStatus, verificationNotes, allow_reenrollment, status
        ),
        paymentDetails (
          amountTransferred, referenceNumber, dateOfPayment,
          proofOfPaymentUrl, paymentType, balanceProofUrl, balanceSubmittedAt,
          payment_channel!paymentDetails_paymentChannel_id_fkey (paymentChannelName)
        )
      `,
      )
      .eq("enrollment_id", id)
      .single();

    if (error) {
      console.error("Fetch error:", error.message);
      setLoading(false);
      return;
    }
    setEnrollment(data);

    const v = Array.isArray(data.verification)
      ? data.verification[0]
      : data.verification;
    setAllowReenrollment(v?.allow_reenrollment ?? false);
    setLoading(false);
  };

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };

  const handleToggleReenrollment = async () => {
    setToggleLoading(true);
    try {
      const v = Array.isArray(enrollment.verification)
        ? enrollment.verification[0]
        : enrollment.verification;

      const newValue = !allowReenrollment;

      const { error } = await supabase
        .from("verification")
        .update({ allow_reenrollment: newValue })
        .eq("verification_id", v?.verification_id);

      if (error) throw new Error(error.message);

      setAllowReenrollment(newValue);
      Alert.alert(
        newValue ? "Re-enrollment Allowed" : "Re-enrollment Disabled",
        newValue
          ? "This student can now re-enroll with the same email."
          : "Re-enrollment has been disabled for this student.",
      );
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Something went wrong.");
    } finally {
      setToggleLoading(false);
    }
  };

  const InfoRow = ({
    sectionKey,
    title,
    children,
    isDocument = false,
    url,
  }: {
    sectionKey: string;
    title: string;
    children?: React.ReactNode;
    isDocument?: boolean;
    url?: string;
  }) => {
    const isOpen = openSection === sectionKey;
    return (
      <View>
        <TouchableOpacity
          style={styles.infoRow}
          onPress={() => {
            if (isDocument && url) Linking.openURL(url);
            else toggleSection(sectionKey);
          }}
        >
          <Text style={styles.infoRowText}>{title}</Text>
          <Ionicons
            name={
              isDocument
                ? "chevron-forward"
                : isOpen
                  ? "chevron-up"
                  : "chevron-down"
            }
            size={20}
            color="#555"
          />
        </TouchableOpacity>
        {isOpen && !isDocument && (
          <View style={styles.expandedSection}>{children}</View>
        )}
      </View>
    );
  };

  const DetailRow = ({ label, value }: { label: string; value: string }) => (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value || "—"}</Text>
    </View>
  );

  const openDocument = (url: string | null | undefined, title: string) => {
    if (!url) {
      Alert.alert(`No ${title.toLowerCase()} uploaded.`);
      return;
    }
    if (url.toLowerCase().endsWith(".pdf")) {
      WebBrowser.openBrowserAsync(url);
      return;
    }
    setPreviewUrl(url);
    setPreviewTitle(title);
    openSheet();
  };

  const openSheet = () => {
    setPaymentPreview(true);
    Animated.spring(slideAnimation, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 4,
    }).start();
  };

  const closeSheet = () => {
    Animated.timing(slideAnimation, {
      toValue: height,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setPaymentPreview(false));
  };

  const handleApprove = (target: "approved" | "partially_approved") => {
    const full = target === "approved";
    const current = getStatus(enrollment);
    const fromPending = current === "pending";
    const studentName = `${enrollment.student.firstName} ${enrollment.student.lastName}`;
    const message = fromPending
      ? `${full ? "Fully approve" : "Partially approve"} ${studentName}? An activation code will be sent to their email.`
      : full
        ? `Fully approve ${studentName}? They get access to all courses.`
        : `Set ${studentName} as partially approved? They get access up to LEPT Express until the balance is settled.`;

    Alert.alert(full ? "Fully Approve" : "Partially Approve", message, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Confirm",
        onPress: async () => {
          setApproveLoading(true);
          try {
            if (fromPending) {
              const { code, emailSent } = await approveWithCode(
                enrollment,
                target,
              );
              setGeneratedCode(code);
              setEmailSent(emailSent);
              setCodeStudent({
                name: studentName,
                email: enrollment.student.email,
              });
              setCodeModal(true);
            } else {
              await setEnrollmentStatus(
                getVerification(enrollment)?.verification_id,
                target,
              );
              Alert.alert(
                "Updated",
                `${studentName} is now ${STATUS_LABELS[target].toLowerCase()}.`,
              );
            }
            await refreshData();
            await fetchEnrollmentDetails();
          } catch (err: any) {
            Alert.alert("Error", err.message ?? "Something went wrong.");
          } finally {
            setApproveLoading(false);
          }
        },
      },
    ]);
  };

  const handleWithdraw = () => {
    const studentName = `${enrollment.student.firstName} ${enrollment.student.lastName}`;
    Alert.alert(
      "Mark as Withdrawn",
      `${studentName} will no longer be able to log in. You can restore them later.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Withdraw",
          style: "destructive",
          onPress: async () => {
            setApproveLoading(true);
            try {
              await setEnrollmentStatus(
                getVerification(enrollment)?.verification_id,
                "withdrawn",
              );
              await refreshData();
              await fetchEnrollmentDetails();
            } catch (err: any) {
              Alert.alert("Error", err.message ?? "Something went wrong.");
            } finally {
              setApproveLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleReject = () => {
    if (!remarks.trim()) {
      Alert.alert("Remarks required", "Please enter a reason for rejection.");
      return;
    }

    Alert.alert("Reject Enrollment", `Reject ${displayName}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reject",
        style: "destructive",
        onPress: async () => {
          try {
            await setEnrollmentStatus(
              getVerification(enrollment)?.verification_id,
              "rejected",
              remarks,
            );
          } catch (err: any) {
            Alert.alert("Error", err.message);
            return;
          }
          await refreshData();
          Alert.alert("Rejected.", "Enrollment has been rejected.");
          router.back();
        },
      },
    ]);
  };

  const handleResendEmail = async () => {
    if (!codeStudent) return;
    const sent = await sendActivationEmail(
      codeStudent.email,
      codeStudent.name.split(" ")[0],
      generatedCode,
    );
    setEmailSent(sent);
    Alert.alert(
      sent ? "Email Sent" : "Email Failed",
      sent
        ? `Activation code resent to ${codeStudent.email}`
        : "Could not send email. Please share the code manually.",
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#2F459B" style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  const student = enrollment?.student;
  const payment = Array.isArray(enrollment?.paymentDetails)
    ? enrollment.paymentDetails[0]
    : enrollment?.paymentDetails;
  const proofUrl = payment?.proofOfPaymentUrl;

  const verification = Array.isArray(enrollment?.verification)
    ? enrollment.verification[0]
    : enrollment?.verification;
  const status: EnrollmentStatus = getStatus(enrollment);
  const statusColor = STATUS_COLORS[status];
  const hasAccess = status === "approved" || status === "partially_approved";
  const balanceUrl = payment?.balanceProofUrl;
  const showBalanceRow =
    payment?.paymentType === "downpayment" ||
    status === "partially_approved" ||
    !!balanceUrl;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Student Profile</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.profileSection}>
          <View style={styles.avatarLarge}>
            {enrollment.student?.profilephotourl ? (
              <Image
                source={{ uri: enrollment.student.profilephotourl }}
                style={styles.avatarImage}
              />
            ) : (
              <Ionicons name="person-outline" size={50} color="#BDC3C7" />
            )}
          </View>
          <Text style={styles.registrantName}>{displayName}</Text>
          <Text style={styles.registrantSub}>
            {enrollment?.curriculum?.curriculumName ?? "—"}
          </Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusColor + "18", borderColor: statusColor },
            ]}
          >
            <View
              style={[styles.statusDot, { backgroundColor: statusColor }]}
            />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {STATUS_LABELS[status]}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Registrant Information:</Text>

        <InfoRow sectionKey="program" title="Program & Curriculum">
          <DetailRow
            label="Curriculum"
            value={enrollment?.curriculum?.curriculumName}
          />
          <DetailRow
            label="Specialization"
            value={enrollment?.specialization?.specializationName}
          />
          <DetailRow
            label="Type of Taker"
            value={enrollment?.type_of_taker?.typeOfTaker}
          />
        </InfoRow>

        <InfoRow sectionKey="personal" title="Personal Information">
          <DetailRow label="First Name" value={student?.firstName} />
          <DetailRow label="Middle Name" value={student?.middleName} />
          <DetailRow label="Last Name" value={student?.lastName} />
          <DetailRow label="Email" value={student?.email} />
          <DetailRow label="Degree" value={student?.bachelorsDegree} />
          <DetailRow label="Last School" value={student?.lastSchoolAttended} />
          <DetailRow label="Province" value={student?.province} />
          <DetailRow
            label="Contact Number"
            value={student.phoneNumber?.trim() || "Not set"}
          />
        </InfoRow>

        <InfoRow sectionKey="promo" title="Promotions & Verification">
          <DetailRow label="Promo" value={enrollment?.promo?.promo ?? "None"} />
        </InfoRow>

        <InfoRow sectionKey="payment" title="Payment Information">
          <DetailRow
            label="Channel"
            value={payment?.payment_channel?.paymentChannelName}
          />
          <DetailRow
            label="Amount"
            value={payment?.amountTransferred?.toString()}
          />
          <DetailRow label="Reference #" value={payment?.referenceNumber} />
          <DetailRow
            label="Date of Transaction"
            value={
              payment?.dateOfPayment
                ? new Date(payment.dateOfPayment).toLocaleDateString("en-PH", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })
                : "Not set"
            }
          />
          <DetailRow
            label="Payment Type"
            value={PAYMENT_TYPE_LABELS[payment?.paymentType] ?? "Not specified"}
          />
        </InfoRow>

        <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Documents:</Text>

        <TouchableOpacity
          style={styles.infoRow}
          onPress={() => openDocument(proofUrl, "Proof of Payment")}
        >
          <Text style={styles.infoRowText}>Proof of Payment</Text>
          <Ionicons name="chevron-forward" size={20} color="#555" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.infoRow}
          onPress={() =>
            openDocument(student?.formalPhotoUrl, "Graduation or Formal Photo")
          }
        >
          <Text style={styles.infoRowText}>Graduation or Formal Photo</Text>
          <Ionicons name="chevron-forward" size={20} color="#555" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.infoRow}
          onPress={() => openDocument(student?.validIdUrl, "Valid ID")}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.infoRowText}>Valid ID</Text>
            {!student?.validIdUrl && (
              <Text style={styles.balanceSub}>Not provided</Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={20} color="#555" />
        </TouchableOpacity>

        {showBalanceRow && (
          <TouchableOpacity
            style={styles.infoRow}
            onPress={() =>
              openDocument(balanceUrl, "Remaining Balance Receipt")
            }
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.infoRowText}>Remaining Balance Receipt</Text>
              <Text style={styles.balanceSub}>
                {balanceUrl
                  ? `Submitted ${new Date(payment.balanceSubmittedAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}`
                  : "Not submitted yet"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#555" />
          </TouchableOpacity>
        )}

        {status === "pending" && (
          <>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.approveBtn, approveLoading && { opacity: 0.7 }]}
                onPress={() => handleApprove("approved")}
                disabled={approveLoading}
              >
                {approveLoading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.buttonText}>Fully Approve</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.partialBtn, approveLoading && { opacity: 0.7 }]}
                onPress={() => handleApprove("partially_approved")}
                disabled={approveLoading}
              >
                <Text style={styles.buttonText}>Partially Approve</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.rejectWideBtn}
              onPress={() => setShowRemarks(!showRemarks)}
            >
              <Text style={styles.buttonText}>Reject</Text>
            </TouchableOpacity>

            {showRemarks && (
              <>
                <TextInput
                  style={styles.remarksInput}
                  placeholder="Enter reason for rejection..."
                  value={remarks}
                  onChangeText={setRemarks}
                  multiline
                />
                <TouchableOpacity
                  style={styles.confirmRejectBtn}
                  onPress={handleReject}
                >
                  <Text style={styles.buttonText}>Confirm Rejection</Text>
                </TouchableOpacity>
              </>
            )}
          </>
        )}

        {status === "partially_approved" && (
          <TouchableOpacity
            style={[styles.approveWideBtn, approveLoading && { opacity: 0.7 }]}
            onPress={() => handleApprove("approved")}
            disabled={approveLoading}
          >
            <Text style={styles.buttonText}>
              Fully Approve (balance settled)
            </Text>
          </TouchableOpacity>
        )}

        {status === "withdrawn" && (
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.approveBtn, approveLoading && { opacity: 0.7 }]}
              onPress={() => handleApprove("approved")}
              disabled={approveLoading}
            >
              <Text style={styles.buttonText}>Restore as Approved</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.partialBtn, approveLoading && { opacity: 0.7 }]}
              onPress={() => handleApprove("partially_approved")}
              disabled={approveLoading}
            >
              <Text style={styles.buttonText}>Restore as Partial</Text>
            </TouchableOpacity>
          </View>
        )}

        {hasAccess && (
          <TouchableOpacity
            style={styles.withdrawBtn}
            onPress={handleWithdraw}
            disabled={approveLoading}
          >
            <Text style={styles.withdrawBtnText}>Mark as Withdrawn</Text>
          </TouchableOpacity>
        )}

        {hasAccess && (
          <TouchableOpacity
            style={styles.viewCodeBtn}
            onPress={async () => {
              const { data } = await supabase
                .from("activation_codes")
                .select("code, is_used, expires_at")
                .eq("enrollment_id", enrollment.enrollment_id)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

              if (!data) {
                Alert.alert("No Code", "No activation code found.");
                return;
              }
              if (data.is_used) {
                Alert.alert(
                  "Account Activated",
                  "This student has already activated their account.",
                );
                return;
              }
              if (new Date(data.expires_at) < new Date()) {
                Alert.alert("Code Expired", "The activation code has expired.");
                return;
              }
              setGeneratedCode(data.code);
              setEmailSent(null);
              setCodeStudent({
                name: `${student?.firstName} ${student?.lastName}`,
                email: student?.email,
              });
              setCodeModal(true);
            }}
          >
            <Text style={styles.viewCodeBtnText}>View Activation Code</Text>
          </TouchableOpacity>
        )}

        {status === "rejected" && (
          <View style={styles.rejectedSection}>
            <View style={styles.rejectionNotesBox}>
              <View style={styles.rejectionNotesHeader}>
                <Text style={styles.rejectionNotesTitle}>Rejection Notes:</Text>
              </View>
              <Text style={styles.rejectionNotesText}>
                {verification.verificationNotes}
              </Text>
            </View>

            <View style={styles.reenrollCard}>
              <View style={styles.reenrollInfo}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.reenrollTitle}>Allow Re-enrollment?</Text>
                  <Text style={styles.reenrollSubtitle}>
                    Student can re-enroll using the same email address
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  allowReenrollment && styles.toggleBtnActive,
                  toggleLoading && { opacity: 0.6 },
                ]}
                onPress={handleToggleReenrollment}
                disabled={toggleLoading}
              >
                {toggleLoading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <View
                      style={[
                        styles.toggleCircle,
                        allowReenrollment && styles.toggleCircleActive,
                      ]}
                    />
                    <Text
                      style={[
                        styles.toggleLabel,
                        allowReenrollment && styles.toggleLabelActive,
                      ]}
                    >
                      {allowReenrollment ? "ON" : "OFF"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {allowReenrollment && (
              <View style={styles.reenrollAllowedBanner}>
                <Ionicons name="checkmark-circle" size={16} color="#27ae60" />
                <Text style={styles.reenrollAllowedText}>
                  Student is now allowed to re-enroll with the same email.
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal
        visible={paymentPreview}
        transparent
        animationType="none"
        onRequestClose={closeSheet}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={closeSheet}
        />
        <Animated.View
          style={[
            styles.bottomSheet,
            { transform: [{ translateY: slideAnimation }] },
          ]}
        >
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{previewTitle}</Text>
            <TouchableOpacity onPress={closeSheet}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          {previewUrl ? (
            <Image
              source={{ uri: previewUrl }}
              style={styles.proofImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.noProofContainer}>
              <Ionicons name="image-outline" size={50} color="#ccc" />
              <Text style={styles.noProofText}>
                No proof of payment uploaded
              </Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.openBrowserBtn}
            onPress={() =>
              previewUrl && WebBrowser.openBrowserAsync(previewUrl)
            }
          >
            <Ionicons name="open-outline" size={18} color="white" />
            <Text style={styles.openBrowserText}>Open Full Size</Text>
          </TouchableOpacity>
        </Animated.View>
      </Modal>

      <Modal visible={codeModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Ionicons name="checkmark-circle" size={40} color="#27ae60" />
              <Text style={styles.modalTitle}>Student Approved!</Text>
            </View>

            <Text style={styles.modalSubtitle}>Activation code for:</Text>
            <Text style={styles.modalStudentName}>{codeStudent?.name}</Text>
            <Text style={styles.modalEmail}>{codeStudent?.email}</Text>

            <View style={styles.codeDisplay}>
              {generatedCode.split("").map((digit, i) => (
                <View key={i} style={styles.codeDigitBox}>
                  <Text style={styles.codeDigit}>{digit}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.codeExpiry}>
              Expires in 3 days. One-time use only
            </Text>

            <TouchableOpacity
              style={styles.resendBtn}
              onPress={handleResendEmail}
            >
              <Ionicons name="send-outline" size={16} color="#2F459B" />
              <Text style={styles.resendBtnText}>Resend Email</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => {
                setCodeModal(false);
                setEmailSent(null);
              }}
            >
              <Text style={styles.modalCloseBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white" },
  header: {
    backgroundColor: "#FFD75E",
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
  },
  headerTitle: { fontSize: 20, fontWeight: "bold", marginLeft: 20 },
  content: { padding: 20 },
  profileSection: { alignItems: "center", marginBottom: 25 },
  avatarLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#CCC",
    marginBottom: 10,
  },
  registrantName: { fontSize: 18, fontWeight: "bold", color: "#2F459B" },
  registrantSub: { fontSize: 13, color: "#555", fontStyle: "italic" },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#2F459B",
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderWidth: 1,
    borderColor: "black",
    borderRadius: 8,
    marginBottom: 10,
  },
  infoRowText: { fontSize: 14, fontWeight: "500" },
  expandedSection: {
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    marginTop: -5,
  },
  detailRow: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  detailLabel: {
    fontSize: 11,
    color: "#2F459B",
    fontWeight: "700",
    marginBottom: 2,
  },
  detailValue: { fontSize: 13, color: "#333" },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 30,
  },
  approveBtn: {
    backgroundColor: "#27ae60",
    width: "48%",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  rejectBtn: {
    backgroundColor: "#e74c3c",
    width: "48%",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: { fontWeight: "bold", color: "white", textAlign: "center" },
  partialBtn: {
    backgroundColor: "#2F80ED",
    width: "48%",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  rejectWideBtn: {
    backgroundColor: "#e74c3c",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  approveWideBtn: {
    backgroundColor: "#27ae60",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 24,
  },
  withdrawBtn: {
    borderWidth: 1,
    borderColor: "#7F8C8D",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 12,
  },
  withdrawBtnText: { color: "#7F8C8D", fontWeight: "bold" },
  balanceSub: { fontSize: 11, color: "#888", marginTop: 2 },
  remarksInput: {
    borderWidth: 1,
    borderColor: "#CCC",
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    height: 80,
    textAlignVertical: "top",
  },
  confirmRejectBtn: {
    backgroundColor: "#e74c3c",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  viewCodeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    borderWidth: 1,
    borderColor: "#2F459B",
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  viewCodeBtnText: {
    color: "#2F459B",
    fontWeight: "600",
    fontSize: 14,
  },

  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  bottomSheet: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    maxHeight: height * 0.75,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#ddd",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 15,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  sheetTitle: { fontSize: 16, fontWeight: "bold", color: "#2F459B" },
  proofImage: {
    width: "100%",
    height: 350,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  noProofContainer: { alignItems: "center", padding: 40 },
  noProofText: { color: "#999", marginTop: 10, fontSize: 13 },
  openBrowserBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2F459B",
    padding: 12,
    borderRadius: 8,
    marginTop: 15,
    gap: 8,
  },
  openBrowserText: { color: "white", fontWeight: "600", fontSize: 14 },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    alignItems: "center",
  },
  modalHeader: { alignItems: "center", marginBottom: 12 },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#27ae60",
    marginTop: 8,
  },
  modalSubtitle: { fontSize: 12, color: "#777", marginBottom: 4 },
  modalStudentName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0D2A94",
    marginBottom: 2,
  },
  modalEmail: { fontSize: 12, color: "#777", marginBottom: 12 },
  emailSuccessBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fff4",
    borderWidth: 1,
    borderColor: "#27ae60",
    borderRadius: 8,
    padding: 10,
    gap: 8,
    marginBottom: 12,
    width: "100%",
  },
  emailSuccessText: { fontSize: 12, color: "#27ae60", fontWeight: "600" },
  emailFailBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff5f5",
    borderWidth: 1,
    borderColor: "#E74C3C",
    borderRadius: 8,
    padding: 10,
    gap: 8,
    marginBottom: 12,
    width: "100%",
  },
  emailFailText: { fontSize: 12, color: "#E74C3C", fontWeight: "600" },
  codeDisplay: { flexDirection: "row", gap: 8, marginBottom: 8 },
  codeDigitBox: {
    width: 40,
    height: 50,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#0D2A94",
    backgroundColor: "#F0F4FF",
    justifyContent: "center",
    alignItems: "center",
  },
  codeDigit: { fontSize: 22, fontWeight: "bold", color: "#0D2A94" },
  codeExpiry: {
    fontSize: 11,
    color: "#E74C3C",
    marginBottom: 12,
    fontStyle: "italic",
  },
  resendBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2F459B",
    gap: 6,
    marginBottom: 12,
  },
  resendBtnText: { fontSize: 13, color: "#2F459B", fontWeight: "600" },
  codeInstruction: {
    fontSize: 11,
    color: "#777",
    textAlign: "center",
    lineHeight: 16,
    marginBottom: 16,
  },
  modalCloseBtn: {
    backgroundColor: "#0D2A94",
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 10,
    width: "100%",
    alignItems: "center",
  },
  modalCloseBtnText: { color: "white", fontWeight: "bold", fontSize: 15 },
  rejectedSection: { marginTop: 20 },
  rejectionNotesBox: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e74c3c",
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  rejectionNotesHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  rejectionNotesTitle: { fontSize: 14, fontWeight: "bold", color: "#e74c3c" },
  rejectionNotesText: { fontSize: 13, color: "#333", lineHeight: 18 },
  reenrollCard: {
    backgroundColor: "#F8F9FA",
    borderWidth: 1,
    borderColor: "#DCDFE3",
    borderRadius: 10,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  reenrollInfo: { flexDirection: "row", alignItems: "center", flex: 1 },
  reenrollTitle: { fontSize: 14, fontWeight: "bold", color: "#0D2A94" },
  reenrollSubtitle: { fontSize: 11, color: "#777", marginTop: 2 },
  toggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#CCC",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
    minWidth: 70,
    justifyContent: "center",
  },
  toggleBtnActive: { backgroundColor: "#27ae60" },
  toggleCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "white",
  },
  toggleCircleActive: { backgroundColor: "white" },
  toggleLabel: { fontSize: 12, fontWeight: "bold", color: "white" },
  toggleLabelActive: { color: "white" },
  reenrollAllowedBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fff4",
    borderWidth: 1,
    borderColor: "#27ae60",
    borderRadius: 8,
    padding: 10,
    gap: 8,
  },
  reenrollAllowedText: { fontSize: 12, color: "#27ae60", flex: 1 },
  avatarImage: { width: 100, height: 100, borderRadius: 50 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 10,
    gap: 6,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: "700" },
});
