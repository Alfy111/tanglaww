import { supabase } from "@/lib/supabase";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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
import { useAdmin } from "../context/AdminContext";
import { readFileBytes } from "../lib/readFileBytes";
import { generateSessionToken, registerSession } from "../lib/session";

export default function ProfileSetupScreen() {
  const { setStudentDirectly } = useAdmin();
  const router = useRouter();
  const { email, studentId, activationCodeId } = useLocalSearchParams<{
    email: string;
    studentId: string;
    activationCodeId: string;
  }>();

  const [firstName, setFirstName] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    const fetchStudent = async () => {
      const { data } = await supabase
        .from("student")
        .select("firstName")
        .eq("id", studentId)
        .single();

      if (data) setFirstName(data.firstName);
      setFetching(false);
    };
    if (studentId) fetchStudent();
  }, [studentId]);

  const handlePickPhoto = () => {
    Alert.alert("Profile Photo", "Choose an option", [
      {
        text: "Camera",
        onPress: async () => {
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          });
          if (!result.canceled) setPhotoUri(result.assets[0].uri);
        },
      },
      {
        text: "Gallery",
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          });
          if (!result.canceled) setPhotoUri(result.assets[0].uri);
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const uploadPhoto = async (): Promise<string | null> => {
    if (!photoUri) return null;

    const fileName = `${studentId}_${Date.now()}.jpg`;
    const bytes = await readFileBytes(photoUri);

    const { error } = await supabase.storage
      .from("profiles")
      .upload(`photos/${fileName}`, bytes, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (error) {
      return null;
    }

    const { data: urlData } = supabase.storage
      .from("profiles")
      .getPublicUrl(`photos/${fileName}`);

    return urlData.publicUrl;
  };

  const validate = (): string[] => {
    const rules = [
      {
        test: () => password.trim().length > 0,
        message: "Please create a password.",
      },
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
      {
        test: () => {
          if (!phoneNumber.trim()) return true;
          const cleaned = phoneNumber.replace(/\s|-/g, "");
          return /^(09|\+639)\d{9}$/.test(cleaned);
        },
        message:
          "Please enter a valid Philippine mobile number (e.g. 0912-345-6789).",
      },
    ];
    return rules.filter((rule) => !rule.test()).map((rule) => rule.message);
  };

  const handleFinish = async () => {
    const validationErrors = validate();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors([]);
    setLoading(true);

    try {
      const { data: signUpData, error: signUpError } =
        await supabase.auth.signUp({
          email: email,
          password: password,
          options: {
            data: { student_id: studentId },
          },
        });

      if (signUpError) throw new Error(signUpError.message);
      if (!signUpData.user) throw new Error("No user returned from signup.");

      const photoUrl = await uploadPhoto();

      const { error: updateError } = await supabase
        .from("student")
        .update({
          auth_id: signUpData.user.id,
          isAccountSetup: true,
          ...(phoneNumber.trim() ? { phoneNumber: phoneNumber.trim() } : {}),
          ...(photoUrl ? { profilephotourl: photoUrl } : {}),
        })
        .eq("id", studentId);

      if (updateError)
        throw new Error("Failed to link account: " + updateError.message);

      try {
        const token = await generateSessionToken();
        await registerSession(Number(studentId), token);
      } catch (sessionErr) {
        console.warn("[profilesetup] session registration failed", sessionErr);
      }
      setStudentDirectly(Number(studentId));

      if (activationCodeId) {
        const { error: codeError } = await supabase
          .from("activation_codes")
          .update({ is_used: true })
          .eq("id", activationCodeId);
      }
      router.replace("/succes");
    } catch (err: any) {
      Alert.alert(
        "Error",
        err.message ?? "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#0D2A94" style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Complete Your Profile</Text>
          <Text style={styles.subtitle}>
            Help us personalize your learning experience.
          </Text>

          <View style={styles.avatarContainer}>
            <TouchableOpacity onPress={handlePickPhoto}>
              <View style={styles.avatarCircle}>
                {photoUri ? (
                  <Image
                    source={{ uri: photoUri }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <Ionicons name="person" size={50} color="#BDC3C7" />
                )}
                <View style={styles.cameraBtn}>
                  <Ionicons name="camera" size={18} color="white" />
                </View>
              </View>
            </TouchableOpacity>
            <Text style={styles.avatarLabel}>
              {photoUri
                ? "Tap to change photo"
                : "Upload Profile Picture (optional)"}
            </Text>

            <View style={styles.photoNoteWrap}>
              <Ionicons
                name="information-circle-outline"
                size={15}
                color="#2F459B"
              />
              <Text style={styles.photoNote}>
                We highly recommend using a clear, formal photo for your profile
                picture.
              </Text>
            </View>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={[styles.input, { color: "#888" }]}
                editable={false}
                value={firstName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Contact Number <Text style={styles.optional}>(optional)</Text>
              </Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.inputInner}
                  placeholder="e.g. 0912-345-6789"
                  placeholderTextColor="#999"
                  keyboardType="phone-pad"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Create Password *</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.inputInner}
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
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm Password *</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.inputInner}
                  placeholder="Confirm Password"
                  placeholderTextColor="#999"
                  secureTextEntry={!showConfirm}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
                <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
                  <Feather
                    name={showConfirm ? "eye" : "eye-off"}
                    size={20}
                    color="#7F8C8D"
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>

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
                    • {e}
                  </Text>
                ))}
              </View>
            </View>
          )}

          <TouchableOpacity
            style={[styles.saveBtn, loading && { opacity: 0.7 }]}
            onPress={handleFinish}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Text style={styles.saveText}>Finish Setup</Text>
                <Ionicons
                  name="arrow-forward"
                  size={18}
                  color="white"
                  style={{ marginLeft: 8 }}
                />
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white" },
  scrollContent: { padding: 30, paddingBottom: 50 },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#0D2A94",
    marginBottom: 8,
  },
  subtitle: { fontSize: 14, color: "#666", marginBottom: 30 },
  avatarContainer: { alignItems: "center", marginBottom: 30 },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#F2F4F7",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DCDFE3",
    position: "relative",
    overflow: "hidden",
  },
  cameraBtn: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#0D2A94",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "white",
  },
  avatarLabel: {
    fontSize: 12,
    color: "#0D2A94",
    marginTop: 10,
    fontWeight: "500",
  },
  avatarImage: { width: 100, height: 100, borderRadius: 50 },
  photoNoteWrap: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#EEF1FF",
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
    gap: 6,
    maxWidth: 300,
  },
  photoNote: {
    flex: 1,
    fontSize: 12,
    color: "#2F459B",
    lineHeight: 17,
  },
  form: { width: "100%" },
  inputGroup: { marginBottom: 20 },
  label: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#0D2A94",
    marginBottom: 8,
  },
  optional: {
    fontSize: 12,
    fontWeight: "400",
    color: "#95A5A6",
  },
  input: {
    borderWidth: 1,
    borderColor: "#DCDFE3",
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    backgroundColor: "#F9FAFB",
    color: "#333",
  },
  inputInner: { flex: 1, fontSize: 16, color: "#333" },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DCDFE3",
    borderRadius: 8,
    paddingHorizontal: 15,
    height: 50,
    backgroundColor: "#F9FAFB",
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
  saveBtn: {
    backgroundColor: "#0D2A94",
    width: "100%",
    padding: 16,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    elevation: 2,
  },
  saveText: { color: "white", fontWeight: "bold", fontSize: 16 },
});
