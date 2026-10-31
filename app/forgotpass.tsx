import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
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
import {
  normalizeEmail,
  PASSWORD_RULES,
  resetPasswordWithCode,
  sendResetCode,
} from "../services/loginSecurityService";

type Step = "email" | "reset" | "done";

const RESEND_SECONDS = 60;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [step, setStep] = useState<Step>("email");
  const [resendIn, setResendIn] = useState(0);

  const counting = resendIn > 0;
  useEffect(() => {
    if (!counting) return;
    const timer = setInterval(
      () => setResendIn((s) => Math.max(0, s - 1)),
      1000,
    );
    return () => clearInterval(timer);
  }, [counting]);

  const handleSendCode = async () => {
    if (!email.trim()) {
      setErrors(["Please enter your email address."]);
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrors(["Please enter a valid email address."]);
      return;
    }
    setErrors([]);
    setLoading(true);
    try {
      await sendResetCode(email);
      setStep("reset");
      setResendIn(RESEND_SECONDS);
    } catch (err: any) {
      setErrors([err.message ?? "Something went wrong. Please try again."]);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendIn > 0 || loading) return;
    setErrors([]);
    setLoading(true);
    try {
      await sendResetCode(email);
      setResendIn(RESEND_SECONDS);
    } catch (err: any) {
      setErrors([err.message ?? "Something went wrong. Please try again."]);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    const problems: string[] = [];
    if (!/^\d{6}$/.test(code))
      problems.push("Enter the 6-digit code from your email.");
    problems.push(
      ...PASSWORD_RULES.filter((r) => !r.test(password)).map((r) => r.message),
    );
    if (password !== confirmPassword) problems.push("Passwords do not match.");
    if (problems.length > 0) {
      setErrors(problems);
      return;
    }
    setErrors([]);
    setLoading(true);
    try {
      await resetPasswordWithCode(email, code, password);
      setStep("done");
    } catch (err: any) {
      setErrors(
        (err.message ?? "Something went wrong. Please try again.").split("\n"),
      );
    } finally {
      setLoading(false);
    }
  };

  const header = (
    <View style={styles.header}>
      <TouchableOpacity
        onPress={() => (step === "reset" ? setStep("email") : router.back())}
      >
        <Ionicons name="arrow-back" size={24} color="white" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Forgot Password</Text>
      <View style={{ width: 24 }} />
    </View>
  );

  const errorBox =
    errors.length > 0 ? (
      <View style={styles.errorBanner}>
        <Ionicons
          name="alert-circle"
          size={16}
          color="#c0392b"
          style={{ marginTop: 1 }}
        />
        <View style={{ flex: 1 }}>
          {errors.map((e, i) => (
            <Text key={i} style={styles.errorText}>
              {errors.length > 1 ? `• ${e}` : e}
            </Text>
          ))}
        </View>
      </View>
    ) : null;

  const passwordField = (
    label: string,
    value: string,
    setValue: (v: string) => void,
    visible: boolean,
    setVisible: (v: boolean) => void,
  ) => (
    <>
      <Text style={[styles.label, { marginTop: 16 }]}>{label}</Text>
      <View style={styles.inputWrapper}>
        <Ionicons name="lock-closed-outline" size={20} color="#7F8C8D" />
        <TextInput
          style={styles.input}
          placeholder={label}
          placeholderTextColor="#A9A9A9"
          secureTextEntry={!visible}
          autoCapitalize="none"
          value={value}
          onChangeText={(t) => {
            setValue(t);
            setErrors([]);
          }}
        />
        <TouchableOpacity onPress={() => setVisible(!visible)}>
          <Ionicons
            name={visible ? "eye-off" : "eye"}
            size={20}
            color="#7F8C8D"
          />
        </TouchableOpacity>
      </View>
    </>
  );

  if (step === "done") {
    return (
      <SafeAreaView style={styles.container}>
        {header}
        <View style={styles.content}>
          <View style={styles.iconWrap}>
            <Ionicons name="checkmark-circle" size={60} color="#27ae60" />
          </View>
          <Text style={styles.title}>Password updated</Text>
          <Text style={styles.subtitle}>
            Your password has been changed. You can now sign in with your new
            password.
          </Text>
          <TouchableOpacity style={styles.btn} onPress={() => router.back()}>
            <Text style={styles.btnText}>Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (step === "reset") {
    return (
      <SafeAreaView style={styles.container}>
        {header}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.iconWrap}>
              <Ionicons name="mail" size={60} color="#0D2A94" />
            </View>
            <Text style={styles.title}>Enter your code</Text>
            <Text style={styles.subtitle}>
              If an account exists for this email, we sent a 6-digit code to:
            </Text>
            <Text style={styles.emailHighlight}>{normalizeEmail(email)}</Text>
            <Text style={[styles.subtitle, { marginTop: 6 }]}>
              The code expires in 15 minutes. Check your spam folder too.
            </Text>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Reset Code:</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="keypad-outline" size={20} color="#7F8C8D" />
                <TextInput
                  style={[styles.input, styles.codeInput]}
                  placeholder="000000"
                  placeholderTextColor="#C8CDD3"
                  keyboardType="number-pad"
                  maxLength={6}
                  value={code}
                  onChangeText={(t) => {
                    setCode(t.replace(/\D/g, ""));
                    setErrors([]);
                  }}
                />
              </View>

              {passwordField(
                "New Password",
                password,
                setPassword,
                showPassword,
                setShowPassword,
              )}
              {passwordField(
                "Confirm New Password",
                confirmPassword,
                setConfirmPassword,
                showConfirm,
                setShowConfirm,
              )}
              <Text style={styles.ruleHint}>
                At least 8 characters with an uppercase letter, a lowercase
                letter, a number, and a special character.
              </Text>

              {errorBox}
            </View>

            <TouchableOpacity
              style={[styles.btn, loading && { opacity: 0.7 }]}
              onPress={handleReset}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.btnText}>Reset Password</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backToLogin}
              onPress={handleResend}
              disabled={resendIn > 0 || loading}
            >
              <Text
                style={[
                  styles.backToLoginText,
                  resendIn > 0 && {
                    color: "#A9A9A9",
                    textDecorationLine: "none",
                  },
                ]}
              >
                {resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {header}
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Ionicons name="lock-open-outline" size={60} color="#0D2A94" />
        </View>

        <Text style={styles.title}>Reset your password</Text>
        <Text style={styles.subtitle}>
          Enter the email address linked to your account and we'll send you a
          6-digit reset code.
        </Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email Address:</Text>
          <View
            style={[
              styles.inputWrapper,
              errors.length > 0 ? styles.inputError : null,
            ]}
          >
            <Ionicons name="mail-outline" size={20} color="#7F8C8D" />
            <TextInput
              style={styles.input}
              placeholder="youremail@example.com"
              placeholderTextColor="#A9A9A9"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                setErrors([]);
              }}
            />
          </View>
          {errorBox}
        </View>

        <TouchableOpacity
          style={[styles.btn, loading && { opacity: 0.7 }]}
          onPress={handleSendCode}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.btnText}>Send Reset Code</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backToLogin}
          onPress={() => router.back()}
        >
          <Text style={styles.backToLoginText}>Back to Sign In</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white" },
  header: {
    backgroundColor: "#0D2A94",
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  headerTitle: { color: "white", fontSize: 20, fontWeight: "bold" },
  content: { flex: 1, padding: 25, alignItems: "center" },
  iconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#F0F4FF",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#0D2A94",
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  emailHighlight: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#0D2A94",
    marginTop: 5,
  },
  inputContainer: { width: "100%", marginTop: 25 },
  label: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#2C3E50",
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DCDFE3",
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 50,
    backgroundColor: "#F9FAFB",
    gap: 10,
  },
  inputError: { borderColor: "#e74c3c" },
  input: { flex: 1, fontSize: 15, color: "#333" },
  errorBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#fff5f5",
    borderWidth: 1,
    borderColor: "#e74c3c",
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    gap: 6,
  },
  errorText: { fontSize: 12, color: "#c0392b", flex: 1 },
  btn: {
    backgroundColor: "#0D2A94",
    width: "100%",
    height: 50,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 25,
  },
  btnText: { color: "white", fontSize: 16, fontWeight: "bold" },
  backToLogin: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    gap: 6,
  },
  backToLoginText: {
    color: "#0D2A94",
    fontSize: 14,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  tipsCard: {
    backgroundColor: "#F0F4FF",
    borderRadius: 12,
    padding: 16,
    width: "100%",
    marginTop: 20,
    gap: 10,
  },
  tipRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  tipText: { fontSize: 13, color: "#555", flex: 1 },
  codeInput: {
    letterSpacing: 8,
    fontSize: 20,
    fontWeight: "bold",
    color: "#0D2A94",
  },
  ruleHint: { fontSize: 11, color: "#7F8C8D", marginTop: 8, lineHeight: 16 },
});
