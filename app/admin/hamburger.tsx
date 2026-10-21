import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import { useAdmin } from "../../context/AdminContext";

const { width } = Dimensions.get("window");

const tanglawGraphic = require("../../assets/images/tangalawhd.png");

interface AdminHamburgerProps {
  visible: boolean;
  onClose: () => void;
}

export default function AdminHamburger({
  visible,
  onClose,
}: AdminHamburgerProps) {
  const router = useRouter();
  const { pendingCount } = useAdmin();
  const [admin, setAdmin] = useState({
    firstName: "",
    lastName: "",
    email: "",
  });
  const [role, setRole] = useState<string>("admin");
  const canManageAdmins = role === "owner" || role === "super_admin";
  const roleLabel =
    role === "owner"
      ? "Owner"
      : role === "super_admin"
        ? "Super Admin"
        : "Instructor";

  const navigateTo = (path: string) => {
    onClose();
    router.push(path as any);
  };

  useEffect(() => {
    if (visible) {
      const fetchAdmin = async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data: adminData } = await supabase
          .from("admin")
          .select("firstName, lastName, email, role")
          .eq("admin_id", user.id)
          .maybeSingle();

        if (!adminData) return;
        setAdmin({
          firstName: adminData.firstName,
          lastName: adminData.lastName,
          email: adminData.email,
        });
        setRole(adminData.role ?? "admin");
      };
      fetchAdmin();
    }
  }, [visible]);

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.menuContainer}>
          <View style={styles.profileHeader}>
            <View style={styles.headerGraphic}>
              <Image
                source={tanglawGraphic}
                style={styles.backgroundImage}
                resizeMode="contain"
              />
            </View>

            <SafeAreaView>
              <View style={styles.headerContent}>
                <View style={styles.avatarCircle}>
                  <Ionicons name="person" size={35} color="#2F459B" />
                </View>
                <Text style={styles.adminName}>
                  {admin.firstName} {admin.lastName}
                </Text>
                <Text style={styles.adminRole}>{roleLabel}</Text>
                <Text style={styles.adminEmail}>{admin.email}</Text>
              </View>
            </SafeAreaView>
          </View>

          <View style={styles.body}>
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View>
                <Text style={styles.sectionLabel}>MANAGEMENT</Text>

                <TouchableOpacity
                  style={styles.navItem}
                  onPress={() => navigateTo("/admin/registry")}
                >
                  <Ionicons name="people-outline" size={20} color="#2F459B" />
                  <Text style={styles.navText}>Student Registry</Text>
                </TouchableOpacity>

                {canManageAdmins && (
                  <TouchableOpacity
                    style={styles.navItem}
                    onPress={() => navigateTo("/admin/manage-admins")}
                  >
                    <Ionicons
                      name="shield-checkmark-outline"
                      size={20}
                      color="#2F459B"
                    />
                    <Text style={styles.navText}>Manage Admins</Text>
                  </TouchableOpacity>
                )}

                <Text style={styles.sectionLabel}>APP CONFIGURATION</Text>

                <TouchableOpacity
                  style={styles.navItem}
                  onPress={() => navigateTo("/admin/edit-about")}
                >
                  <Ionicons
                    name="information-circle-outline"
                    size={20}
                    color="#2F459B"
                  />
                  <Text style={styles.navText}>About Tanglaw & TARC</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.bottomGroup}>
                <TouchableOpacity
                  style={styles.navItem}
                  onPress={() => navigateTo("/admin/edit-help")}
                >
                  <Ionicons
                    name="help-circle-outline"
                    size={20}
                    color="#2F459B"
                  />
                  <Text style={styles.navText}>Help</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.navItem}
                  onPress={() => navigateTo("/admin/edit-policies")}
                >
                  <Ionicons
                    name="document-text-outline"
                    size={20}
                    color="#2F459B"
                  />
                  <Text style={styles.navText}>Policies</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.navItem, { borderBottomWidth: 0 }]}
                  onPress={() => {
                    Alert.alert(
                      "Sign Out",
                      "Are you sure you want to sign out?",
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Sign Out",
                          style: "destructive",
                          onPress: async () => {
                            await supabase.auth.signOut();
                            Toast.show({
                              type: "success",
                              text1: "You have logged out successfully",
                              position: "bottom",
                              visibilityTime: 4000,
                            });
                            router.replace("/login");
                          },
                        },
                      ],
                    );
                  }}
                >
                  <Ionicons name="log-out-outline" size={20} color="#E74C3C" />
                  <Text style={[styles.navText, { color: "#E74C3C" }]}>
                    Sign Out
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  menuContainer: {
    width: width * 0.85,
    height: "100%",
    backgroundColor: "white",
  },
  profileHeader: {
    backgroundColor: "#FFD75E",
    padding: 20,
    paddingBottom: 25,
    position: "relative",
    overflow: "hidden",
  },
  headerGraphic: {
    position: "absolute",
    right: -20,
    bottom: -20,
    zIndex: 0,
  },
  backgroundImage: {
    width: 140,
    height: 140,
    opacity: 0.2,
  },
  headerContent: {
    marginTop: 10,
    zIndex: 1,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  adminName: { fontSize: 18, fontWeight: "bold", color: "#2F459B" },
  adminRole: { fontSize: 12, color: "#2F459B", fontWeight: "500" },
  adminEmail: { fontSize: 11, color: "#2F459B", opacity: 0.7 },
  body: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: "space-between", padding: 15 },
  bottomGroup: {
    marginTop: 40,
    borderTopWidth: 1,
    borderTopColor: "#F5F5F5",
    paddingTop: 10,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#AAA",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 15,
    marginLeft: 5,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  navText: {
    flex: 1,
    fontSize: 15,
    color: "#2F459B",
    marginLeft: 15,
    fontWeight: "500",
  },
  badge: {
    backgroundColor: "#E74C3C",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 8,
  },
  badgeText: { color: "white", fontSize: 10, fontWeight: "bold" },
});
