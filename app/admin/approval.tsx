import { useAdmin } from "@/context/AdminContext";
import { supabase } from "@/lib/supabase";
import { logAudit } from "@/services/auditService";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  approveWithCode,
  EnrollmentStatus,
  getStatus,
  getVerification,
  sendActivationEmail,
  setEnrollmentStatus,
} from "../../services/enrollmentStatusService";
import AdminHamburger from "./hamburger";

export default function AdminApproval() {
  const router = useRouter();
  const { auditRequests, loading, refreshData, currentAdminId } = useAdmin();

  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const [menuVisible, setMenuVisible] = useState(false);
  const [codeModal, setCodeModal] = useState(false);
  const [generatedCode, setGeneratedCode] = useState("");
  const [emailSent, setEmailSent] = useState<boolean | null>(null);
  const [codeStudent, setCodeStudent] = useState<{
    name: string;
    email: string;
  } | null>(null);

  const onRefresh = () => {
    setRefreshing(true);
    refreshData().then(() => setRefreshing(false));
  };

  const getAdminName = async (): Promise<string> => {
    if (!currentAdminId) return "Admin";
    const { data } = await supabase
      .from("admin")
      .select("firstName, lastName")
      .eq("admin_id", currentAdminId)
      .single();
    return data ? `${data.firstName} ${data.lastName}` : "Admin";
  };

  const byStatus = (status: EnrollmentStatus) =>
    auditRequests.filter((e: any) => getStatus(e) === status);
  const pending = byStatus("pending");
  const partial = byStatus("partially_approved");
  const approved = byStatus("approved");
  const withdrawn = byStatus("withdrawn");
  const rejected = byStatus("rejected");

  const handleApprove = async (enrollment: any) => {
    Alert.alert(
      "Approve Enrollment",
      `Approve ${enrollment.student.firstName} ${enrollment.student.lastName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve",
          onPress: async () => {
            setActionLoading(enrollment.enrollment_id);
            try {
              const { code, emailSent: sent } = await approveWithCode(
                enrollment,
                "approved",
              );
              const studentName = `${enrollment.student.firstName} ${enrollment.student.lastName}`;

              const adminName = await getAdminName();
              await logAudit({
                actorType: "admin",
                actorId: currentAdminId ?? "",
                actorName: adminName,
                action: "admin_approved_enrollment",
                targetType: "enrollment",
                targetId: String(enrollment.enrollment_id),
                targetName: studentName,
                metadata: {
                  studentId: enrollment.student_id,
                  email: enrollment.student.email,
                  curriculum: enrollment.curriculum?.curriculumName,
                },
              });

              setGeneratedCode(code);
              setEmailSent(sent);
              setCodeStudent({
                name: studentName,
                email: enrollment.student.email,
              });
              setCodeModal(true);

              await refreshData();
            } catch (err: any) {
              Alert.alert("Error", err.message ?? "Something went wrong.");
            } finally {
              setActionLoading(null);
            }
          },
        },
      ],
    );
  };

  const handleReject = async (enrollment: any) => {
    Alert.alert(
      "Reject Enrollment",
      `Reject ${enrollment.student.firstName} ${enrollment.student.lastName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: async () => {
            setActionLoading(enrollment.enrollment_id);
            try {
              await setEnrollmentStatus(
                getVerification(enrollment)?.verification_id,
                "rejected",
                "Application rejected by administrator.",
              );

              const adminName = await getAdminName();
              const studentName = `${enrollment.student.firstName} ${enrollment.student.lastName}`;
              await logAudit({
                actorType: "admin",
                actorId: currentAdminId ?? "",
                actorName: adminName,
                action: "admin_rejected_enrollment",
                targetType: "enrollment",
                targetId: String(enrollment.enrollment_id),
                targetName: studentName,
                metadata: {
                  studentId: enrollment.student_id,
                  email: enrollment.student.email,
                  curriculum: enrollment.curriculum?.curriculumName,
                },
              });

              await refreshData();
            } catch (err: any) {
              Alert.alert("Error", err.message ?? "Something went wrong.");
            } finally {
              setActionLoading(null);
            }
          },
        },
      ],
    );
  };

  const handleViewCode = async (enrollment: any) => {
    const { data } = await supabase
      .from("activation_codes")
      .select("code, is_used, expires_at")
      .eq("enrollment_id", enrollment.enrollment_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data) {
      Alert.alert("No Code", "No activation code found for this student.");
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
      Alert.alert(
        "Code Expired",
        "The activation code has expired. Tap Approve again to generate a new one.",
      );
      return;
    }

    setGeneratedCode(data.code);
    setEmailSent(null);
    setCodeStudent({
      name: `${enrollment.student.firstName} ${enrollment.student.lastName}`,
      email: enrollment.student.email,
    });
    setCodeModal(true);
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

  const ApprovalCard = ({
    enrollment,
    showActions,
  }: {
    enrollment: any;
    showActions: boolean;
  }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        router.push(
          `/admin/registrant/${enrollment.enrollment_id}?name=${enrollment.student.firstName}+${enrollment.student.lastName}` as any,
        )
      }
    >
      <View style={styles.avatarCircle}>
        {enrollment.student?.profilephotourl ? (
          <Image
            source={{ uri: enrollment.student.profilephotourl }}
            style={styles.avatarImage}
          />
        ) : (
          <Ionicons name="person-outline" size={30} color="#BDC3C7" />
        )}
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.nameText}>
          {enrollment.student.firstName} {enrollment.student.lastName}
        </Text>
        <Text style={styles.courseText}>
          {enrollment.curriculum?.curriculumName ?? "—"}
        </Text>
      </View>

      {actionLoading === enrollment.enrollment_id ? (
        <ActivityIndicator size="small" color="#2F459B" />
      ) : showActions ? (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.approveBtn}
            onPress={() => handleApprove(enrollment)}
          >
            <Ionicons name="checkmark" size={18} color="white" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.rejectBtn}
            onPress={() => handleReject(enrollment)}
          >
            <Ionicons name="close" size={18} color="white" />
          </TouchableOpacity>
        </View>
      ) : getStatus(enrollment) === "approved" ||
        getStatus(enrollment) === "partially_approved" ? (
        <TouchableOpacity
          style={styles.codeBtn}
          onPress={() => handleViewCode(enrollment)}
        >
          <Text style={styles.codeBtnText}>Code</Text>
        </TouchableOpacity>
      ) : null}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setMenuVisible(true)}>
          <Ionicons name="menu" size={28} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Approvals</Text>
      </View>

      <AdminHamburger
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
      />

      {loading ? (
        <ActivityIndicator size="large" color="#2F459B" style={{ flex: 1 }} />
      ) : (
        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#2F459B"]}
            />
          }
        >
          <Text style={styles.sectionTitle}>Pending ({pending.length})</Text>
          {pending.length === 0 ? (
            <Text style={styles.emptyText}>No pending enrollments</Text>
          ) : (
            pending.map((e) => (
              <ApprovalCard
                key={e.enrollment_id}
                enrollment={e}
                showActions={true}
              />
            ))
          )}

          <Text style={styles.sectionTitle}>
            Partially Approved ({partial.length})
          </Text>
          {partial.length === 0 ? (
            <Text style={styles.emptyText}>No partially approved students</Text>
          ) : (
            partial.map((e) => (
              <ApprovalCard
                key={e.enrollment_id}
                enrollment={e}
                showActions={false}
              />
            ))
          )}

          <Text style={styles.sectionTitle}>Approved ({approved.length})</Text>
          {approved.length === 0 ? (
            <Text style={styles.emptyText}>No approved enrollments</Text>
          ) : (
            approved.map((e) => (
              <ApprovalCard
                key={e.enrollment_id}
                enrollment={e}
                showActions={false}
              />
            ))
          )}

          <Text style={styles.sectionTitle}>
            Withdrawn ({withdrawn.length})
          </Text>
          {withdrawn.length === 0 ? (
            <Text style={styles.emptyText}>No withdrawn students</Text>
          ) : (
            withdrawn.map((e) => (
              <ApprovalCard
                key={e.enrollment_id}
                enrollment={e}
                showActions={false}
              />
            ))
          )}

          <Text style={styles.sectionTitle}>Rejected ({rejected.length})</Text>
          {rejected.length === 0 ? (
            <Text style={styles.emptyText}>No rejected enrollments</Text>
          ) : (
            rejected.map((e) => (
              <ApprovalCard
                key={e.enrollment_id}
                enrollment={e}
                showActions={false}
              />
            ))
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      )}

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

      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push("/admin/dashboard")}
        >
          <Ionicons name="home-outline" size={24} color="#2F459B" />
          <Text style={styles.navText}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push("/admin/courses")}
        >
          <Ionicons name="school-outline" size={24} color="#2F459B" />
          <Text style={styles.navText}>Courses</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push("/admin/calendar")}
        >
          <Ionicons name="calendar" size={24} color="#2F459B" />
          <Text style={styles.navText}>Calendar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="person-outline" size={24} color="#FFD75E" />
          <Text style={[styles.navText, { color: "#FFD75E" }]}>Approvals</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white" },
  header: {
    backgroundColor: "#FFD75E",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "black",
    marginLeft: 20,
  },
  content: { paddingHorizontal: 20, paddingTop: 10 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2F459B",
    marginTop: 20,
    marginBottom: 10,
  },
  emptyText: {
    color: "#999",
    fontSize: 13,
    marginBottom: 10,
    fontStyle: "italic",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2F459B",
    marginBottom: 10,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#CCC",
  },
  textContainer: { flex: 1, marginLeft: 15 },
  nameText: { fontSize: 15, fontWeight: "bold", color: "#2F459B" },
  courseText: { fontSize: 12, color: "#777" },
  actionRow: { flexDirection: "row", gap: 8 },
  approveBtn: {
    backgroundColor: "#27ae60",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  rejectBtn: {
    backgroundColor: "#e74c3c",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  codeBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2F459B",
    gap: 4,
  },
  codeBtnText: { fontSize: 12, color: "#2F459B", fontWeight: "600" },
  bottomNav: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: 70,
    backgroundColor: "white",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#EEE",
  },
  navItem: { alignItems: "center" },
  navText: { fontSize: 12, marginTop: 4, color: "#2F459B" },
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
  avatarImage: { width: 50, height: 50, borderRadius: 50 },
});
