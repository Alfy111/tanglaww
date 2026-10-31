import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAdmin } from "../../context/AdminContext";
import { getStatus } from "../../services/enrollmentStatusService";

type SortOption = "alpha_asc" | "alpha_desc" | "id_asc" | "id_desc";
type StatusFilter =
  | "all"
  | "pending"
  | "partially_approved"
  | "approved"
  | "withdrawn"
  | "rejected";

const SORT_LABELS: Record<SortOption, string> = {
  alpha_asc: "Name (Ascending)",
  alpha_desc: "Name (Descending)",
  id_asc: "Student No. (Ascending)",
  id_desc: "Student No. (Descending)",
};

const STATUS_LABELS: Record<StatusFilter, string> = {
  all: "All Students",
  pending: "Pending",
  partially_approved: "Partially Approved",
  approved: "Approved",
  withdrawn: "Withdrawn",
  rejected: "Rejected",
};

const STATUS_COLORS: Record<StatusFilter, string> = {
  all: "#2F459B",
  pending: "#F39C12",
  partially_approved: "#2F80ED",
  approved: "#27ae60",
  withdrawn: "#7F8C8D",
  rejected: "#e74c3c",
};

function getEnrollmentStatus(item: any): StatusFilter {
  return getStatus(item);
}

export default function AdminRegistry() {
  const router = useRouter();
  const { students, loading } = useAdmin();

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("alpha_asc");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  const [pendingSort, setPendingSort] = useState<SortOption>("alpha_asc");
  const [pendingStatus, setPendingStatus] = useState<StatusFilter>("all");

  const filteredAndSorted = useMemo(() => {
    let result = students.filter((s) => {
      const fullName =
        `${s.student?.firstName ?? ""} ${s.student?.lastName ?? ""}`.toLowerCase();
      const email = s.student?.email?.toLowerCase() ?? "";
      const id = s.student?.id?.toString() ?? "";

      const matchesSearch =
        fullName.includes(search.toLowerCase()) ||
        email.includes(search.toLowerCase()) ||
        id.includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || getEnrollmentStatus(s) === statusFilter;

      return matchesSearch && matchesStatus;
    });

    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case "alpha_asc":
          return `${a.student?.firstName} ${a.student?.lastName}`.localeCompare(
            `${b.student?.firstName} ${b.student?.lastName}`,
          );
        case "alpha_desc":
          return `${b.student?.firstName} ${b.student?.lastName}`.localeCompare(
            `${a.student?.firstName} ${a.student?.lastName}`,
          );
        case "id_asc":
          return (a.student?.id ?? 0) - (b.student?.id ?? 0);
        case "id_desc":
          return (b.student?.id ?? 0) - (a.student?.id ?? 0);
        default:
          return 0;
      }
    });

    return result;
  }, [students, search, sortBy, statusFilter]);

  const hasActiveFilters = sortBy !== "alpha_asc" || statusFilter !== "all";

  const openFilterModal = () => {
    setPendingSort(sortBy);
    setPendingStatus(statusFilter);
    setFilterModalVisible(true);
  };

  const applyFilters = () => {
    setSortBy(pendingSort);
    setStatusFilter(pendingStatus);
    setFilterModalVisible(false);
  };

  const resetFilters = () => {
    setPendingSort("alpha_asc");
    setPendingStatus("all");
  };

  const renderItem = ({ item }: any) => {
    const status = getEnrollmentStatus(item);
    const statusColor = STATUS_COLORS[status];

    return (
      <TouchableOpacity
        style={styles.studentCard}
        onPress={() =>
          router.push({
            pathname: "/admin/registrant/[id]",
            params: {
              id: item.enrollment_id,
              name: `${item.student?.firstName} ${item.student?.lastName}`,
            },
          } as any)
        }
      >
        <View style={styles.avatar}>
          {item.student?.profilephotourl ? (
            <Image
              source={{ uri: item.student.profilephotourl }}
              style={styles.avatarImage}
            />
          ) : (
            <Ionicons name="person" size={22} color="#666" />
          )}
        </View>

        <View style={{ flex: 1, marginLeft: 15 }}>
          <Text style={styles.sName}>
            {item.student?.firstName} {item.student?.lastName}
          </Text>
          <Text style={styles.sSub}>
            {item.curriculum?.curriculumName} • {item.student?.email}
          </Text>
          <Text style={styles.sID}>Student No: {item.student?.id}</Text>
        </View>

        <Ionicons name="chevron-forward" size={18} color="#CCC" />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.title}>Student Registry</Text>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#999" />
          <TextInput
            placeholder="Search by name, email or ID"
            style={styles.input}
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#BBB"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={16} color="#BBB" />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.filterBtn, hasActiveFilters && styles.filterBtnActive]}
          onPress={openFilterModal}
        >
          <Ionicons
            name="options-outline"
            size={20}
            color={hasActiveFilters ? "white" : "#2F459B"}
          />
          {hasActiveFilters && <View style={styles.filterActiveDot} />}
        </TouchableOpacity>
      </View>

      <Text style={styles.countText}>
        {filteredAndSorted.length} student
        {filteredAndSorted.length !== 1 ? "s" : ""}
      </Text>

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#2F459B"
          style={{ marginTop: 40 }}
        />
      ) : filteredAndSorted.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="people-outline" size={48} color="#DDD" />
          <Text style={styles.emptyText}>No students found</Text>
        </View>
      ) : (
        <FlatList
          data={filteredAndSorted}
          renderItem={renderItem}
          keyExtractor={(item, index) =>
            item.student?.id?.toString() ?? index.toString()
          }
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal
        visible={filterModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter & Sort</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalSectionLabel}>Sort By</Text>
              {(Object.keys(SORT_LABELS) as SortOption[]).map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.optionRow,
                    pendingSort === option && styles.optionRowActive,
                  ]}
                  onPress={() => setPendingSort(option)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      pendingSort === option && styles.optionTextActive,
                    ]}
                  >
                    {SORT_LABELS[option]}
                  </Text>
                  {pendingSort === option && (
                    <Ionicons name="checkmark" size={18} color="#2F459B" />
                  )}
                </TouchableOpacity>
              ))}

              <Text style={[styles.modalSectionLabel, { marginTop: 20 }]}>
                Enrollment Status
              </Text>
              {(Object.keys(STATUS_LABELS) as StatusFilter[]).map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.optionRow,
                    pendingStatus === status && styles.optionRowActive,
                  ]}
                  onPress={() => setPendingStatus(status)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      pendingStatus === status && styles.optionTextActive,
                    ]}
                  >
                    {STATUS_LABELS[status]}
                  </Text>
                  {pendingStatus === status && (
                    <Ionicons name="checkmark" size={18} color="#2F459B" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.resetBtn} onPress={resetFilters}>
                <Text style={styles.resetBtnText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyBtn} onPress={applyFilters}>
                <Text style={styles.applyBtnText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white" },
  header: {
    backgroundColor: "#FFD75E",
    flexDirection: "row",
    padding: 20,
    alignItems: "center",
  },
  title: { fontSize: 18, fontWeight: "bold", marginLeft: 20 },

  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F0F0",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  input: { flex: 1, fontSize: 13, color: "#333" },
  filterBtn: {
    width: 42,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2F459B",
    justifyContent: "center",
    alignItems: "center",
  },
  filterBtnActive: {
    backgroundColor: "#2F459B",
    borderColor: "#2F459B",
  },
  filterActiveDot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#FFD75E",
  },

  countText: {
    fontSize: 12,
    color: "#999",
    paddingHorizontal: 20,
    paddingBottom: 6,
  },

  studentCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#EEE",
  },
  avatarImage: { width: 44, height: 44, borderRadius: 22 },
  sName: { fontWeight: "bold", color: "#2F459B", fontSize: 14 },
  sSub: { fontSize: 12, color: "#666", marginTop: 2 },
  sID: { fontSize: 11, color: "#999", marginTop: 2 },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  emptyText: { color: "#BBB", fontSize: 14 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: "75%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#1A1A2E" },
  modalSectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#AAA",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  optionRowActive: { backgroundColor: "#EEF1FF" },
  optionText: { fontSize: 14, color: "#555" },
  optionTextActive: { color: "#2F459B", fontWeight: "600" },
  modalFooter: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  resetBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#DDD",
    alignItems: "center",
  },
  resetBtnText: { fontSize: 14, color: "#777", fontWeight: "600" },
  applyBtn: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: 10,
    backgroundColor: "#2F459B",
    alignItems: "center",
  },
  applyBtnText: { fontSize: 14, color: "white", fontWeight: "bold" },
});
