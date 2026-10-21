import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import {
    addSlide,
    deleteSlide,
    getSlides,
    Slide,
    swapSlides,
} from "../../services/carouselService";

export default function AdminCarousel() {
  const router = useRouter();
  const [slides, setSlides] = useState<Slide[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSlides(await getSlides());
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Could not load photos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async () => {
    setAdding(true);
    try {
      const nextPosition = slides.length
        ? Math.max(...slides.map((s) => s.position)) + 1
        : 0;
      const added = await addSlide(nextPosition);
      if (added) await load();
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Could not add the photo.");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = (slide: Slide, number: number) => {
    Alert.alert("Delete Photo", `Remove photo ${number} from the dashboard?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setBusyId(slide.slide_id);
          try {
            await deleteSlide(slide);
            setSlides((prev) =>
              prev.filter((s) => s.slide_id !== slide.slide_id),
            );
          } catch (err: any) {
            Alert.alert("Error", err.message ?? "Could not delete.");
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  };

  const move = async (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= slides.length) return;
    setBusyId(slides[i].slide_id);
    try {
      const fixed = slides.map((s, k) => ({ ...s, position: k }));
      await swapSlides(fixed[i], fixed[j]);
      await load();
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Could not reorder.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dashboard Photos</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.infoSection}>
          <Ionicons name="images" size={40} color="#FFD75E" />
          <Text style={styles.infoTitle}>Carousel Photos</Text>
          <Text style={styles.infoSubtitle}>
            These photos slide on the dashboard of all students and admins. Wide
            photos (16:9) look best.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.addBtn, adding && { opacity: 0.7 }]}
          onPress={handleAdd}
          disabled={adding}
        >
          {adding ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="add" size={20} color="white" />
              <Text style={styles.addText}>Add Photo</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Current Photos ({slides.length})
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator color="#2F459B" style={{ marginTop: 20 }} />
        ) : slides.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="image-outline" size={36} color="#CCC" />
            <Text style={styles.emptyText}>
              No photos yet. The default dashboard image is shown.
            </Text>
          </View>
        ) : (
          slides.map((slide, i) => (
            <View key={slide.slide_id} style={styles.slideCard}>
              <Image source={{ uri: slide.image_url }} style={styles.thumb} />
              <Text style={styles.slideNo}>Photo {i + 1}</Text>

              {busyId === slide.slide_id ? (
                <ActivityIndicator
                  size="small"
                  color="#2F459B"
                  style={{ width: 96 }}
                />
              ) : (
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() => move(i, -1)}
                    disabled={i === 0}
                  >
                    <Ionicons
                      name="arrow-up"
                      size={18}
                      color={i === 0 ? "#DDD" : "#2F459B"}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() => move(i, 1)}
                    disabled={i === slides.length - 1}
                  >
                    <Ionicons
                      name="arrow-down"
                      size={18}
                      color={i === slides.length - 1 ? "#DDD" : "#2F459B"}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() => handleDelete(slide, i + 1)}
                  >
                    <Ionicons name="trash-outline" size={20} color="#E53935" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
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
  backBtn: { width: 40, height: 40, justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "black" },
  content: { padding: 25, paddingBottom: 40 },
  infoSection: {
    alignItems: "center",
    marginBottom: 25,
    backgroundColor: "#F8F9FA",
    padding: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#EEE",
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2F459B",
    marginTop: 10,
  },
  infoSubtitle: {
    fontSize: 13,
    color: "#666",
    textAlign: "center",
    marginTop: 5,
    lineHeight: 18,
  },
  addBtn: {
    backgroundColor: "#2F459B",
    padding: 18,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    elevation: 3,
    marginBottom: 30,
  },
  addText: { color: "white", fontWeight: "bold", fontSize: 16 },
  sectionHeader: {
    marginBottom: 16,
    borderTopWidth: 1,
    borderTopColor: "#EEE",
    paddingTop: 20,
  },
  sectionTitle: { fontSize: 16, fontWeight: "bold", color: "#2F459B" },
  emptyState: { alignItems: "center", paddingVertical: 30, gap: 8 },
  emptyText: { fontSize: 14, color: "#AAA", textAlign: "center" },
  slideCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EFEFEF",
    gap: 12,
  },
  thumb: { width: 96, height: 54, borderRadius: 8, backgroundColor: "#F2F4F7" },
  slideNo: { flex: 1, fontSize: 14, fontWeight: "600", color: "#1A1A2E" },
  actions: { flexDirection: "row" },
  iconBtn: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
});
