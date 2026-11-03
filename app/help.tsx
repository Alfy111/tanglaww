import {
  Faq,
  getFaqs,
  getSiteContent,
  SiteContent,
  withHttps,
} from "@/services/siteContentService";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function HelpScreen() {
  const router = useRouter();
  const [faqs, setFaqs] = useState<Faq[] | null>(null);
  const [contact, setContact] = useState<SiteContent>({});
  const [openId, setOpenId] = useState<number | string | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [list, info] = await Promise.all([
        getFaqs(),
        getSiteContent([
          "contact_email",
          "contact_phone",
          "contact_office",
          "contact_facebook_name",
          "contact_facebook_link",
        ]),
      ]);
      setFaqs(list);
      setContact(info);
      setError("");
    } catch (e: any) {
      setFaqs([]);
      setError(e.message ?? "Could not load this page.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const contacts = [
    contact.contact_phone && {
      icon: "call-outline" as const,
      label: "Phone",
      value: contact.contact_phone,
      onPress: () => Linking.openURL(`tel:${contact.contact_phone}`),
    },
    contact.contact_email && {
      icon: "mail-outline" as const,
      label: "Email",
      value: contact.contact_email,
      onPress: () => Linking.openURL(`mailto:${contact.contact_email}`),
    },
    contact.contact_facebook_link && {
      icon: "logo-facebook" as const,
      label: "Facebook",
      value: contact.contact_facebook_name || "Message us on Facebook",
      onPress: () => Linking.openURL(withHttps(contact.contact_facebook_link!)),
    },
    contact.contact_office && {
      icon: "location-outline" as const,
      label: "Office",
      value: contact.contact_office,
      onPress: undefined,
    },
  ].filter(Boolean) as {
    icon: React.ComponentProps<typeof Ionicons>["name"];
    label: string;
    value: string;
    onPress?: () => void;
  }[];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={{ width: 24 }} />
      </View>

      {faqs === null ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#0D2A94" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await load();
                setRefreshing(false);
              }}
            />
          }
        >
          {!!error && <Text style={styles.error}>{error}</Text>}

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="help-circle-outline" size={26} color="#0D2A94" />
              <Text style={styles.sectionTitle}>FAQs</Text>
            </View>
            {faqs.length === 0 ? (
              <Text style={styles.empty}>No FAQs yet.</Text>
            ) : (
              faqs.map((f) => {
                const open = openId === f.faq_id;
                return (
                  <TouchableOpacity
                    key={f.faq_id}
                    style={[styles.faqCard, open && styles.faqCardOpen]}
                    activeOpacity={0.8}
                    onPress={() => setOpenId(open ? null : (f.faq_id ?? null))}
                  >
                    <View style={styles.faqRow}>
                      <Text style={styles.faqQuestion}>{f.question}</Text>
                      <Ionicons
                        name={open ? "chevron-up" : "chevron-down"}
                        size={18}
                        color="#0D2A94"
                      />
                    </View>
                    {open && <Text style={styles.faqAnswer}>{f.answer}</Text>}
                  </TouchableOpacity>
                );
              })
            )}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="call-outline" size={24} color="#0D2A94" />
              <Text style={styles.sectionTitle}>Contact Us</Text>
            </View>
            {contacts.length === 0 ? (
              <Text style={styles.empty}>No contact details yet.</Text>
            ) : (
              contacts.map((c) => (
                <TouchableOpacity
                  key={c.label}
                  style={styles.contactRow}
                  disabled={!c.onPress}
                  onPress={c.onPress}
                  activeOpacity={0.7}
                >
                  <View style={styles.iconCircle}>
                    <Ionicons name={c.icon} size={20} color="#0D2A94" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.contactLabel}>{c.label}</Text>
                    <Text style={styles.contactValue}>{c.value}</Text>
                  </View>
                  {!!c.onPress && (
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color="#BDC3C7"
                    />
                  )}
                </TouchableOpacity>
              ))
            )}
          </View>
        </ScrollView>
      )}
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
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { padding: 25 },
  section: { marginBottom: 30 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#0D2A94",
    marginLeft: 10,
  },
  faqCard: {
    borderWidth: 1,
    borderColor: "#E0E4EF",
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  faqCardOpen: { borderColor: "#0D2A94" },
  faqRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  faqQuestion: { flex: 1, fontSize: 15, fontWeight: "600", color: "#1A1A2E" },
  faqAnswer: { fontSize: 14, color: "#555", lineHeight: 21, marginTop: 10 },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F2F2F2",
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EEF1FF",
    justifyContent: "center",
    alignItems: "center",
  },
  contactLabel: { fontSize: 11, color: "#95A5A6", fontWeight: "500" },
  contactValue: {
    fontSize: 14,
    color: "#1A1A2E",
    fontWeight: "600",
    marginTop: 1,
  },
  empty: { fontSize: 14, color: "#999", fontStyle: "italic" },
  error: { color: "#E74C3C", fontSize: 13, marginBottom: 16 },
});
