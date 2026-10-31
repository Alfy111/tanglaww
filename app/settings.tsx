import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppTheme, type ThemeMode } from "@/context/ThemeContext";
import * as Updates from "expo-updates";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useNetInfo } from "@react-native-community/netinfo";

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, mode, setMode } = useAppTheme();
  const { isConnected, isInternetReachable } = useNetInfo();
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [updateStatus, setUpdateStatus] = useState<
    "idle" | "checking" | "downloading"
  >("idle");
  const themeOptions: {
    value: ThemeMode;
    label: string;
    icon: React.ComponentProps<typeof Ionicons>["name"];
  }[] = [
    { value: "light", label: "Light", icon: "sunny-outline" },
    { value: "dark", label: "Dark", icon: "moon-outline" },
    { value: "system", label: "System", icon: "phone-portrait-outline" },
  ];

  const selectTheme = async (value: ThemeMode) => {
    try {
      await setMode(value);
    } catch {
      Alert.alert("Theme not saved", "Please try selecting the theme again.");
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/homepage");
  };

  const downloadUpdate = async () => {
    setUpdateStatus("downloading");
    try {
      const result = await Updates.fetchUpdateAsync();
      if (!result.isNew) {
        Alert.alert(
          "Update unavailable",
          "The update could not be downloaded. Please try again.",
        );
        return;
      }
      await Updates.reloadAsync();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Please try again later.";
      Alert.alert("Update failed", message);
    } finally {
      setUpdateStatus("idle");
    }
  };

  const checkForUpdates = async () => {
    if (Platform.OS === "web") {
      Alert.alert(
        "Use the installed app",
        "App updates can be checked from an installed Android or iOS build.",
      );
      return;
    }
    if (!Updates.isEnabled) {
      Alert.alert(
        "Updates unavailable",
        "This build does not have over-the-air updates enabled. Install a new build configured for updates.",
      );
      return;
    }
    if (isConnected === false || isInternetReachable === false) {
      Alert.alert(
        "No internet connection",
        "Connect to the internet, then check for updates again.",
      );
      return;
    }

    setUpdateStatus("checking");
    try {
      const result = await Updates.checkForUpdateAsync();
      setUpdateStatus("idle");
      if (!result.isAvailable) {
        Alert.alert("You're up to date", "No app updates are available.");
        return;
      }

      Alert.alert(
        "Update available",
        "Download and restart the app now to install the latest update?",
        [
          { text: "Later", style: "cancel" },
          {
            text: "Update now",
            onPress: () => {
              void downloadUpdate();
            },
          },
        ],
      );
    } catch (error) {
      setUpdateStatus("idle");
      const message =
        error instanceof Error ? error.message : "Please try again later.";
      Alert.alert("Couldn't check for updates", message);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionLabel, { color: colors.secondaryText }]}>Account Settings</Text>
        <View style={styles.sectionGroup}>
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => router.push("/newpass")}
          >
            <View style={styles.itemLeft}>
              <Ionicons name="lock-closed-outline" size={22} color={colors.primary} />
              <Text style={[styles.itemText, { color: colors.text }]}>Change Password</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.secondaryText} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => router.push("/profile")}
          >
            <View style={styles.itemLeft}>
              <MaterialCommunityIcons
                name="account-details-outline"
                size={22}
                color={colors.primary}
              />
              <Text style={[styles.itemText, { color: colors.text }]}>Manage Account</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.secondaryText} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.secondaryText }]}>Notification Settings</Text>
        <View style={styles.sectionGroup}>
          <View style={styles.settingItemRow}>
            <View style={styles.itemLeft}>
              <Ionicons name="mail-outline" size={22} color={colors.primary} />
              <View style={styles.textStack}>
                <Text style={[styles.itemText, { color: colors.text }]}>Email Notifications</Text>
                <Text style={[styles.subText, { color: colors.secondaryText }]}>
                  Receive reminders and important updates directly through your
                  email.
                </Text>
              </View>
            </View>
            <Switch
              value={emailEnabled}
              onValueChange={setEmailEnabled}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="white"
            />
          </View>

          <View style={styles.settingItemRow}>
            <View style={styles.itemLeft}>
              <Ionicons
                name="notifications-outline"
                size={22}
                color={colors.primary}
              />
              <View style={styles.textStack}>
                <Text style={[styles.itemText, { color: colors.text }]}>Push Notifications</Text>
                <Text style={[styles.subText, { color: colors.secondaryText }]}>
                  Get instant alerts within the app for new schedules, quizzes,
                  and announcements.
                </Text>
              </View>
            </View>
            <Switch
              value={pushEnabled}
              onValueChange={setPushEnabled}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="white"
            />
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.secondaryText }]}>Preferences</Text>
        <View style={[styles.sectionGroup, styles.themeGroup, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.settingItem}>
            <View style={styles.itemLeft}>
              <Ionicons name="contrast-outline" size={22} color={colors.primary} />
              <View style={styles.textStack}>
                <Text style={[styles.itemText, { color: colors.text }]}>App Theme</Text>
                <Text style={[styles.subText, { color: colors.secondaryText }]}>
                  Choose light, dark, or follow your device setting.
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.themeOptions}>
            {themeOptions.map((option) => {
              const selected = mode === option.value;
              return (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  key={option.value}
                  onPress={() => selectTheme(option.value)}
                  style={[
                    styles.themeOption,
                    {
                      backgroundColor: selected ? colors.primary : colors.mutedSurface,
                      borderColor: selected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name={option.icon}
                    size={20}
                    color={selected ? "#FFFFFF" : colors.secondaryText}
                  />
                  <Text
                    style={[
                      styles.themeOptionText,
                      { color: selected ? "#FFFFFF" : colors.text },
                    ]}
                  >
                    {option.label}
                  </Text>
                  {selected && (
                    <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.secondaryText }]}>App Updates</Text>
        <View
          style={[
            styles.sectionGroup,
            styles.themeGroup,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={styles.settingItem}>
            <View style={styles.itemLeft}>
              <Ionicons name="cloud-download-outline" size={22} color={colors.primary} />
              <View style={styles.textStack}>
                <Text style={[styles.itemText, { color: colors.text }]}>
                  Software Update
                </Text>
                <Text style={[styles.subText, { color: colors.secondaryText }]}>
                  Tanglaw checks for compatible updates when you open or return to the app. You choose whether to download and restart.
                </Text>
              </View>
            </View>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            disabled={updateStatus !== "idle"}
            onPress={() => void checkForUpdates()}
            style={[
              styles.updateButton,
              { backgroundColor: colors.primary },
              updateStatus !== "idle" && styles.updateButtonDisabled,
            ]}
          >
            {updateStatus !== "idle" ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="refresh" size={18} color="#FFFFFF" />
            )}
            <Text style={styles.updateButtonText}>
              {updateStatus === "checking"
                ? "Checking..."
                : updateStatus === "downloading"
                  ? "Downloading update..."
                  : "Check for updates"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    backgroundColor: "#0D2A94",
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  headerTitle: {
    color: "white",
    fontSize: 22,
    fontWeight: "bold",
  },
  scrollContent: {
    padding: 20,
    flexGrow: 1,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 10,
    marginTop: 15,
  },
  sectionGroup: {
    marginBottom: 15,
  },
  themeGroup: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderWidth: 1,
    borderRadius: 12,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 15,
  },
  settingItemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingVertical: 15,
  },
  itemLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
    paddingRight: 10,
  },
  textStack: {
    marginLeft: 15,
    flex: 1,
    marginTop: -2,
  },
  itemText: {
    fontSize: 16,
    fontWeight: "500",
    lineHeight: 22,
  },
  subText: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  themeOptions: {
    flexDirection: "row",
    gap: 8,
    paddingBottom: 12,
  },
  themeOption: {
    minHeight: 74,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderRadius: 10,
  },
  themeOptionText: {
    fontSize: 12,
    fontWeight: "600",
  },
  updateButton: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  updateButtonDisabled: {
    opacity: 0.7,
  },
  updateButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
