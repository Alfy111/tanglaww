import LoginWarningModal, {
  LoginWarning,
} from "@/components/LoginWarningModal";
import { useLoginLock } from "@/hooks/useLoginLock";
import { supabase } from "@/lib/supabase";
import {
  clearLoginFailures,
  formatRemaining,
  getLockStatus,
  isWrongPasswordError,
  normalizeEmail,
  recordLoginFailure,
} from "@/services/loginSecurityService";
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
import { setGateValidating, triggerRoleCheck } from "../_layout";

export default function AdminSignIn() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [warning, setWarning] = useState<LoginWarning | null>(null);
  const lock = useLoginLock(email);

  const goToReset = () => {
    setWarning(null);
    router.push({
      pathname: "/forgotpass",
      params: { email: normalizeEmail(email) },
    } as any);
  };

  const handleWrongPassword = async () => {
    const status = await recordLoginFailure(email);
    lock.apply(status);
    if (status.lockMinutes) {
      setWarning({
        title: "Sign-in disabled",
        message: `Too many wrong attempts. Password entry is disabled for ${status.lockMinutes} minutes.`,
        locked: true,
      });
    } else if (status.failures === 4 && status.lockCount === 0) {
      setWarning({
        title: "Incorrect password",
        message:
          "You have one last attempt. One more wrong password will disable sign-in for 3 minutes.",
        locked: false,
      });
    } else {
      setErrors(["Invalid email or password."]);
    }
  };

  const handleAdminSignIn = async () => {
    const newErrors: string[] = [];
    if (!email.trim() || !password.trim()) {
      newErrors.push("Kindly fill in all necessary information.");
    }
    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors([]);
    setLoading(true);
    setGateValidating(true);
    try {
      const status = await getLockStatus(email);
      if (status.remainingSeconds > 0) {
        lock.apply(status);
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizeEmail(email),
        password,
      });

      if (error) {
        if (isWrongPasswordError(error)) await handleWrongPassword();
        else setErrors([error.message]);
        return;
      }

      await clearLoginFailures().catch(() => {});

      const { data: adminRow } = await supabase
        .from("admin")
        .select("admin_id")
        .eq("admin_id", data.user.id)
        .maybeSingle();

      if (!adminRow) {
        await supabase.auth.signOut({ scope: "local" });
        setErrors(["Access denied. This account is not an administrator."]);
        return;
      }

      await triggerRoleCheck(data.user.id);

      Toast.show({
        type: "success",
        text1: "You have successfully signed in",
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
        <Ionicons name="arrow-back" size={24} color="#0D2A94" />
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.headerTitle}>Administrator Login</Text>
        <Text style={styles.headerSubtitle}>
          Authorized administrators only.
        </Text>

        <Text style={styles.welcomeText}>Welcome Back, Admin!</Text>

        <View style={styles.card}>
          <Text style={styles.inputLabel}>Email:</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter Admin Email"
            placeholderTextColor="#A9A9A9"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
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
                  color: lock.locked ? "#A9A9A9" : "#000000",
                },
              ]}
              editable={!lock.locked}
              placeholder={lock.locked ? "Password entry disabled" : "Password"}
              secureTextEntry={!showPassword}
              placeholderTextColor="#A9A9A9"
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons
                name={showPassword ? "eye-off" : "eye"}
                size={20}
                color="gray"
              />
            </TouchableOpacity>
          </View>

          {lock.locked ? (
            <Text style={styles.lockText}>
              Too many wrong attempts. Try again in{" "}
              {formatRemaining(lock.remaining)}.
            </Text>
          ) : lock.lockCount > 0 ? (
            <Text style={styles.lockNote}>
              One more wrong password will disable sign-in for 10 minutes.
            </Text>
          ) : null}

          {errors.length > 0 && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color="#c0392b" />
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
            style={{ alignSelf: "flex-end", marginTop: -5 }}
            onPress={goToReset}
          >
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.signInBtn,
              (loading || lock.locked) && { opacity: 0.6 },
            ]}
            onPress={handleAdminSignIn}
            disabled={loading || lock.locked}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.signInText}>Sign-In</Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.activateLink}
          onPress={() => router.push("/admin/activate" as any)}
        >
          <Text style={styles.activateText}>
            Got an admin invite?{" "}
            <Text style={styles.activateTextBold}>Activate admin account</Text>
          </Text>
        </TouchableOpacity>
      </View>

      <LoginWarningModal
        warning={warning}
        onClose={() => setWarning(null)}
        onReset={goToReset}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  backButton: { padding: 20 },
  content: { paddingHorizontal: 25, alignItems: "center" },
  headerTitle: { fontSize: 32, fontWeight: "bold", color: "#FFD75E" },
  headerSubtitle: {
    fontSize: 14,
    color: "#666",
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
    padding: 25,
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
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#CCC",
    marginBottom: 25,
  },
  signInBtn: {
    backgroundColor: "#FFD75E",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  signInText: { color: "black", fontWeight: "bold", fontSize: 16 },
  forgotText: { color: "#A9A9A9", fontSize: 12, marginBottom: 20 },
  errorBanner: {
    flexDirection: "row",
    backgroundColor: "#fff5f5",
    borderWidth: 1,
    borderColor: "#e74c3c",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  errorText: { color: "#c0392b", fontSize: 13 },
  lockText: {
    color: "#c0392b",
    fontSize: 12,
    marginBottom: 12,
    lineHeight: 17,
  },
  lockNote: {
    color: "#B26A00",
    fontSize: 12,
    marginBottom: 12,
    lineHeight: 17,
  },
  activateLink: { marginTop: 22, padding: 6 },
  activateText: { fontSize: 14, color: "#666", textAlign: "center" },
  activateTextBold: {
    color: "#0D2A94",
    fontWeight: "bold",
    textDecorationLine: "underline",
  },
});
