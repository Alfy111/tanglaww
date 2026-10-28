import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Image,
  Linking,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

function ContactModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const contacts = [
    {
      icon: "call-outline" as const,
      label: "Phone",
      value: "09516989114",
      action: () => Linking.openURL("tel:09516989114"),
      color: "#27ae60",
    },
    {
      icon: "mail-outline" as const,
      label: "Email",
      value: "teacheraonlinereview@gmail.com",
      action: () => Linking.openURL("mailto:teacheraonlinereview@gmail.com"),
      color: "#2F459B",
    },
    {
      icon: "logo-facebook" as const,
      label: "Facebook",
      value: "Teacher A Online Review Center",
      action: () =>
        Linking.openURL("https://www.facebook.com/share/17bs1gtAiq/"),
      color: "#0084FF",
    },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={contactStyles.overlay}>
        <View style={contactStyles.card}>
          <View style={contactStyles.cardHeader}>
            <View style={contactStyles.avatarCircle}>
              <Image
                source={require("../assets/icons/splash-icon-dark.png")}
                style={contactStyles.avatarImage}
                resizeMode="contain"
              />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={contactStyles.orgName}>Contact Us</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={contactStyles.divider} />

          {contacts.map((c) => (
            <TouchableOpacity
              key={c.label}
              style={contactStyles.contactRow}
              onPress={c.action}
              activeOpacity={0.7}
            >
              <View
                style={[
                  contactStyles.iconCircle,
                  { backgroundColor: c.color + "18" },
                ]}
              >
                <Ionicons name={c.icon} size={20} color={c.color} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={contactStyles.contactLabel}>{c.label}</Text>
                <Text style={contactStyles.contactValue}>{c.value}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#BDC3C7" />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  );
}

export default function LoginScreen() {
  const router = useRouter();
  const [contactVisible, setContactVisible] = useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.topSection}>
        <TouchableOpacity
          style={styles.floatingContactBtn}
          onPress={() => setContactVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="headset-outline" size={25} color="#2F459B" />
        </TouchableOpacity>
        <Image
          source={require("../assets/images/business-idea (1).png")}
          style={styles.illustration}
          resizeMode="contain"
        />
      </View>
      <View style={styles.bottomSection}>
        <View style={{ height: 50 }} />
        <SafeAreaView style={styles.innerContainer}>
          <Text style={styles.quoteText}>
            "Where a Dreamer Becomes an Achiever"
          </Text>
          <View style={{ height: 5 }} />

          <View style={styles.buttonContainer}>
            <View style={styles.buttonWrapper}>
              <TouchableOpacity
                style={styles.enrollBtn}
                onPress={() => router.push("/signin")}
              >
                <Text style={styles.enrollText}>Sign-in</Text>
              </TouchableOpacity>
              <Text style={styles.subLabel}>For Existing users</Text>
            </View>

            <View style={styles.buttonWrapper}>
              <TouchableOpacity
                style={styles.signInBtn}
                onPress={() => router.push("/enroll")}
              >
                <Text style={styles.signInText}>Enroll Now</Text>
              </TouchableOpacity>
              <Text style={styles.subLabel}>For New users</Text>
            </View>
          </View>

          <TouchableOpacity onPress={() => router.push("/code")}>
            <Text style={styles.enrollCodeLink}>Use Enrollment Code</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>

      <ContactModal
        visible={contactVisible}
        onClose={() => setContactVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  topSection: {
    flex: 1.3,
    backgroundColor: "#FFD75E",
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 50,
  },
  illustration: {
    width: "70%",
    height: "70%",
  },
  bottomSection: {
    flex: 1,
    backgroundColor: "white",
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    marginTop: -40,
    paddingHorizontal: 30,
    paddingBottom: 40,
  },
  innerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 30,
    paddingTop: 20,
  },
  quoteText: {
    fontSize: 22,
    fontWeight: "bold",
    fontStyle: "italic",
    textAlign: "center",
  },
  buttonContainer: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-between",
  },
  buttonWrapper: { alignItems: "center", width: "48%" },
  signInBtn: {
    width: "100%",
    padding: 15,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#2F459B",
    alignItems: "center",
  },
  signInText: { color: "#2F459B", fontWeight: "bold", fontSize: 16 },
  enrollBtn: {
    width: "100%",
    padding: 15,
    borderRadius: 8,
    backgroundColor: "#2F459B",
    alignItems: "center",
  },
  enrollText: { color: "white", fontWeight: "bold", fontSize: 16 },
  subLabel: { fontSize: 12, color: "black", marginTop: 5, fontWeight: "500" },
  enrollCodeLink: {
    color: "#2F459B",
    textDecorationLine: "underline",
    fontWeight: "bold",
    fontSize: 16,
  },
  floatingContactBtn: {
    position: "absolute",
    top: 30,
    right: 20,
    width: 42,
    height: 42,
    borderRadius: 24,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    zIndex: 10,
  },
});

const contactStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarImage: {
    width: 85,
    height: 85,
  },
  orgName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1A1A2E",
  },
  divider: {
    height: 1,
    backgroundColor: "#F0F0F0",
    marginBottom: 16,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F8F8F8",
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  contactLabel: {
    fontSize: 11,
    color: "#95A5A6",
    fontWeight: "500",
  },
  contactValue: {
    fontSize: 14,
    color: "#1A1A2E",
    fontWeight: "600",
    marginTop: 1,
  },
});
