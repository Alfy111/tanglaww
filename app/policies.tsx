import ContentText from "@/components/ContentText";
import { useAppTheme } from "@/context/ThemeContext";
import {
  formatUpdated,
  getSiteContent,
  SiteContent,
} from "@/services/siteContentService";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function PoliciesScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const [content, setContent] = useState<SiteContent | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setContent(await getSiteContent(["privacy_policy", "terms_of_use"]));
      setError("");
    } catch (e: any) {
      setError(e.message ?? "Could not load this page.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms & Policies</Text>
        <View style={{ width: 24 }} />
      </View>

      {!content && !error ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
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
              <MaterialCommunityIcons
                name="shield-check-outline"
                size={26}
                color={colors.primary}
              />
              <Text style={styles.sectionTitle}>Privacy Policy</Text>
            </View>
            <ContentText text={content?.privacy_policy} />
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons
                name="file-document-outline"
                size={26}
                color={colors.primary}
              />
              <Text style={styles.sectionTitle}>Terms of Use</Text>
            </View>
            <ContentText text={content?.terms_of_use} />
          </View>

          {!!content?.updatedAt && (
            <Text style={styles.updated}>
              {formatUpdated(content.updatedAt)}
            </Text>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

type ThemeColors = ReturnType<typeof useAppTheme>["colors"];

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
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
      color: colors.primary,
      marginLeft: 10,
    },
    updated: {
      fontSize: 12,
      color: colors.secondaryText,
      textAlign: "center",
      marginTop: 4,
    },
    error: { color: "#E74C3C", fontSize: 13, marginBottom: 16 },
  });
