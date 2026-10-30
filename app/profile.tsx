import { supabase } from "@/lib/supabase";
import {
  FontAwesome5,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
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
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { readFileBytes } from "../lib/readFileBytes";
import HamburgerMenu from "./hamburger";

type MyEnrollment = {
  status: string | null;
  paymentType: string | null;
  balanceProofUrl: string | null;
  balanceSubmittedAt: string | null;
};

export default function ProfileScreen() {
  const router = useRouter();
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<any>(null);
  const [refresh, setRefresh] = useState(false);
  const [enrollmentInfo, setEnrollmentInfo] = useState<MyEnrollment | null>(
    null,
  );
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("student")
      .select(
        `
        id,
        firstName,
        lastName,
        middleName,
        email,
        phoneNumber,
        profilephotourl,
        enrollment (
          curriculum!enrollment_curriculum_id_fkey (curriculumName),
          specialization!enrollment_specialization_id_fkey (specializationName)
        )
      `,
      )
      .eq("email", user.email)
      .single();

    if (error) console.error("Profile fetch error:", error.message);
    if (data) setStudent(data);

    const { data: info } = await supabase.rpc("get_my_enrollment");
    setEnrollmentInfo((info as MyEnrollment) ?? null);
    setLoading(false);
  };

  const fullName = student
    ? `${student.firstName}${student.middleName ? " " + student.middleName + "." : ""} ${student.lastName}`.toUpperCase()
    : "";

  const curriculum =
    (student?.enrollment as any)?.[0]?.curriculum?.curriculumName ?? "—";
  const specialization =
    (student?.enrollment as any)?.[0]?.specialization?.specializationName ??
    "—";

  const uploadBalanceReceipt = async (
    uri: string,
    name: string,
    mimeType: string,
  ) => {
    if (!student) return;
    setUploading(true);
    try {
      const safeName = name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `balance/${student.id}_${Date.now()}_${safeName}`;
      const bytes = await readFileBytes(uri);

      const { error: uploadError } = await supabase.storage
        .from("receipts")
        .upload(path, bytes, { contentType: mimeType, upsert: false });
      if (uploadError) throw new Error(uploadError.message);

      const { data: urlData } = supabase.storage
        .from("receipts")
        .getPublicUrl(path);
      const { error } = await supabase.rpc("submit_balance_receipt", {
        p_url: urlData.publicUrl,
      });
      if (error) throw new Error(error.message);

      Alert.alert(
        "Receipt submitted",
        "The admin will review your payment. The remaining courses unlock once you are fully approved.",
      );
      await fetchProfile();
    } catch (err: any) {
      Alert.alert("Upload failed", err.message ?? "Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const pickBalanceReceipt = () => {
    Alert.alert("Upload Receipt", "Choose an option", [
      {
        text: "Camera",
        onPress: async () => {
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ["images"],
            quality: 0.8,
          });
          if (!result.canceled) {
            const a = result.assets[0];
            uploadBalanceReceipt(
              a.uri,
              a.fileName ?? "receipt.jpg",
              a.mimeType ?? "image/jpeg",
            );
          }
        },
      },
      {
        text: "Gallery",
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            quality: 0.8,
          });
          if (!result.canceled) {
            const a = result.assets[0];
            uploadBalanceReceipt(
              a.uri,
              a.fileName ?? "receipt.jpg",
              a.mimeType ?? "image/jpeg",
            );
          }
        },
      },
      {
        text: "File (PDF)",
        onPress: async () => {
          const result = await DocumentPicker.getDocumentAsync({
            type: ["application/pdf", "image/*"],
            copyToCacheDirectory: true,
          });
          if (!result.canceled) {
            const f = result.assets[0];
            uploadBalanceReceipt(
              f.uri,
              f.name,
              f.mimeType ?? "application/pdf",
            );
          }
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const isPartial = enrollmentInfo?.status === "partially_approved";

  const onRefresh = useCallback(async () => {
    setRefresh(true);
    await fetchProfile();
    setRefresh(false);
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#0D2A94" style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Modal
        animationType="fade"
        transparent={true}
        visible={isMenuVisible}
        onRequestClose={() => setIsMenuVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <HamburgerMenu onClose={() => setIsMenuVisible(false)} />
          <TouchableWithoutFeedback onPress={() => setIsMenuVisible(false)}>
            <View style={styles.clickableOverlay} />
          </TouchableWithoutFeedback>
        </View>
      </Modal>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => setIsMenuVisible(true)}>
          <Ionicons name="menu" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refresh}
            onRefresh={onRefresh}
            colors={["#0D2A94"]}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.profileCard}>
          <View style={styles.banner}>
            <TouchableOpacity
              style={styles.editIcon}
              onPress={() => router.push("/edit-profile")}
            >
              <MaterialCommunityIcons
                name="pencil-box-outline"
                size={28}
                color="white"
              />
            </TouchableOpacity>
            <View style={styles.bannerGraphic}>
              <FontAwesome5
                name="graduation-cap"
                size={80}
                color="rgba(255,255,255,0.2)"
              />
            </View>
          </View>

          <View style={styles.avatarContainer}>
            <View style={styles.avatarCircle}>
              {student?.profilephotourl ? (
                <Image
                  source={{ uri: student.profilephotourl }}
                  style={styles.avatarImage}
                />
              ) : (
                <Ionicons name="person-outline" size={60} color="#BDC3C7" />
              )}
            </View>
          </View>

          <View style={styles.userInfoHeader}>
            <Text style={styles.userName}>{fullName}</Text>
            <Text style={styles.userRole}>{curriculum}</Text>
            <Text style={styles.userEmailSmall}>{student?.email}</Text>
          </View>

          <View style={styles.detailsContainer}>
            {[
              { label: "Curriculum", value: curriculum },
              { label: "Specialization", value: specialization },
              { label: "Email", value: student?.email ?? "—" },
              {
                label: "Contact Number",
                value: student?.phoneNumber?.trim()
                  ? student.phoneNumber
                  : "Not set",
              },
            ].map((item, index) => (
              <View key={index} style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{item.label}</Text>
                <View style={styles.inputBox}>
                  <Text
                    style={[
                      styles.inputText,
                      !student?.phoneNumber?.trim() &&
                        item.label === "Contact Number" &&
                        styles.inputTextMuted,
                    ]}
                  >
                    {item.value}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {isPartial && (
          <View style={styles.balanceCard}>
            <View style={styles.balanceHeader}>
              <Ionicons name="wallet-outline" size={22} color="#0D2A94" />
              <Text style={styles.balanceTitle}>Remaining Balance</Text>
            </View>
            <Text style={styles.balanceText}>
              Upload your remaining balance receipt to unlock the rest of the
              courses.
            </Text>

            {enrollmentInfo?.balanceProofUrl ? (
              <View style={styles.balanceDone}>
                <Ionicons name="time-outline" size={16} color="#B26A00" />
                <Text style={styles.balanceDoneText}>
                  Receipt submitted on{" "}
                  {new Date(
                    enrollmentInfo.balanceSubmittedAt ?? "",
                  ).toLocaleDateString("en-PH", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                  . Waiting for admin review.
                </Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.balanceBtn, uploading && { opacity: 0.7 }]}
              onPress={pickBalanceReceipt}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons
                    name="cloud-upload-outline"
                    size={18}
                    color="white"
                  />
                  <Text style={styles.balanceBtnText}>
                    {enrollmentInfo?.balanceProofUrl
                      ? "Replace Receipt"
                      : "Upload Receipt"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.replace("/homepage")}
        >
          <Ionicons name="home-outline" size={24} color="#2F459B" />
          <Text style={styles.navText}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.replace("/courses")}
        >
          <FontAwesome5 name="graduation-cap" size={20} color="#2F459B" />
          <Text style={styles.navText}>Courses</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.replace("/calendar")}
        >
          <Ionicons name="calendar-outline" size={24} color="#2F459B" />
          <Text style={styles.navText}>Calendar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="person" size={24} color="#FFB800" />
          <Text style={[styles.navText, { color: "#FFB800" }]}>Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  modalOverlay: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  clickableOverlay: { flex: 1 },
  header: {
    backgroundColor: "#0D2A94",
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  headerTitle: { color: "white", fontSize: 20, fontWeight: "bold" },
  scrollContent: { padding: 20, paddingBottom: 100 },
  profileCard: {
    backgroundColor: "white",
    borderRadius: 20,
    overflow: "hidden",
    elevation: 5,
  },
  banner: { backgroundColor: "#0D2A94", height: 120, position: "relative" },
  bannerGraphic: { position: "absolute", right: -10, bottom: -10 },
  editIcon: { position: "absolute", top: 15, right: 15, zIndex: 1 },
  avatarContainer: { alignItems: "center", marginTop: -50 },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "white",
    borderWidth: 2,
    borderColor: "#0D2A94",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarImage: { width: 100, height: 100, borderRadius: 50 },
  userInfoHeader: { alignItems: "center", paddingVertical: 15 },
  userName: { fontSize: 20, fontWeight: "bold", color: "#0D2A94" },
  userRole: { fontSize: 13, color: "#333", fontWeight: "600" },
  userEmailSmall: { fontSize: 11, color: "#7F8C8D" },
  detailsContainer: { paddingHorizontal: 20, paddingBottom: 30 },
  inputGroup: { marginBottom: 15 },
  inputLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#0D2A94",
    marginBottom: 8,
  },
  inputBox: {
    borderWidth: 1,
    borderColor: "#BDC3C7",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#FDFDFD",
  },
  inputText: { fontSize: 14, color: "#555" },
  inputTextMuted: { color: "#BDC3C7", fontStyle: "italic" },
  balanceCard: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    marginTop: 20,
    elevation: 5,
  },
  balanceHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  balanceTitle: { fontSize: 16, fontWeight: "bold", color: "#0D2A94" },
  balanceText: { fontSize: 13, color: "#555", lineHeight: 19 },
  balanceDone: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    borderRadius: 8,
    padding: 3,
    marginTop: 9,
  },
  balanceDoneText: { flex: 1, fontSize: 12, color: "#B26A00", lineHeight: 17 },
  balanceBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#0D2A94",
    padding: 14,
    borderRadius: 10,
    marginTop: 14,
  },
  balanceBtnText: { color: "white", fontWeight: "bold", fontSize: 15 },
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
});
