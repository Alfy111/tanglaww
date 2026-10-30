import { Ionicons } from "@expo/vector-icons";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export type LoginWarning = { title: string; message: string; locked: boolean };

export default function LoginWarningModal({
  warning,
  onClose,
  onReset,
}: {
  warning: LoginWarning | null;
  onClose: () => void;
  onReset: () => void;
}) {
  return (
    <Modal
      visible={!!warning}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View
            style={[styles.iconWrap, warning?.locked && styles.iconWrapLocked]}
          >
            <Ionicons
              name={warning?.locked ? "lock-closed" : "warning"}
              size={30}
              color={warning?.locked ? "#E74C3C" : "#F39C12"}
            />
          </View>
          <Text style={styles.title}>{warning?.title}</Text>
          <Text style={styles.message}>{warning?.message}</Text>

          <TouchableOpacity onPress={onReset} style={styles.resetLink}>
            <Text style={styles.resetText}>
              Forgot password? <Text style={styles.resetBold}>Reset here</Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.okBtn} onPress={onClose}>
            <Text style={styles.okText}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  card: {
    width: "100%",
    backgroundColor: "white",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FFF4E0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  iconWrapLocked: { backgroundColor: "#FDECEA" },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1A1A2E",
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    color: "#555",
    textAlign: "center",
    lineHeight: 20,
    marginTop: 8,
  },
  resetLink: { marginTop: 14, padding: 4 },
  resetText: { fontSize: 13, color: "#666" },
  resetBold: {
    color: "#0D2A94",
    fontWeight: "bold",
    textDecorationLine: "underline",
  },
  okBtn: {
    marginTop: 18,
    backgroundColor: "#0D2A94",
    borderRadius: 10,
    paddingVertical: 12,
    width: "100%",
    alignItems: "center",
  },
  okText: { color: "white", fontWeight: "bold", fontSize: 15 },
});
