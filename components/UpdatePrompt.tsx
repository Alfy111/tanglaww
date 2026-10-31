import { useEffect, useRef } from "react";
import { AppState, Alert, Platform } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import * as Updates from "expo-updates";

async function downloadAndApplyUpdate() {
  try {
    const result = await Updates.fetchUpdateAsync();
    if (!result.isNew) {
      Alert.alert(
        "Update unavailable",
        "The update could not be downloaded. Please try again later.",
      );
      return;
    }

    await Updates.reloadAsync();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Please try again later.";
    Alert.alert("Update failed", message);
  }
}

export default function UpdatePrompt() {
  const checking = useRef(false);
  const prompted = useRef(false);

  useEffect(() => {
    if (Platform.OS === "web" || !Updates.isEnabled) return undefined;

    let active = true;
    let lastCheckAt = 0;
    let previousState = AppState.currentState;

    const checkForUpdate = async () => {
      if (checking.current || prompted.current || Date.now() - lastCheckAt < 60_000) {
        return;
      }

      checking.current = true;
      lastCheckAt = Date.now();

      try {
        const network = await NetInfo.fetch();
        if (!active || network.isConnected === false || network.isInternetReachable === false) {
          return;
        }

        const result = await Updates.checkForUpdateAsync();
        if (!active || !result.isAvailable) return;

        prompted.current = true;
        Alert.alert(
          "App update available",
          "A compatible update is ready. Download and restart now?",
          [
            { text: "Later", style: "cancel" },
            {
              text: "Update now",
              onPress: () => void downloadAndApplyUpdate(),
            },
          ],
        );
      } catch (error) {
        if (!active) return;
        const message =
          error instanceof Error ? error.message : "Please try again later.";
        Alert.alert("Couldn't check for updates", message);
      } finally {
        checking.current = false;
      }
    };

    const startupCheck = setTimeout(() => void checkForUpdate(), 3_000);
    const appStateSubscription = AppState.addEventListener("change", (state) => {
      const returnedToForeground = state === "active" && previousState !== "active";
      previousState = state;
      if (returnedToForeground) void checkForUpdate();
    });

    return () => {
      active = false;
      clearTimeout(startupCheck);
      appStateSubscription.remove();
    };
  }, []);

  return null;
}
