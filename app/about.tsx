import ContentText from "@/components/ContentText";
import { useAppTheme } from "@/context/ThemeContext";
import {
  formatUpdated,
  getSiteContent,
  SiteContent,
} from "@/services/siteContentService";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function AboutScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const [content, setContent] = useState<SiteContent | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setContent(await getSiteContent(["about_tanglaw", "about_tarc"]));
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
        <Text style={styles.headerTitle}>About</Text>
        <View style={{ width: 24 }} />
      </View>

      {!content && !error ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
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

          <View style={styles.brand}>
            <Image
              source={require("../assets/icons/splash-icon-dark.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.brandName}>Tanglaw</Text>
            <Text style={styles.tagline}>
              &quot;Where a Dreamer Becomes an Achiever&quot;
            </Text>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="bulb-outline" size={26} color={colors.primary} />
              <Text style={styles.sectionTitle}>About Tanglaw</Text>
            </View>
            <ContentText text={content?.about_tanglaw} />
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons
                name="school-outline"
                size={26}
                color={colors.primary}
              />
              <Text style={styles.sectionTitle}>About TARC</Text>
            </View>
            <ContentText text={content?.about_tarc} />
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
    brand: { alignItems: "center", marginBottom: 30 },
    logo: { width: 110, height: 110 },
    brandName: {
      fontSize: 24,
      fontWeight: "bold",
      color: colors.primary,
      marginTop: 4,
    },
    tagline: {
      fontSize: 13,
      color: colors.secondaryText,
      fontStyle: "italic",
      marginTop: 4,
    },
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
