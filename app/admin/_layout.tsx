import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="signin" />
      <Stack.Screen name="index" />
      <Stack.Screen name="audit" />
      <Stack.Screen name="registry" />
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="approval" />
      <Stack.Screen name="hamburger" />
      <Stack.Screen name="registrant/[id]" />
      <Stack.Screen name="todo" />
      <Stack.Screen name="add-event" />
      <Stack.Screen name="notification" />
      <Stack.Screen name="announcements" />
      <Stack.Screen name="affirmations" />
      <Stack.Screen name="carousel" />
      <Stack.Screen name="activate" />
    </Stack>
  );
}
