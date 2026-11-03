import {
  Faq,
  getFaqs,
  getSiteContent,
  saveFaqs,
  saveSiteContent,
} from "@/services/siteContentService";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
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

type Tab = "FAQ" | "Contact";
type EditableFaq = Faq & { key: string };

const CONTACT_FIELDS = [
  { key: "contact_email", label: "Support Email", keyboard: "email-address" },
  { key: "contact_phone", label: "Phone Number", keyboard: "phone-pad" },
  {
    key: "contact_facebook_name",
    label: "Facebook Page Name",
    keyboard: "default",
  },
  {
    key: "contact_facebook_link",
    label: "Facebook Page Link",
    keyboard: "url",
  },
  {
    key: "contact_office",
    label: "Office Address (optional)",
    keyboard: "default",
  },
] as const;
type ContactKey = (typeof CONTACT_FIELDS)[number]["key"];

export default function AdminEditHelp() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("FAQ");
  const [faqs, setFaqs] = useState<EditableFaq[]>([]);
  const originalIds = useRef<(number | string)[]>([]);
  const [contactInfo, setContactInfo] = useState<Record<ContactKey, string>>({
    contact_email: "",
    contact_phone: "",
    contact_facebook_name: "",
    contact_facebook_link: "",
    contact_office: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([getFaqs(), getSiteContent(CONTACT_FIELDS.map((f) => f.key))])
      .then(([list, info]) => {
        setFaqs(list.map((f) => ({ ...f, key: String(f.faq_id) })));
        originalIds.current = list.map((f) => f.faq_id!).filter(Boolean);
        setContactInfo((prev) => {
          const next = { ...prev };
          CONTACT_FIELDS.forEach((f) => (next[f.key] = info[f.key] ?? ""));
          return next;
        });
      })
      .catch((e) => Alert.alert("Couldn't load", e.message))
      .finally(() => setLoading(false));
  }, []);

  const updateFaq = (key: string, field: "question" | "answer", text: string) =>
    setFaqs((prev) =>
      prev.map((f) => (f.key === key ? { ...f, [field]: text } : f)),
    );

  const addFaq = () =>
    setFaqs((prev) => [
      ...prev,
      { key: `new-${Date.now()}`, question: "", answer: "" },
    ]);

  const removeFaq = (item: EditableFaq) =>
    Alert.alert("Remove FAQ", `Remove "${item.question || "this question"}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () =>
          setFaqs((prev) => prev.filter((f) => f.key !== item.key)),
      },
    ]);

  const moveFaq = (index: number, dir: -1 | 1) =>
    setFaqs((prev) => {
      const next = [...prev];
      const to = index + dir;
      if (to < 0 || to >= next.length) return prev;
      [next[index], next[to]] = [next[to], next[index]];
      return next;
    });

  const handleSave = async () => {
    if (saving) return;
    const incomplete = faqs.some(
      (f) => !!f.question.trim() !== !!f.answer.trim(),
    );
    if (incomplete) {
      Alert.alert(
        "Incomplete FAQ",
        "Every FAQ needs both a question and an answer.",
      );
      setActiveTab("FAQ");
      return;
    }
    setSaving(true);
    try {
      await saveFaqs(faqs, originalIds.current);
      await saveSiteContent(contactInfo);
      Alert.alert("Saved", "Help & Support has been updated.", [
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
        <Text style={styles.headerTitle}>Edit Help & FAQ</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving || loading}>
          {saving ? (
            <ActivityIndicator color="#2F459B" />
          ) : (
            <Text style={styles.saveText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        {(["FAQ", "Contact"] as Tab[]).map((tab) => (
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
              {tab === "FAQ" ? "FAQs" : "Contact Us"}
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
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {activeTab === "FAQ" ? (
              <>
                {faqs.length === 0 && (
                  <Text style={styles.empty}>
                    No FAQs yet. Tap “Add FAQ” to start.
                  </Text>
                )}
                {faqs.map((item, index) => (
                  <View key={item.key} style={styles.faqCard}>
                    <View style={styles.faqTools}>
                      <Text style={styles.faqNumber}>FAQ {index + 1}</Text>
                      <View style={{ flexDirection: "row", gap: 14 }}>
                        <TouchableOpacity
                          onPress={() => moveFaq(index, -1)}
                          disabled={index === 0}
                        >
                          <Ionicons
                            name="arrow-up"
                            size={18}
                            color={index === 0 ? "#CCC" : "#2F459B"}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => moveFaq(index, 1)}
                          disabled={index === faqs.length - 1}
                        >
                          <Ionicons
                            name="arrow-down"
                            size={18}
                            color={
                              index === faqs.length - 1 ? "#CCC" : "#2F459B"
                            }
                          />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => removeFaq(item)}>
                          <Ionicons
                            name="trash-outline"
                            size={18}
                            color="#E74C3C"
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <Text style={styles.inputLabel}>Question</Text>
                    <TextInput
                      style={styles.input}
                      value={item.question}
                      placeholder="Type the question"
                      onChangeText={(txt) =>
                        updateFaq(item.key, "question", txt)
                      }
                    />
                    <Text style={styles.inputLabel}>Answer</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      multiline
                      value={item.answer}
                      placeholder="Type the answer"
                      onChangeText={(txt) => updateFaq(item.key, "answer", txt)}
                    />
                  </View>
                ))}
                <TouchableOpacity style={styles.addBtn} onPress={addFaq}>
                  <Ionicons
                    name="add-circle-outline"
                    size={20}
                    color="#2F459B"
                  />
                  <Text style={styles.addBtnText}>Add FAQ</Text>
                </TouchableOpacity>
              </>
            ) : (
              CONTACT_FIELDS.map((f) => (
                <View key={f.key} style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{f.label}</Text>
                  <TextInput
                    style={styles.input}
                    value={contactInfo[f.key]}
                    keyboardType={f.keyboard}
                    autoCapitalize={
                      f.keyboard === "default" ? "sentences" : "none"
                    }
                    onChangeText={(txt) =>
                      setContactInfo((prev) => ({ ...prev, [f.key]: txt }))
                    }
                  />
                </View>
              ))
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
  scrollContent: { padding: 20, paddingBottom: 40 },
  faqCard: {
    backgroundColor: "#F9F9F9",
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#EEE",
  },
  faqTools: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  faqNumber: { fontSize: 13, fontWeight: "bold", color: "#333" },
  inputGroup: { marginBottom: 20 },
  inputLabel: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#2F459B",
    marginBottom: 5,
    marginTop: 5,
  },
  input: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
  },
  textArea: { minHeight: 80, textAlignVertical: "top" },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2F459B",
    borderStyle: "dashed",
  },
  addBtnText: { color: "#2F459B", fontWeight: "bold", fontSize: 14 },
  empty: { fontSize: 14, color: "#999", fontStyle: "italic", marginBottom: 15 },
});
