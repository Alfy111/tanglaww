import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import {
    AdminRole,
    AdminTeam,
    cancelAdminInvite,
    getAdminTeam,
    ROLE_LABELS,
    sendAdminInvite,
    TeamInvite,
} from "../../services/adminInviteService";

const ROLE_COLORS: Record<AdminRole, { bg: string; text: string }> = {
  owner: { bg: "#FFF4E0", text: "#B26A00" },
  super_admin: { bg: "#EEF1FF", text: "#2F459B" },
  admin: { bg: "#F2F4F7", text: "#555" },
};

export default function ManageAdmins() {
  const router = useRouter();
  const [team, setTeam] = useState<AdminTeam | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "super_admin">("admin");
  const [sending, setSending] = useState(false);
  const [busyInvite, setBusyInvite] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setTeam(await getAdminTeam());
      setLoadError(null);
    } catch (err: any) {
      setLoadError(err.message ?? "Could not load admins.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSend = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      Alert.alert(
        "Error",
        "Please fill in the first name, last name and email.",
      );
      return;
    }
    setSending(true);
    try {
      await sendAdminInvite({
        email: email.trim().toLowerCase(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        role,
      });
      Alert.alert(
        "Invite sent!",
        `An activation code was emailed to ${email.trim()}. It expires in 3 days.`,
      );
      setFirstName("");
      setLastName("");
      setEmail("");
      setRole("admin");
      load();
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Could not send the invite.");
    } finally {
      setSending(false);
    }
  };

  const handleResend = async (inv: TeamInvite) => {
    setBusyInvite(inv.invite_id);
    try {
      await sendAdminInvite({
        email: inv.email,
        firstName: inv.firstName,
        lastName: inv.lastName,
        role: inv.role === "super_admin" ? "super_admin" : "admin",
      });
      Alert.alert(
        "Invite sent again",
        `A new code was emailed to ${inv.email}.`,
      );
      load();
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Could not resend.");
    } finally {
      setBusyInvite(null);
    }
  };

  const handleCancel = (inv: TeamInvite) => {
    Alert.alert(
      "Cancel Invite",
      `Cancel the invite for ${inv.email}? The code will stop working.`,
      [
        { text: "Keep", style: "cancel" },
        {
          text: "Cancel Invite",
          style: "destructive",
          onPress: async () => {
            setBusyInvite(inv.invite_id);
            try {
              await cancelAdminInvite(inv.invite_id);
              load();
            } catch (err: any) {
              Alert.alert("Error", err.message ?? "Could not cancel.");
            } finally {
              setBusyInvite(null);
            }
          },
        },
      ],
    );
  };

  const RoleBadge = ({ r }: { r: AdminRole }) => (
    <View style={[styles.roleBadge, { backgroundColor: ROLE_COLORS[r].bg }]}>
      <Text style={[styles.roleBadgeText, { color: ROLE_COLORS[r].text }]}>
        {ROLE_LABELS[r]}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Admins</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading && !team ? (
        <ActivityIndicator color="#2F459B" style={{ marginTop: 40 }} />
      ) : loadError ? (
        <View style={styles.blocked}>
          <Ionicons name="lock-closed-outline" size={40} color="#CCC" />
          <Text style={styles.blockedText}>{loadError}</Text>
        </View>
      ) : team ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.infoSection}>
              <Ionicons name="person-add" size={40} color="#FFD75E" />
              <Text style={styles.infoTitle}>Add an Admin</Text>
              <Text style={styles.infoSubtitle}>
                The new admin gets an activation code by email. They enter it
                under Admin Access → Activate admin account.
              </Text>
            </View>

            <View style={styles.form}>
              <Text style={styles.label}>First Name:</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Juan"
                value={firstName}
                onChangeText={setFirstName}
              />
              <Text style={styles.label}>Last Name:</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Dela Cruz"
                value={lastName}
                onChangeText={setLastName}
              />
              <Text style={styles.label}>Email:</Text>
              <TextInput
                style={styles.input}
                placeholder="email@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />

              {team.myRole === "owner" && (
                <>
                  <Text style={styles.label}>Role:</Text>
                  <View style={styles.roleRow}>
                    {(["admin", "super_admin"] as const).map((r) => (
                      <TouchableOpacity
                        key={r}
                        style={[
                          styles.roleOption,
                          role === r && styles.roleOptionActive,
                        ]}
                        onPress={() => setRole(r)}
                      >
                        <Text
                          style={[
                            styles.roleOptionText,
                            role === r && styles.roleOptionTextActive,
                          ]}
                        >
                          {ROLE_LABELS[r]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={styles.roleHint}>
                    Super admins can also add admins. Only the owner can add
                    super admins.
                  </Text>
                </>
              )}
            </View>

            <TouchableOpacity
              style={[styles.publishBtn, sending && { opacity: 0.7 }]}
              onPress={handleSend}
              disabled={sending}
            >
              {sending ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.publishText}>Send Invite</Text>
              )}
            </TouchableOpacity>

            {team.invites.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Pending Invites</Text>
                </View>
                {team.invites.map((inv) => (
                  <View key={inv.invite_id} style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle} numberOfLines={1}>
                        {inv.name}
                      </Text>
                      <Text style={styles.rowSub} numberOfLines={1}>
                        {inv.email}
                      </Text>
                      <Text style={styles.rowDate}>
                        Expires{" "}
                        {new Date(inv.expiresAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </Text>
                    </View>
                    <RoleBadge r={inv.role} />
                    {busyInvite === inv.invite_id ? (
                      <ActivityIndicator
                        size="small"
                        color="#2F459B"
                        style={{ width: 64 }}
                      />
                    ) : (
                      <>
                        <TouchableOpacity
                          style={styles.iconBtn}
                          onPress={() => handleResend(inv)}
                        >
                          <Ionicons name="refresh" size={20} color="#2F459B" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.iconBtn}
                          onPress={() => handleCancel(inv)}
                        >
                          <Ionicons
                            name="close-circle-outline"
                            size={20}
                            color="#E53935"
                          />
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                ))}
              </>
            )}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Admins ({team.admins.length})
              </Text>
            </View>
            {team.admins.map((a) => (
              <View key={a.admin_id} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {a.name}
                  </Text>
                  <Text style={styles.rowSub} numberOfLines={1}>
                    {a.email}
                  </Text>
                </View>
                <RoleBadge r={a.role} />
              </View>
            ))}
          </ScrollView>
        </KeyboardAvoidingView>
      ) : null}
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
  blocked: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
    gap: 10,
  },
  blockedText: { fontSize: 14, color: "#888", textAlign: "center" },
  infoSection: {
    alignItems: "center",
    marginBottom: 30,
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
  form: { marginBottom: 10 },
  label: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#2F459B",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#DCDFE3",
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    marginBottom: 20,
    color: "#333",
  },
  roleRow: { flexDirection: "row", gap: 10, marginBottom: 8 },
  roleOption: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#DCDFE3",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  roleOptionActive: { borderColor: "#2F459B", backgroundColor: "#EEF1FF" },
  roleOptionText: { fontSize: 14, color: "#666", fontWeight: "600" },
  roleOptionTextActive: { color: "#2F459B" },
  roleHint: { fontSize: 11, color: "#888", marginBottom: 20 },
  publishBtn: {
    backgroundColor: "#2F459B",
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    marginBottom: 35,
  },
  publishText: { color: "white", fontWeight: "bold", fontSize: 16 },
  sectionHeader: {
    marginBottom: 12,
    borderTopWidth: 1,
    borderTopColor: "#EEE",
    paddingTop: 20,
  },
  sectionTitle: { fontSize: 16, fontWeight: "bold", color: "#2F459B" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#EFEFEF",
    gap: 8,
  },
  rowTitle: { fontSize: 14, fontWeight: "600", color: "#1A1A2E" },
  rowSub: { fontSize: 12, color: "#888" },
  rowDate: { fontSize: 10, color: "#BBB", marginTop: 2 },
  roleBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  roleBadgeText: { fontSize: 11, fontWeight: "700" },
  iconBtn: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
});
