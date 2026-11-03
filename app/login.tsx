import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  ImageSourcePropType,
  LayoutChangeEvent,
  Linking,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

function ContactModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const contacts = [
    {
      icon: "call-outline" as const,
      label: "Phone",
      value: "09516989114",
      action: () => Linking.openURL("tel:09516989114"),
      color: "#27ae60",
    },
    {
      icon: "mail-outline" as const,
      label: "Email",
      value: "teacheraonlinereview@gmail.com",
      action: () => Linking.openURL("mailto:teacheraonlinereview@gmail.com"),
      color: "#2F459B",
    },
    {
      icon: "logo-facebook" as const,
      label: "Facebook",
      value: "Teacher A Online Review Center",
      action: () =>
        Linking.openURL("https://www.facebook.com/share/17bs1gtAiq/"),
      color: "#0084FF",
    },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={contactStyles.overlay}>
        <View style={contactStyles.card}>
          <View style={contactStyles.cardHeader}>
            <View style={contactStyles.avatarCircle}>
              <Image
                source={require("../assets/icons/splash-icon-dark.png")}
                style={contactStyles.avatarImage}
                resizeMode="contain"
              />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={contactStyles.orgName}>Contact Us</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={contactStyles.divider} />

          {contacts.map((c) => (
            <TouchableOpacity
              key={c.label}
              style={contactStyles.contactRow}
              onPress={c.action}
              activeOpacity={0.7}
            >
              <View
                style={[
                  contactStyles.iconCircle,
                  { backgroundColor: c.color + "18" },
                ]}
              >
                <Ionicons name={c.icon} size={20} color={c.color} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={contactStyles.contactLabel}>{c.label}</Text>
                <Text style={contactStyles.contactValue}>{c.value}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#BDC3C7" />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  );
}

const SLIDES: { source: ImageSourcePropType; direction: "ltr" | "rtl" }[] = [
  { source: require("../assets/images/landing-1.png"), direction: "ltr" },
  { source: require("../assets/images/landing-2.png"), direction: "rtl" },
];
const PAN_MS = 9000;
const FADE_MS = 1000;
const BLUE_LAYER = "rgba(0, 22, 122, 0.62)";

function slideSize(source: ImageSourcePropType, boxW: number, boxH: number) {
  const { width: iw, height: ih } = Image.resolveAssetSource(source);
  const scale = Math.max(boxW / iw, boxH / ih);
  const width = iw * scale;
  const height = ih * scale;
  return {
    width,
    height,
    extra: Math.max(0, width - boxW),
    top: (boxH - height) / 2,
  };
}

function MovingBackground() {
  const [box, setBox] = useState({ w: 0, h: 0 });
  const opacity = useRef(
    SLIDES.map((_, i) => new Animated.Value(i === 0 ? 1 : 0)),
  ).current;
  const shift = useRef(SLIDES.map(() => new Animated.Value(0))).current;

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width !== box.w || height !== box.h) setBox({ w: width, h: height });
  };

  useEffect(() => {
    if (!box.w || !box.h) return;
    let stopped = false;
    let running: Animated.CompositeAnimation | null = null;

    const play = (i: number, prev: number | null) => {
      if (stopped) return;
      const { extra } = slideSize(SLIDES[i].source, box.w, box.h);
      const from = SLIDES[i].direction === "ltr" ? -extra : 0;
      const to = SLIDES[i].direction === "ltr" ? 0 : -extra;
      shift[i].setValue(from);

      const steps: Animated.CompositeAnimation[] = [
        Animated.timing(shift[i], {
          toValue: to,
          duration: PAN_MS,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ];
      if (prev !== null) {
        steps.push(
          Animated.timing(opacity[i], {
            toValue: 1,
            duration: FADE_MS,
            useNativeDriver: true,
          }),
          Animated.timing(opacity[prev], {
            toValue: 0,
            duration: FADE_MS,
            useNativeDriver: true,
          }),
        );
      }
      running = Animated.parallel(steps);
      running.start(({ finished }) => {
        if (finished) play((i + 1) % SLIDES.length, i);
      });
    };

    opacity.forEach((o, i) => o.setValue(i === 0 ? 1 : 0));
    play(0, null);
    return () => {
      stopped = true;
      running?.stop();
    };
  }, [box.w, box.h, opacity, shift]);

  return (
    <View
      style={StyleSheet.absoluteFill}
      onLayout={onLayout}
      pointerEvents="none"
    >
      {box.w > 0 &&
        SLIDES.map((slide, i) => {
          const size = slideSize(slide.source, box.w, box.h);
          return (
            <Animated.Image
              key={i}
              source={slide.source}
              style={{
                position: "absolute",
                left: 0,
                top: size.top,
                width: size.width,
                height: size.height,
                opacity: opacity[i],
                transform: [{ translateX: shift[i] }],
              }}
            />
          );
        })}
      <View
        style={[StyleSheet.absoluteFill, { backgroundColor: BLUE_LAYER }]}
      />
    </View>
  );
}

export default function LoginScreen() {
  const router = useRouter();
  const [contactVisible, setContactVisible] = useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.topSection}>
        <MovingBackground />
        <TouchableOpacity
          style={styles.floatingContactBtn}
          onPress={() => setContactVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="headset-outline" size={25} color="#2F459B" />
        </TouchableOpacity>
        <View style={styles.brand}>
          <View style={styles.logoCircle}>
            <Image
              source={require("../assets/icons/splash-icon-dark.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.brandName}>Tanglaw</Text>
        </View>
      </View>
      <View style={styles.bottomSection}>
        <View style={{ height: 50 }} />
        <SafeAreaView style={styles.innerContainer}>
          <Text style={styles.quoteText}>
            "Where a Dreamer Becomes an Achiever"
          </Text>
          <View style={{ height: 5 }} />

          <View style={styles.buttonContainer}>
            <View style={styles.buttonWrapper}>
              <TouchableOpacity
                style={styles.enrollBtn}
                onPress={() => router.push("/signin")}
              >
                <Text style={styles.enrollText}>Sign-in</Text>
              </TouchableOpacity>
              <Text style={styles.subLabel}>For Existing users</Text>
            </View>

            <View style={styles.buttonWrapper}>
              <TouchableOpacity
                style={styles.signInBtn}
                onPress={() => router.push("/enroll")}
              >
                <Text style={styles.signInText}>Enroll Now</Text>
              </TouchableOpacity>
              <Text style={styles.subLabel}>For New users</Text>
            </View>
          </View>

          <TouchableOpacity onPress={() => router.push("/code")}>
            <Text style={styles.enrollCodeLink}>Use Enrollment Code</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>

      <ContactModal
        visible={contactVisible}
        onClose={() => setContactVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  topSection: {
    flex: 1.3,
    backgroundColor: "#00167a",
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 30,
    paddingBottom: 40,
    overflow: "hidden",
  },
  brand: { alignItems: "center" },
  logoCircle: {
    width: 130,
    height: 130,
    borderRadius: 80,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  logoImage: { width: 240, height: 240, transform: [{ translateX: -2 }] },
  brandName: {
    marginTop: 14,
    color: "white",
    fontSize: 32,
    fontWeight: "bold",
    letterSpacing: 1,
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  bottomSection: {
    flex: 1,
    backgroundColor: "white",
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    marginTop: -40,
    paddingHorizontal: 30,
    paddingBottom: 40,
  },
  innerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 30,
    paddingTop: 20,
  },
  quoteText: {
    fontSize: 22,
    fontWeight: "bold",
    fontStyle: "italic",
    textAlign: "center",
  },
  buttonContainer: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-between",
  },
  buttonWrapper: { alignItems: "center", width: "48%" },
  signInBtn: {
    width: "100%",
    padding: 15,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#2F459B",
    alignItems: "center",
  },
  signInText: { color: "#2F459B", fontWeight: "bold", fontSize: 16 },
  enrollBtn: {
    width: "100%",
    padding: 15,
    borderRadius: 8,
    backgroundColor: "#2F459B",
    alignItems: "center",
  },
  enrollText: { color: "white", fontWeight: "bold", fontSize: 16 },
  subLabel: { fontSize: 12, color: "black", marginTop: 5, fontWeight: "500" },
  enrollCodeLink: {
    color: "#2F459B",
    textDecorationLine: "underline",
    fontWeight: "bold",
    fontSize: 16,
  },
  floatingContactBtn: {
    position: "absolute",
    top: 30,
    right: 20,
    width: 42,
    height: 42,
    borderRadius: 24,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    zIndex: 10,
  },
});

const contactStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarImage: {
    width: 85,
    height: 85,
  },
  orgName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1A1A2E",
  },
  divider: {
    height: 1,
    backgroundColor: "#F0F0F0",
    marginBottom: 16,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F8F8F8",
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  contactLabel: {
    fontSize: 11,
    color: "#95A5A6",
    fontWeight: "500",
  },
  contactValue: {
    fontSize: 14,
    color: "#1A1A2E",
    fontWeight: "600",
    marginTop: 1,
  },
});
