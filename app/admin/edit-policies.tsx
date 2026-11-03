import {
  formatUpdated,
  getSiteContent,
  saveSiteContent,
} from "@/services/siteContentService";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

type Tab = "Privacy" | "Terms";
const TAB_LABELS: Record<Tab, string> = {
  Privacy: "Privacy Policy",
  Terms: "Terms of Use",
};

export default function AdminEditPolicies() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("Privacy");
  const [privacyPolicy, setPrivacyPolicy] = useState("");
  const [termsOfUse, setTermsOfUse] = useState("");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSiteContent(["privacy_policy", "terms_of_use"])
      .then((c) => {
        setPrivacyPolicy(c.privacy_policy ?? "");
        setTermsOfUse(c.terms_of_use ?? "");
        setUpdatedAt(c.updatedAt ?? null);
      })
      .catch((e) => Alert.alert("Couldn't load", e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await saveSiteContent({
        privacy_policy: privacyPolicy,
        terms_of_use: termsOfUse,
      });
      Alert.alert("Saved", "The Terms & Policies page has been updated.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert("Couldn't save", e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Legal & Policies</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving || loading}>
          {saving ? (
            <ActivityIndicator color="#2F459B" />
          ) : (
            <Text style={styles.saveText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        {(["Privacy", "Terms"] as Tab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.activeTabText,
              ]}
            >
              {TAB_LABELS[tab]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2F459B" />
        </View>
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Editing: {TAB_LABELS[activeTab]}</Text>
              <TextInput
                style={styles.textArea}
                multiline
                textAlignVertical="top"
                value={activeTab === "Privacy" ? privacyPolicy : termsOfUse}
                onChangeText={
                  activeTab === "Privacy" ? setPrivacyPolicy : setTermsOfUse
                }
                placeholder="Paste or type the policy here..."
              />
            </View>

            <View style={styles.warningBox}>
              <Ionicons name="alert-circle-outline" size={20} color="#E74C3C" />
              <Text style={styles.warningText}>
                Legal documents affect user rights. Make sure changes are
                approved by TARC management before saving. Leave a blank line
                between paragraphs, and start a line with &quot;- &quot; for a
                bullet.
              </Text>
            </View>
            {!!updatedAt && (
              <Text style={styles.updated}>{formatUpdated(updatedAt)}</Text>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white" },
  header: {
    backgroundColor: "#FFD75E",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    justifyContent: "space-between",
  },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "black" },
  saveText: { fontSize: 16, fontWeight: "bold", color: "#2F459B" },
  tabContainer: {
    flexDirection: "row",
    padding: 15,
    backgroundColor: "#F8F9FA",
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 8 },
  activeTab: { backgroundColor: "#2F459B" },
  tabText: { fontSize: 14, fontWeight: "bold", color: "#666" },
  activeTabText: { color: "white" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  scrollContent: { padding: 20 },
  inputContainer: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: "bold", color: "#333", marginBottom: 10 },
  textArea: {
    backgroundColor: "#F9F9F9",
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 12,
    padding: 15,
    fontSize: 15,
    color: "#333",
    minHeight: 400,
    lineHeight: 22,
  },
  infoBox: {
    flexDirection: "row",
    backgroundColor: "#F0F4FF",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  infoText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 12,
    color: "#2F459B",
    lineHeight: 18,
  },
  warningBox: {
    flexDirection: "row",
    backgroundColor: "#FFF5F5",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FFEBEB",
  },
  warningText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 12,
    color: "#E74C3C",
    lineHeight: 18,
  },
  updated: { fontSize: 12, color: "#999", textAlign: "center", marginTop: 14 },
});
