import AsyncStorage from "@react-native-async-storage/async-storage";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

export default function Index() {
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem("hasSeenWelcome").then((seen) => {
      setTarget(seen === "true" ? "/login" : "/welcome");
    });
  }, []);

  if (!target) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#0D2A94" />
      </View>
    );
  }

  return <Redirect href={target as any} />;
}
