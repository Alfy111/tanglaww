import { AdminProvider } from "@/context/AdminContext";
import {
  clearLocalSession,
  generateSessionToken,
  registerSession,
  validateSession,
} from "@/lib/session";
import { supabase } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";
import { Stack, usePathname, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, View } from "react-native";
import Toast, { BaseToast, ToastConfig } from "react-native-toast-message";

const toastConfig: ToastConfig = {
  warning: (props) => (
    <BaseToast {...props} style={{ borderLeftColor: "#FFB800" }} />
  ),
};

type Role = "student" | "admin" | null;

export let setGateValidating: (v: boolean) => void = () => {};
export let triggerRoleCheck: (userId: string) => Promise<void> = async () => {};

const AUTH_ROUTES = [
  "/login",
  "/signin",
  "/enroll",
  "/code",
  "/profilesetup",
  "/welcome",
  "/admin/signin",
  "/admin/activate",
  "/succes",
  "/resetpass",
  "/forgotpass",
];

const SESSION_CHECK_MS = 15_000;

function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [initializing, setInitializing] = useState(true);
  const [resolvingRole, setResolvingRole] = useState(false);
  const [validating, setValidating] = useState(false);

  const roleRef = useRef<Role>(null);
  const validatingRef = useRef(false);
  const fetchingRole = useRef(false);
  const kickingRef = useRef(false);

  const applyRole = (r: Role) => {
    roleRef.current = r;
    setRole(r);
  };

  const setValidatingBoth = (v: boolean) => {
    validatingRef.current = v;
    setValidating(v);
  };

  const kickStudent = async () => {
    if (kickingRef.current) return;
    kickingRef.current = true;
    try {
      await clearLocalSession();
      await supabase.auth.signOut({ scope: "local" });
    } finally {
      setSession(null);
      applyRole(null);
      kickingRef.current = false;
      Toast.show({
        type: "warning",
        text1: "You've been signed out",
        text2: "Your account was signed in on another device.",
        position: "bottom",
        visibilityTime: 6000,
      });
    }
  };

  const kickWithdrawn = async () => {
    if (kickingRef.current) return;
    kickingRef.current = true;
    try {
      await clearLocalSession();
      await supabase.auth.signOut({ scope: "local" });
    } finally {
      setSession(null);
      applyRole(null);
      kickingRef.current = false;
      Toast.show({
        type: "warning",
        text1: "You've been signed out",
        text2: "Your enrollment has been withdrawn. Please contact the admin.",
        position: "bottom",
        visibilityTime: 6000,
      });
    }
  };

  const isWithdrawn = async () => {
    try {
      const { data } = await supabase.rpc("my_enrollment_status");
      return data === "withdrawn";
    } catch {
      return false;
    }
  };

  const checkStudentSession = async () => {
    if (roleRef.current !== "student") return;
    if (await isWithdrawn()) {
      await kickWithdrawn();
      return;
    }
    try {
      const { valid, studentId } = await validateSession();
      if (studentId !== null && !valid) await kickStudent();
    } catch (err) {}
  };

  const fetchRole = async (userId: string) => {
    if (fetchingRole.current) return;
    fetchingRole.current = true;
    setResolvingRole(true);

    try {
      const { data: admin } = await supabase
        .from("admin")
        .select("admin_id")
        .eq("admin_id", userId)
        .maybeSingle();

      if (admin) {
        applyRole("admin");
        return;
      }

      const { data: student } = await supabase
        .from("student")
        .select("id")
        .eq("auth_id", userId)
        .maybeSingle();

      if (!student) {
        applyRole(null);
        return;
      }

      if (await isWithdrawn()) {
        await kickWithdrawn();
        return;
      }

      let result: { valid: boolean; studentId: number | null };
      try {
        result = await validateSession(student.id);
      } catch (err) {
        applyRole("student");
        return;
      }

      if (result.studentId === null) {
        const token = await generateSessionToken();
        await registerSession(student.id, token);
        applyRole("student");
        return;
      }

      if (!result.valid) {
        await kickStudent();
        return;
      }

      applyRole("student");
    } catch (err) {
    } finally {
      fetchingRole.current = false;
      setResolvingRole(false);
    }
  };

  useEffect(() => {
    setGateValidating = setValidatingBoth;
    triggerRoleCheck = (userId: string) => fetchRole(userId);

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        setSession(data.session);
        if (data.session?.user?.id) await fetchRole(data.session.user.id);
      } catch (err) {
      } finally {
        setInitializing(false);
      }
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      setTimeout(() => {
        if (event === "SIGNED_OUT") {
          setSession(null);
          applyRole(null);
          fetchingRole.current = false;
          if (validatingRef.current) setValidatingBoth(false);
          return;
        }
        if (newSession) setSession(newSession);
        if (
          event === "SIGNED_IN" &&
          newSession &&
          !validatingRef.current &&
          roleRef.current === null
        ) {
          fetchRole(newSession.user.id);
        }
      }, 0);
    });

    const appStateSubscription = AppState.addEventListener("change", (s) => {
      if (s === "active") checkStudentSession();
    });

    return () => {
      subscription.unsubscribe();
      appStateSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (role !== "student") return;
    const id = setInterval(checkStudentSession, SESSION_CHECK_MS);
    return () => clearInterval(id);
  }, [role]);

  useEffect(() => {
    if (initializing || resolvingRole || validating) return;

    const inAuthGroup = AUTH_ROUTES.includes(pathname);
    const inAdminGroup =
      pathname.startsWith("/admin") &&
      pathname !== "/admin/signin" &&
      pathname !== "/admin/activate";
    const inMaterialsGroup = pathname.startsWith("/materials");
    const inRegistrant = pathname.startsWith("/registrant");

    if (!session) {
      if (!inAuthGroup && !inRegistrant) router.replace("/login" as any);
      return;
    }

    if (role === "student") {
      if (inAdminGroup || (inAuthGroup && pathname !== "/succes"))
        router.replace("/homepage" as any);
    } else if (role === "admin") {
      if (!inAdminGroup && !inMaterialsGroup)
        router.replace("/admin/dashboard" as any);
    }
  }, [session, role, initializing, resolvingRole, validating, pathname]);

  if (initializing) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#0D2A94" />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <AdminProvider>
      <AuthGate>
        <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="welcome" />
          <Stack.Screen name="login" />
          <Stack.Screen name="signin" />
          <Stack.Screen name="enroll" />
          <Stack.Screen name="code" />
          <Stack.Screen name="profilesetup" />
          <Stack.Screen name="succes" />
          <Stack.Screen name="homepage" />
          <Stack.Screen name="admin" />
          <Stack.Screen name="registrant" />
          <Stack.Screen name="materials" />
          <Stack.Screen name="resetpass" />
          <Stack.Screen name="forgotpass" />
        </Stack>
      </AuthGate>
      <Toast config={toastConfig} />
    </AdminProvider>
  );
}
