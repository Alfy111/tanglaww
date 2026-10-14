import { logoutStudent } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { logAudit } from "@/services/auditService";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";

const { width } = Dimensions.get("window");
const DRAWER_WIDTH = width * 0.75;

const tanglawGraphic = require("../assets/images/tangalawhd.png");

interface HamburgerProps {
  onClose: () => void;
}

export default function HamburgerMenu({ onClose }: HamburgerProps) {
  const router = useRouter();

  const [student, setStudent] = useState<{
    id: number | null;
    firstName: string;
    lastName: string;
    email: string;
    curriculum: { curriculumName: string };
    profilephotourl: string;
  }>({
    id: null,
    firstName: "",
    lastName: "",
    email: "",
    curriculum: { curriculumName: "" },
    profilephotourl: "",
  });

  const handleNav = (path: string) => {
    if (onClose) onClose();
    setTimeout(() => {
      router.push(path as any);
    }, 100);
  };

  useEffect(() => {
    const fetchStudent = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: studentData } = await supabase
        .from("student")
        .select("firstName, lastName, email, id, profilephotourl")
        .eq("auth_id", user.id)
        .maybeSingle();

      if (!studentData) return;

      const { data: enrollmentData } = await supabase
        .from("enrollment")
        .select("curriculum_id")
        .eq("student_id", studentData.id)
        .maybeSingle();

      if (!enrollmentData) return;

      const { data: curriculumData } = await supabase
        .from("curriculum")
        .select("curriculumName")
        .eq("curriculum_id", enrollmentData.curriculum_id)
        .maybeSingle();

      setStudent({
        id: studentData.id,
        firstName: studentData.firstName,
        lastName: studentData.lastName,
        email: studentData.email,
        curriculum: { curriculumName: curriculumData?.curriculumName ?? "" },
        profilephotourl: studentData.profilephotourl ?? "",
      });
    };
    fetchStudent();
  }, []);

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          if (student.id) {
            await logAudit({
              actorType: "student",
              actorId: String(student.id),
              actorName: `${student.firstName} ${student.lastName}`,
              action: "student_logout",
            });
          }
          await logoutStudent();

          Toast.show({
            type: "success",
            text1: "You have logged out successfully",
            position: "bottom",
            visibilityTime: 4000,
          });
          router.replace("/login");
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.drawerContainer}>
      <View style={styles.drawerHeader}>
        <View style={styles.headerGraphic}>
          <Image
            source={tanglawGraphic}
            style={styles.backgroundImage}
            resizeMode="contain"
          />
        </View>

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
        <View style={styles.headerTextContent}>
          <Text style={styles.userName}>
            {student.firstName} {student.lastName}
          </Text>
          <Text style={styles.userRole}>
            {student.curriculum?.curriculumName}
          </Text>
          <Text style={styles.userEmail}>{student.email}</Text>
        </View>
      </View>

      <View style={styles.menuItems}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => handleNav("/profile")}
        >
          <Ionicons name="person-outline" size={22} color="#2F459B" />
          <Text style={styles.menuText}>My Profile</Text>
          <Ionicons name="chevron-forward" size={18} color="#BDC3C7" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => handleNav("/settings")}
        >
          <Ionicons name="settings-outline" size={22} color="#2F459B" />
          <Text style={styles.menuText}>Settings</Text>
          <Ionicons name="chevron-forward" size={18} color="#BDC3C7" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => handleNav("/about")}
        >
          <Ionicons
            name="information-circle-outline"
            size={22}
            color="#2F459B"
          />
          <Text style={styles.menuText}>About</Text>
          <Ionicons name="chevron-forward" size={18} color="#BDC3C7" />
        </TouchableOpacity>

        <View style={{ flex: 1 }} />

        <View style={styles.separator} />

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => handleNav("/help")}
        >
          <Ionicons name="help-circle-outline" size={22} color="#2F459B" />
          <Text style={styles.menuText}>Help</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => handleNav("/policies")}
        >
          <MaterialCommunityIcons
            name="scale-balance"
            size={22}
            color="#2F459B"
          />
          <Text style={styles.menuText}>Policies</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={22} color="#FF4D4D" />
          <Text style={[styles.menuText, { color: "#FF4D4D" }]}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  drawerContainer: {
    flex: 1,
    backgroundColor: "white",
    width: DRAWER_WIDTH,
  },
  drawerHeader: {
    backgroundColor: "#0D2A94",
    padding: 20,
    paddingTop: 40,
    paddingBottom: 25,
    position: "relative",
    overflow: "hidden",
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
    zIndex: 2,
  },
  headerTextContent: { zIndex: 2 },
  userName: { color: "#FFB800", fontSize: 18, fontWeight: "bold" },
  userRole: { color: "white", fontSize: 13, marginTop: 2 },
  userEmail: { color: "rgba(255,255,255,0.7)", fontSize: 11, marginTop: 2 },
  headerGraphic: {
    position: "absolute",
    right: -30,
    bottom: -30,
    zIndex: 1,
  },
  backgroundImage: {
    width: 150,
    height: 150,
    opacity: 0.15,
  },
  menuItems: { flex: 1, paddingVertical: 10 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 25,
  },
  menuText: {
    flex: 1,
    marginLeft: 20,
    fontSize: 16,
    color: "#2F459B",
    fontWeight: "500",
  },
  separator: {
    height: 1,
    backgroundColor: "#F0F0F0",
    marginVertical: 10,
    marginHorizontal: 25,
  },
  avatarImage: { width: 80, height: 80, borderRadius: 40 },
});
