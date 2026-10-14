import { supabase } from "@/lib/supabase";
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
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrors(["Invalid email or password."]);
        return;
      }

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
        <Text style={styles.headerTitle}>Admin Access</Text>
        <Text style={styles.headerSubtitle}>
          Secure portal for system administrators and instructors.
        </Text>

        <Text style={styles.welcomeText}>Management Login</Text>

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
                  color: "#000000",
                },
              ]}
              placeholder="Password"
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
            style={[styles.signInBtn, loading && { opacity: 0.7 }]}
            onPress={handleAdminSignIn}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.signInText}>Verify & Login</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  backButton: { padding: 20 },
  content: { paddingHorizontal: 25, alignItems: "center" },
  headerTitle: { fontSize: 32, fontWeight: "bold", color: "#0D2A94" },
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
    backgroundColor: "#0D2A94",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  signInText: { color: "white", fontWeight: "bold", fontSize: 16 },
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
});
