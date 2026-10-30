import { Ionicons } from "@expo/vector-icons";
import { ReactNode, useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import DraggableList from "./DraggableList";

const ROW_HEIGHT = 64;

export type ReorderItem = {
  key: string;
  id: number;
  title: string;
  icon: ReactNode;
};

export default function MaterialReorder({
  items,
  onSave,
  onCancel,
}: {
  items: ReorderItem[];
  onSave: (ids: number[]) => Promise<void>;
  onCancel: () => void;
}) {
  const [order, setOrder] = useState<ReorderItem[]>(items);
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await onSave(order.map((i) => i.id));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.bar}>
        <Text style={styles.hint}>Hold ☰ and drag to change the order</Text>
        <TouchableOpacity
          onPress={onCancel}
          style={styles.cancelBtn}
          disabled={saving}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={save}
          style={styles.saveBtn}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.saveText}>Save Order</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        scrollEnabled={!dragging}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        <DraggableList
          data={order}
          rowHeight={ROW_HEIGHT}
          onReorder={setOrder}
          onDragStateChange={setDragging}
          renderHandle={() => (
            <Ionicons name="reorder-three" size={26} color="#7F8C8D" />
          )}
          renderRow={(item, handle, isActive) => (
            <View style={[styles.row, isActive && styles.rowActive]}>
              {handle}
              <View style={styles.icon}>{item.icon}</View>
              <Text style={styles.title} numberOfLines={2}>
                {item.title}
              </Text>
            </View>
          )}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  hint: { flex: 1, fontSize: 12, color: "#777" },
  cancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#BDC3C7",
  },
  cancelText: { fontSize: 12, color: "#555", fontWeight: "600" },
  saveBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    backgroundColor: "#2F459B",
    minWidth: 86,
    alignItems: "center",
  },
  saveText: { fontSize: 12, color: "white", fontWeight: "bold" },
  listContent: { padding: 20, paddingBottom: 100 },
  row: {
    height: ROW_HEIGHT - 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F8F9FC",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E8ECF4",
    paddingHorizontal: 12,
  },
  rowActive: { backgroundColor: "white", borderColor: "#2F459B" },
  icon: { width: 30, alignItems: "center" },
  title: { flex: 1, fontSize: 13, fontWeight: "600", color: "#1A1A2E" },
});
