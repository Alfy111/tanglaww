import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

const { width } = Dimensions.get("window");
const headerBg = require("../assets/images/tanglaw_header.png");

type StatusType =
  | "pending"
  | "partially_approved"
  | "approved"
  | "rejected"
  | "withdrawn"
  | null;
type ActiveTab = "code" | "status";

export default function EnrollmentCodeScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ActiveTab>("code");

  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeError, setCodeError] = useState("");
  const inputs = useRef<TextInput[]>([]);

  const [email, setEmail] = useState("");
  const [lastName, setLastName] = useState("");
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [status, setStatus] = useState<StatusType>(null);
  const [studentData, setStudentData] = useState<any>(null);
  const [rejectionNotes, setRejectionNotes] = useState("");
  const [allowReenroll, setAllowReenroll] = useState(false);

  const isCodeComplete = code.every((digit) => digit !== "");
  const fullCode = code.join("");

  const handleTextChange = (text: string, index: number) => {
    const clean = text.replace(/[^0-9]/g, "");
    const newCode = [...code];
    newCode[index] = clean;
    setCode(newCode);
    setCodeError("");
    if (clean && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && !code[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    if (!isCodeComplete) return;
    setCodeLoading(true);
    setCodeError("");

    try {
      const { data: codeData, error: codeErr } = await supabase
        .from("activation_codes")
        .select("id, student_id, enrollment_id, is_used, expires_at")
        .eq("code", fullCode)
        .maybeSingle();

      if (codeErr) throw new Error(codeErr.message);

      if (!codeData) {
        setCodeError("Invalid code. Please check and try again.");
        setCodeLoading(false);
        return;
      }

      if (codeData.is_used) {
        setCodeError(
          "This code has already been used. Please contact the admin if you need help.",
        );
        setCodeLoading(false);
        return;
      }

      if (new Date(codeData.expires_at) < new Date()) {
        setCodeError(
          "This code has expired. Please contact the admin for a new one.",
        );
        setCodeLoading(false);
        return;
      }

      const { data: student, error: studentError } = await supabase
        .from("student")
        .select("id, email, isAccountSetup")
        .eq("id", codeData.student_id)
        .single();

      if (studentError || !student) {
        setCodeError("Student record not found. Please contact the admin.");
        setCodeLoading(false);
        return;
      }

      const { data: codeEnrollment } = await supabase
        .from("enrollment")
        .select("verification!enrollment_verification_id_fkey (status)")
        .eq("enrollment_id", codeData.enrollment_id)
        .maybeSingle();
      const cv: any = Array.isArray(codeEnrollment?.verification)
        ? codeEnrollment?.verification[0]
        : codeEnrollment?.verification;
      if (cv?.status === "withdrawn" || cv?.status === "rejected") {
        setCodeError(
          "This enrollment is no longer active. Please contact the admin.",
        );
        setCodeLoading(false);
        return;
      }

      if (student.isAccountSetup) {
        setCodeError(
          "This account has already been activated. Please log in instead.",
        );
        setCodeLoading(false);
        return;
      }

      router.push({
        pathname: "/profilesetup",
        params: {
          email: student.email,
          studentId: String(student.id),
          activationCodeId: String(codeData.id),
        },
      } as any);
    } catch (err: any) {
      setCodeError(err.message ?? "Something went wrong. Please try again.");
    } finally {
      setCodeLoading(false);
    }
  };

  const handleCheckStatus = async () => {
    if (!email.trim() || !lastName.trim()) {
      setStatusError("Please enter both email and last name.");
      return;
    }

    setStatusError("");
    setStatusLoading(true);
    setStatus(null);

    try {
      const { data: student, error: studentError } = await supabase
        .from("student")
        .select("id, firstName, lastName, email")
        .eq("email", email.trim().toLowerCase())
        .ilike("lastName", lastName.trim())
        .single();

      if (studentError || !student) {
        setStatusError("No registration found with that email and last name.");
        setStatusLoading(false);
        return;
      }

      const { data: enrollment, error: enrollmentError } = await supabase
        .from("enrollment")
        .select(
          `
          enrollment_id,
          student_id,
          verification!enrollment_verification_id_fkey (
            verificationStatus,
            verificationNotes,
            allow_reenrollment,
            status
          )
        `,
        )
        .eq("student_id", student.id)
        .order("enrollment_id", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (enrollmentError || !enrollment) {
        setStatusError("No enrollment found for this account.");
        setStatusLoading(false);
        return;
      }

      const v = Array.isArray(enrollment.verification)
        ? enrollment.verification[0]
        : enrollment.verification;

      setStudentData(student);

      const current: StatusType =
        v?.status ??
        (v?.verificationStatus === true
          ? "approved"
          : v?.verificationNotes
            ? "rejected"
            : "pending");

      setStatus(current);
      if (current === "rejected") {
        setRejectionNotes(v?.verificationNotes ?? "");
        setAllowReenroll(v?.allow_reenrollment ?? false);
      }
    } catch (err: any) {
      setStatusError("Something went wrong. Please try again.");
    } finally {
      setStatusLoading(false);
    }
  };

  const resetStatus = () => {
    setStatus(null);
    setEmail("");
    setLastName("");
    setStatusError("");
    setRejectionNotes("");
    setStudentData(null);
  };

  const renderStatusCard = () => {
    if (!status || !studentData) return null;

    if (status === "pending") {
      return (
        <View style={[styles.statusCard, styles.pendingCard]}>
          <Ionicons name="time-outline" size={44} color="#FFB800" />
          <View style={styles.statusTitleRow}>
            <Text style={styles.statusTitle}>Under Review</Text>
          </View>
          <Text style={styles.statusName}>Hello, {studentData.firstName}!</Text>
          <Text style={styles.statusMessage}>
            Your enrollment is currently being reviewed by our admin team.
            Please check again later.
          </Text>
        </View>
      );
    }

    if (status === "approved") {
      return (
        <View style={[styles.statusCard, styles.approvedCard]}>
          <Ionicons name="checkmark-circle" size={44} color="#27ae60" />
          <View style={styles.statusTitleRow}>
            <Text style={styles.statusTitle}>Approved!</Text>
          </View>
          <Text style={styles.statusName}>
            Congratulations, {studentData.firstName}!
          </Text>
          <Text style={styles.statusMessage}>
            Your enrollment has been approved. Check your email for your
            activation code, then switch to the{" "}
            <Text style={styles.tabHint}>Enter Code</Text> tab to continue.
          </Text>
          <TouchableOpacity
            style={styles.switchTabBtn}
            onPress={() => {
              resetStatus();
              setActiveTab("code");
            }}
          >
            <Text style={styles.switchTabBtnText}>Go to Enter Code</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (status === "partially_approved") {
      return (
        <View style={[styles.statusCard, styles.partialCard]}>
          <Ionicons name="checkmark-circle-outline" size={44} color="#2F80ED" />
          <View style={styles.statusTitleRow}>
            <Text style={styles.statusTitle}>Partially Approved</Text>
          </View>
          <Text style={styles.statusName}>
            Welcome, {studentData.firstName}!
          </Text>
          <Text style={styles.statusMessage}>
            Your downpayment enrollment has been approved. You can access the
            courses up to LEPT Express, but to unlock the rest, upload your
            remaining balance receipt in your Profile after signing in. Check
            your email for your activation code, then switch to the{" "}
            <Text style={styles.tabHint}>Enter Code</Text> tab.
          </Text>
          <TouchableOpacity
            style={styles.switchTabBtn}
            onPress={() => {
              resetStatus();
              setActiveTab("code");
            }}
          >
            <Text style={styles.switchTabBtnText}>Go to Enter Code</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (status === "withdrawn") {
      return (
        <View style={[styles.statusCard, styles.withdrawnCard]}>
          <Ionicons name="remove-circle-outline" size={44} color="#7F8C8D" />
          <View style={styles.statusTitleRow}>
            <Text style={styles.statusTitle}>Enrollment Withdrawn</Text>
          </View>
          <Text style={styles.statusName}>Hello, {studentData.firstName}.</Text>
          <Text style={styles.statusMessage}>
            Your enrollment has been withdrawn, so your account access is
            disabled. If you wish to continue, please contact the admin.
          </Text>
        </View>
      );
    }

    if (status === "rejected") {
      return (
        <View style={[styles.statusCard, styles.rejectedCard]}>
          <Ionicons name="close-circle" size={44} color="#e74c3c" />
          <View style={styles.statusTitleRow}>
            <Text style={styles.statusTitle}>Not Approved</Text>
          </View>
          <Text style={styles.statusName}>Hello, {studentData.firstName}.</Text>
          <Text style={styles.statusMessage}>
            Unfortunately your enrollment was not approved at this time.
          </Text>
          {rejectionNotes ? (
            <View style={styles.notesBox}>
              <Text style={styles.notesLabel}>Admin Notes:</Text>
              <Text style={styles.notesText}>{rejectionNotes}</Text>
            </View>
          ) : null}

          {allowReenroll ? (
            <TouchableOpacity
              style={styles.reenrollBtn}
              onPress={() => router.push("/enroll" as any)}
            >
              <Text style={styles.reenrollBtnText}>Re-Enroll Now</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.reenrollLockedBox}>
              <Ionicons name="lock-closed-outline" size={14} color="#999" />
              <Text style={styles.reenrollLockedText}>
                Re-enrollment is not yet allowed. Please contact the admin.
              </Text>
            </View>
          )}
        </View>
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ImageBackground source={headerBg} style={styles.header}>
          <View style={styles.headerOverlay}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#0D2A94" />
            </TouchableOpacity>
          </View>
        </ImageBackground>

        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "code" && styles.tabBtnActive]}
            onPress={() => setActiveTab("code")}
          >
            <Ionicons
              name="keypad-outline"
              size={16}
              color={activeTab === "code" ? "#0D2A94" : "#999"}
            />
            <Text
              style={[
                styles.tabBtnText,
                activeTab === "code" && styles.tabBtnTextActive,
              ]}
            >
              Enter Code
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === "status" && styles.tabBtnActive,
            ]}
            onPress={() => setActiveTab("status")}
          >
            <Ionicons
              name="search-outline"
              size={16}
              color={activeTab === "status" ? "#0D2A94" : "#999"}
            />
            <Text
              style={[
                styles.tabBtnText,
                activeTab === "status" && styles.tabBtnTextActive,
              ]}
            >
              Check Status
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === "code" && (
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.title}>Activate your Account</Text>
            <Text style={styles.subtitle}>
              Enter the 6-digit code provided by your administrator.
            </Text>

            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Enter Activation Code</Text>

              <View style={styles.codeContainer}>
                {code.map((digit, index) => (
                  <View
                    key={index}
                    style={[
                      styles.codeBox,
                      {
                        borderColor: codeError
                          ? "#E74C3C"
                          : digit
                            ? "#0D2A94"
                            : "#BDC3C7",
                      },
                    ]}
                  >
                    <TextInput
                      ref={(el) => {
                        if (el) inputs.current[index] = el;
                      }}
                      style={styles.codeInput}
                      maxLength={1}
                      keyboardType="number-pad"
                      onChangeText={(text) => handleTextChange(text, index)}
                      onKeyPress={(e) => handleKeyPress(e, index)}
                      value={digit}
                      placeholder="•"
                      placeholderTextColor="#BDC3C7"
                      selectionColor="#0D2A94"
                    />
                  </View>
                ))}
              </View>

              {codeError ? (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle" size={16} color="#E74C3C" />
                  <Text style={styles.errorText}>{codeError}</Text>
                </View>
              ) : (
                <View style={styles.hintContainer}>
                  <Ionicons name="bulb-outline" size={16} color="#FFB800" />
                  <Text style={styles.hintText}>
                    Contact your administrator if you haven't received your
                    code. Or use the{" "}
                    <Text
                      style={{ color: "#0D2A94", fontWeight: "bold" }}
                      onPress={() => setActiveTab("status")}
                    >
                      Check Status
                    </Text>{" "}
                    tab to see your enrollment status.
                  </Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={[
                styles.continueBtn,
                { opacity: isCodeComplete && !codeLoading ? 1 : 0.6 },
              ]}
              onPress={handleVerify}
              disabled={!isCodeComplete || codeLoading}
              activeOpacity={0.8}
            >
              {codeLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Text style={styles.continueText}>Verify Code</Text>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color="white"
                    style={{ marginLeft: 5 }}
                  />
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        )}

        {activeTab === "status" && (
          <ScrollView
            contentContainerStyle={styles.statusScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.title}>Check Registration Status</Text>
            <Text style={styles.subtitle}>
              Enter your details to check your enrollment status.
            </Text>

            {!status && (
              <View style={styles.form}>
                <Text style={styles.label}>Email Address:</Text>
                <TextInput
                  style={styles.input}
                  placeholder="email@example.com"
                  placeholderTextColor="#A9A9A9"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
                <Text style={styles.label}>Last Name:</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Dela Cruz"
                  placeholderTextColor="#A9A9A9"
                  value={lastName}
                  onChangeText={setLastName}
                />
                {statusError ? (
                  <View style={styles.errorBanner}>
                    <Ionicons name="alert-circle" size={18} color="#c0392b" />
                    <Text style={styles.errorText}>{statusError}</Text>
                  </View>
                ) : null}

                <TouchableOpacity
                  style={[styles.checkBtn, statusLoading && { opacity: 0.7 }]}
                  onPress={handleCheckStatus}
                  disabled={statusLoading}
                >
                  {statusLoading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.checkBtnText}>Check Status</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {renderStatusCard()}

            {status && (
              <TouchableOpacity
                style={styles.checkAgainBtn}
                onPress={resetStatus}
              >
                <Text style={styles.checkAgainText}>Check Another</Text>
              </TouchableOpacity>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white" },
  header: { width: "100%", height: 200 },
  headerOverlay: { flex: 1, backgroundColor: "rgba(13, 42, 148, 0.1)" },
  backBtn: {
    marginTop: 20,
    marginLeft: 20,
    backgroundColor: "white",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  tabRow: {
    flexDirection: "row",
    marginHorizontal: 24,
    marginTop: 16,
    marginBottom: 4,
    backgroundColor: "#F0F2F8",
    borderRadius: 12,
    padding: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  tabBtnActive: {
    backgroundColor: "white",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  tabBtnText: { fontSize: 13, fontWeight: "600", color: "#999" },
  tabBtnTextActive: { color: "#0D2A94" },
  content: {
    paddingTop: 20,
    paddingHorizontal: 30,
    paddingBottom: 40,
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#0D2A94",
    marginBottom: 8,
    alignSelf: "flex-start",
  },
  subtitle: {
    fontSize: 13,
    color: "#666",
    textAlign: "left",
    marginBottom: 28,
    alignSelf: "flex-start",
  },
  inputSection: { width: "100%" },
  inputLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0D2A94",
    marginBottom: 16,
  },
  codeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  codeBox: {
    width: (width - 100) / 6,
    height: 55,
    borderWidth: 2,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  codeInput: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#0D2A94",
    textAlign: "center",
    width: "100%",
  },
  hintContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 10,
    gap: 6,
  },
  hintText: {
    fontSize: 11,
    color: "#666",
    fontStyle: "italic",
    flex: 1,
    lineHeight: 17,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff5f5",
    borderWidth: 1,
    borderColor: "#E74C3C",
    borderRadius: 8,
    padding: 10,
    gap: 8,
    marginTop: 10,
  },
  errorText: { fontSize: 12, color: "#c13121", flex: 1 },
  continueBtn: {
    backgroundColor: "#0D2A94",
    width: "100%",
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    marginTop: 40,
  },
  continueText: { color: "white", fontWeight: "bold", fontSize: 16 },

  statusScrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 50,
  },
  form: { width: "100%" },
  label: {
    fontWeight: "bold",
    color: "#555",
    marginBottom: 5,
    fontSize: 14,
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: "#CCC",
    paddingVertical: 8,
    marginBottom: 20,
    fontSize: 16,
    color: "#222",
  },
  checkBtn: {
    backgroundColor: "#0D2A94",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  checkBtnText: { color: "white", fontWeight: "bold", fontSize: 16 },

  statusCard: {
    width: "100%",
    padding: 24,
    borderRadius: 15,
    alignItems: "center",
    marginTop: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
  },
  pendingCard: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#FFB800",
  },
  approvedCard: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#27ae60",
  },
  partialCard: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#2F80ED",
  },
  withdrawnCard: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#7F8C8D",
  },
  rejectedCard: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e74c3c",
  },
  statusTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    gap: 8,
  },
  statusTitle: { fontSize: 20, fontWeight: "bold", color: "#333" },
  statusName: { fontSize: 15, fontWeight: "600", color: "#555", marginTop: 6 },
  statusMessage: {
    fontSize: 13,
    color: "#666",
    textAlign: "center",
    marginTop: 10,
    lineHeight: 20,
  },
  tabHint: { color: "#0D2A94", fontWeight: "bold" },
  switchTabBtn: {
    backgroundColor: "#0D2A94",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 18,
  },
  switchTabBtnText: { color: "white", fontWeight: "bold", fontSize: 14 },
  notesBox: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e74c3c",
    borderRadius: 8,
    padding: 12,
    marginTop: 15,
    width: "100%",
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#e74c3c",
    marginBottom: 4,
  },
  notesText: { fontSize: 13, color: "#333", lineHeight: 18 },
  checkAgainBtn: { alignItems: "center", marginTop: 20 },
  checkAgainText: {
    color: "#0D2A94",
    fontWeight: "bold",
    textDecorationLine: "underline",
    fontSize: 14,
  },
  reenrollBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0D2A94",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    marginTop: 16,
    gap: 8,
  },
  reenrollBtnText: { color: "white", fontWeight: "bold", fontSize: 14 },
  reenrollLockedBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderWidth: 1,
    borderColor: "#DCDFE3",
    borderRadius: 8,
    padding: 10,
    marginTop: 16,
    gap: 6,
    width: "100%",
  },
  reenrollLockedText: {
    fontSize: 11,
    color: "#999",
    flex: 1,
    lineHeight: 16,
  },
});
