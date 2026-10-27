import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function AddEventScreen() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [link, setLink] = useState("");
  const [eventDate, setEventDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!title.trim() || !eventDate) {
      Alert.alert("Error", "Please enter a title and date.");
      return;
    }

    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in.");

      const { error } = await supabase.from("calendar_events").insert({
        admin_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        link: link.trim() || null,
        event_date: eventDate.toISOString(),
      });

      if (error) throw new Error(error.message);

      Alert.alert(
        "Event Added!",
        "Students can now see this event on their calendar.",
      );
      router.back();
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const formattedDate = eventDate
    ? eventDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

  const formattedTime = eventDate
    ? eventDate.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Event</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.form}>
        <Text style={styles.label}>Event Title:</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. LET Express - Online Session"
          placeholderTextColor="#9AA0A6"
          value={title}
          onChangeText={setTitle}
        />

        <Text style={styles.label}>Description:</Text>
        <TextInput
          style={[styles.input, { height: 80, textAlignVertical: "top" }]}
          placeholder="Brief description of the event"
          placeholderTextColor="#9AA0A6"
          value={description}
          onChangeText={setDescription}
          multiline
        />

        <Text style={styles.label}>Meeting Link (optional):</Text>
        <TextInput
          style={styles.input}
          placeholder="zoommtg://zoom.us/join?confno=..."
          placeholderTextColor="#9AA0A6"
          value={link}
          onChangeText={setLink}
          autoCapitalize="none"
        />

        <Text style={styles.label}>Date:</Text>
        <TouchableOpacity
          style={styles.inputWithIcon}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={{ flex: 1, color: formattedDate ? "#333" : "#BDC3C7" }}>
            {formattedDate || "Select date"}
          </Text>
          <Ionicons name="calendar-outline" size={20} color="#FFD75E" />
        </TouchableOpacity>

        <Text style={styles.label}>Time:</Text>
        <TouchableOpacity
          style={styles.inputWithIcon}
          onPress={() => setShowTimePicker(true)}
        >
          <Text style={{ flex: 1, color: formattedTime ? "#333" : "#BDC3C7" }}>
            {formattedTime || "Select time"}
          </Text>
          <Ionicons name="time-outline" size={20} color="#FFD75E" />
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={eventDate ?? new Date()}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={(event, date) => {
              setShowDatePicker(false);
              if (date) {
                const updated = eventDate ? new Date(eventDate) : new Date();
                updated.setFullYear(
                  date.getFullYear(),
                  date.getMonth(),
                  date.getDate(),
                );
                setEventDate(updated);
              }
            }}
          />
        )}

        {showTimePicker && (
          <DateTimePicker
            value={eventDate ?? new Date()}
            mode="time"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={(event, date) => {
              setShowTimePicker(false);
              if (date) {
                const updated = eventDate ? new Date(eventDate) : new Date();
                updated.setHours(date.getHours(), date.getMinutes());
                setEventDate(updated);
              }
            }}
          />
        )}

        <TouchableOpacity
          style={[styles.saveButton, loading && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.saveButtonText}>Add Event</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    backgroundColor: "#FFD75E",
  },
  headerTitle: { fontSize: 18, fontWeight: "bold" },
  form: { padding: 20 },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#2F459B",
  },
  input: {
    borderWidth: 1,
    borderColor: "#EEE",
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    fontSize: 16,
  },
  inputWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EEE",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 20,
  },
  saveButton: {
    backgroundColor: "#2F459B",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  saveButtonText: { color: "white", fontWeight: "bold", fontSize: 16 },
});
