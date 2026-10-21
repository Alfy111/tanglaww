import { Feather, Ionicons } from "@expo/vector-icons";
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
import Toast from "react-native-toast-message";
import {
    activateAdmin,
    AdminRole,
    ROLE_LABELS,
    verifyAdminInvite,
} from "../../services/adminInviteService";
import { setGateValidating, triggerRoleCheck } from "../_layout";

const { width } = Dimensions.get("window");
const headerBg = require("../../assets/images/tanglaw_header.png");

export default function AdminActivateScreen() {
  const router = useRouter();
  const [step, setStep] = useState<"code" | "password">("code");

  const [email, setEmail] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [codeError, setCodeError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const inputs = useRef<TextInput[]>([]);

  const [invite, setInvite] = useState<{
    firstName: string;
    lastName: string;
    role: AdminRole;
  } | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const fullCode = code.join("");
  const canVerify = code.every((d) => d !== "") && email.trim().length > 0;

  const handleTextChange = (text: string, index: number) => {
    const clean = text.replace(/[^0-9]/g, "");
    const next = [...code];
    next[index] = clean;
    setCode(next);
    setCodeError("");
    if (clean && index < 5) inputs.current[index + 1]?.focus();
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && !code[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    if (!canVerify) return;
    setVerifying(true);
    setCodeError("");
    try {
      const result = await verifyAdminInvite(email, fullCode);
      setInvite(result);
      setStep("password");
    } catch (err: any) {
      setCodeError(err.message ?? "Something went wrong. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  const validate = (): string[] => {
    const rules = [
      {
        test: () => password.length >= 8,
        message: "Password must be at least 8 characters.",
      },
      {
        test: () => /[0-9]/.test(password),
        message: "Password must contain at least one number.",
      },
      {
        test: () => /[a-z]/.test(password),
        message: "Password must contain at least one lowercase letter.",
      },
      {
        test: () => /[A-Z]/.test(password),
        message: "Password must contain at least one uppercase letter.",
      },
      {
        test: () => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
        message: "Password must contain at least one special character.",
      },
      {
        test: () => password === confirmPassword,
        message: "Passwords do not match.",
      },
    ];
    return rules.filter((r) => !r.test()).map((r) => r.message);
  };

  const handleActivate = async () => {
    const problems = validate();
    if (problems.length > 0) {
      setErrors(problems);
      return;
    }
    setErrors([]);
    setSaving(true);
    setGateValidating(true);
    try {
      const userId = await activateAdmin(email, fullCode, password);
      await triggerRoleCheck(userId);
      Toast.show({
        type: "success",
        text1: "Your admin account is ready",
        position: "bottom",
        visibilityTime: 3500,
      });
    } catch (err: any) {
      setErrors([err.message ?? "Something went wrong. Please try again."]);
    } finally {
      setGateValidating(false);
      setSaving(false);
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
              onPress={() =>
                step === "password" ? setStep("code") : router.back()
              }
            >
              <Ionicons name="arrow-back" size={24} color="#0D2A94" />
            </TouchableOpacity>
          </View>
        </ImageBackground>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === "code" ? (
            <>
              <Text style={styles.title}>Activate Admin Account</Text>
              <Text style={styles.subtitle}>
                Enter your email and the 6-digit code sent to you by the owner
                or a super admin.
              </Text>

              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <TextInput
                  style={styles.emailInput}
                  placeholder="email@example.com"
                  placeholderTextColor="#A9A9A9"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={(t) => {
                    setEmail(t);
                    setCodeError("");
                  }}
                />

                <Text style={styles.inputLabel}>Activation Code</Text>
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
                      Didn't get a code? Ask the owner or a super admin to send
                      the invite again. Codes expire after 3 days.
                    </Text>
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  { opacity: canVerify && !verifying ? 1 : 0.6 },
                ]}
                onPress={handleVerify}
                disabled={!canVerify || verifying}
                activeOpacity={0.8}
              >
                {verifying ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Text style={styles.primaryText}>Verify Code</Text>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color="white"
                      style={{ marginLeft: 5 }}
                    />
                  </>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.title}>Create Your Password</Text>
              <Text style={styles.subtitle}>
                You're joining Tanglaw as{" "}
                <Text style={styles.bold}>
                  {invite ? ROLE_LABELS[invite.role] : "Admin"}
                </Text>
                .
              </Text>

              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <TextInput
                  style={[styles.emailInput, { color: "#888" }]}
                  editable={false}
                  value={invite ? `${invite.firstName} ${invite.lastName}` : ""}
                />

                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={[styles.emailInput, { color: "#888" }]}
                  editable={false}
                  value={email.trim().toLowerCase()}
                />

                <Text style={styles.inputLabel}>Create Password *</Text>
                <View style={styles.passwordWrap}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Create Password"
                    placeholderTextColor="#999"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Feather
                      name={showPassword ? "eye" : "eye-off"}
                      size={20}
                      color="#7F8C8D"
                    />
                  </TouchableOpacity>
                </View>

                <Text style={styles.inputLabel}>Confirm Password *</Text>
                <View style={styles.passwordWrap}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Confirm Password"
                    placeholderTextColor="#999"
                    secureTextEntry={!showConfirm}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirm(!showConfirm)}
                  >
                    <Feather
                      name={showConfirm ? "eye" : "eye-off"}
                      size={20}
                      color="#7F8C8D"
                    />
                  </TouchableOpacity>
                </View>

                <Text style={styles.smallNote}>
                  If this email already has a Tanglaw account, enter that
                  account's current password instead.
                </Text>

                {errors.length > 0 && (
                  <View
                    style={[styles.errorBanner, { alignItems: "flex-start" }]}
                  >
                    <Ionicons
                      name="alert-circle"
                      size={16}
                      color="#E74C3C"
                      style={{ marginTop: 2 }}
                    />
                    <View style={{ flex: 1 }}>
                      {errors.map((e, i) => (
                        <Text key={i} style={styles.errorText}>
                          • {e}
                        </Text>
                      ))}
                    </View>
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, saving && { opacity: 0.7 }]}
                onPress={handleActivate}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Text style={styles.primaryText}>Activate Account</Text>
                    <Ionicons
                      name="arrow-forward"
                      size={18}
                      color="white"
                      style={{ marginLeft: 8 }}
                    />
                  </>
                )}
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
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
  content: { paddingTop: 24, paddingHorizontal: 30, paddingBottom: 40 },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#0D2A94",
    marginBottom: 8,
  },
  subtitle: { fontSize: 13, color: "#666", marginBottom: 24, lineHeight: 19 },
  bold: { fontWeight: "bold", color: "#0D2A94" },
  inputSection: { width: "100%" },
  inputLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#0D2A94",
    marginBottom: 8,
  },
  emailInput: {
    borderWidth: 1,
    borderColor: "#DCDFE3",
    borderRadius: 8,
    paddingHorizontal: 15,
    height: 50,
    fontSize: 16,
    backgroundColor: "#F9FAFB",
    color: "#333",
    marginBottom: 20,
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
    marginTop: 4,
    gap: 6,
  },
  hintText: {
    fontSize: 11,
    color: "#666",
    fontStyle: "italic",
    flex: 1,
    lineHeight: 17,
  },
  passwordWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DCDFE3",
    borderRadius: 8,
    paddingHorizontal: 15,
    height: 50,
    backgroundColor: "#F9FAFB",
    marginBottom: 20,
  },
  passwordInput: { flex: 1, fontSize: 16, color: "#333" },
  smallNote: {
    fontSize: 11,
    color: "#7F8C8D",
    marginTop: -8,
    marginBottom: 8,
    lineHeight: 16,
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
  errorText: { fontSize: 12, color: "#E74C3C", flexShrink: 1, lineHeight: 18 },
  primaryBtn: {
    backgroundColor: "#0D2A94",
    width: "100%",
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    marginTop: 30,
  },
  primaryText: { color: "white", fontWeight: "bold", fontSize: 16 },
});
