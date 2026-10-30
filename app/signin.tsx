import { generateSessionToken, registerSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { logAudit } from "@/services/auditService";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import { setGateValidating, triggerRoleCheck } from "./_layout";

export default function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pass, setPassword] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    const newErrors: string[] = [];
    if (!email.trim() || !pass.trim())
      newErrors.push("Kindly fill in all the necessary information.");
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      newErrors.push("Please enter a valid email address.");

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors([]);
    setLoading(true);
    setGateValidating(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: pass,
      });

      if (error) {
        setErrors([error.message]);
        return;
      }

      const { data: admin } = await supabase
        .from("admin")
        .select("admin_id")
        .eq("admin_id", data.user.id)
        .maybeSingle();

      if (admin) {
        await supabase.auth.signOut({ scope: "local" });
        setErrors(["Access denied. This account is not a student."]);
        return;
      }

      const { data: student } = await supabase
        .from("student")
        .select("id, firstName, lastName")
        .eq("auth_id", data.user.id)
        .maybeSingle();

      if (!student) {
        await supabase.auth.signOut({ scope: "local" });
        setErrors(["No student account found."]);
        return;
      }

      const { data: status } = await supabase.rpc("my_enrollment_status");
      if (status === "withdrawn") {
        await supabase.auth.signOut({ scope: "local" });
        setErrors([
          "Your enrollment has been withdrawn. Please contact the admin if you wish to continue.",
        ]);
        return;
      }
      const token = await generateSessionToken();
      await registerSession(student.id, token);

      try {
        await logAudit({
          actorType: "student",
          actorId: String(student.id),
          actorName: `${student.firstName} ${student.lastName}`,
          action: "student_login",
        });
      } catch (auditErr) {}
      await triggerRoleCheck(data.user.id);

      Toast.show({
        type: "success",
        text1: "You have successfully signed in!",
        position: "bottom",
        visibilityTime: 3500,
      });
    } catch (err: any) {
      await supabase.auth.signOut({ scope: "local" }).catch(() => {});
      setErrors([err.message ?? "Something went wrong."]);
    } finally {
      setGateValidating(false);
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="#2F459B" />
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.headerTitle}>Sign in</Text>
        <Text style={styles.headerSubtitle}>
          Ready to beat the boards? Sign in now!
        </Text>

        <Text style={styles.welcomeText}>Welcome Back, Achiever!</Text>

        <View style={styles.card}>
          <Text style={styles.inputLabel}>Email Address:</Text>
          <TextInput
            style={styles.input}
            placeholder="Email Address"
            placeholderTextColor="#A9A9A9"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={(val) => setEmail(val)}
          />

          <Text style={styles.inputLabel}>Password:</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={[
                styles.input,
                {
                  flex: 1,
                  borderBottomWidth: 0,
                  marginBottom: 0,
                  color: "#000000",
                },
              ]}
              placeholder="Password"
              secureTextEntry={!showPassword}
              placeholderTextColor="#A9A9A9"
              value={pass}
              onChangeText={(val) => setPassword(val)}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons
                name={showPassword ? "eye-off" : "eye"}
                size={20}
                color="gray"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={{ alignSelf: "flex-end", marginTop: 5 }}
            onPress={() => router.push("/forgotpass")}
          >
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          {errors.length > 0 && (
            <View style={styles.errorBanner}>
              <Ionicons
                name="alert-circle"
                size={18}
                color="#c0392b"
                style={{ marginTop: 2 }}
              />
              <View style={{ flex: 1, marginLeft: 8 }}>
                {errors.map((e, i) => (
                  <Text key={i} style={styles.errorText}>
                    {e}
                  </Text>
                ))}
              </View>
            </View>
          )}

          <TouchableOpacity
            style={[styles.signInBtn, loading && { opacity: 0.7 }]}
            onPress={handleSignIn}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.signInText}>Sign-In</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footerRow}>
          <View>
            <Text style={styles.footerLabel}>New here?</Text>
            <TouchableOpacity onPress={() => router.push("/enroll")}>
              <Text style={styles.footerLinkBlue}>Enroll now!</Text>
            </TouchableOpacity>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.footerLabel}>For Instructors</Text>
            <TouchableOpacity
              onPress={() => router.push("/admin/signin" as any)}
            >
              <Text style={styles.footerLinkYellow}>Admin Sign in</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white" },
  backButton: { padding: 20 },
  content: { paddingHorizontal: 25, alignItems: "center" },
  headerTitle: { fontSize: 32, fontWeight: "bold", color: "#2F459B" },
  headerSubtitle: {
    fontSize: 14,
    color: "#444",
    marginTop: 5,
    textAlign: "center",
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: "700",
    marginVertical: 25,
    color: "#333",
  },
  card: {
    width: "100%",
    padding: 20,
    borderRadius: 15,
    backgroundColor: "#fff",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
  },
  inputLabel: { fontWeight: "bold", color: "#555", marginBottom: 5 },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: "#CCC",
    paddingVertical: 8,
    marginBottom: 20,
    fontSize: 16,
    color: "#000000",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#CCC",
    marginBottom: 5,
  },
  forgotText: { color: "#A9A9A9", fontSize: 12, marginBottom: 20 },
  signInBtn: {
    backgroundColor: "#2F459B",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  signInText: { color: "white", fontWeight: "bold", fontSize: 16 },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  line: { flex: 1, height: 1, backgroundColor: "#EEE" },
  dividerText: { marginHorizontal: 10, color: "#999", fontSize: 12 },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 30,
  },
  footerLabel: { color: "#666", fontSize: 12, marginBottom: 2 },
  footerLinkBlue: {
    color: "#2F459B",
    fontWeight: "bold",
    textDecorationLine: "underline",
  },
  footerLinkYellow: {
    color: "#FFD75E",
    fontWeight: "bold",
    textDecorationLine: "underline",
  },
  errorBanner: {
    flexDirection: "row",
    backgroundColor: "#fff5f5",
    borderWidth: 1,
    borderColor: "#e74c3c",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  errorText: { color: "#c0392b", fontSize: 13, lineHeight: 20 },
});
