import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    FlatList,
    Image,
    ImageSourcePropType,
    LayoutChangeEvent,
    NativeScrollEvent,
    NativeSyntheticEvent,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import { getSlides, Slide } from "../services/carouselService";

const FALLBACK = require("../assets/images/dashboard-image.png");
const AUTO_SLIDE_MS = 4000;

type Props = {
  height?: number;
  onEdit?: () => void;
  reloadKey?: number;
  dotColor?: string;
  activeDotColor?: string;
};

export default function DashboardCarousel({
  height = 200,
  onEdit,
  reloadKey = 0,
  dotColor = "#DCDFE3",
  activeDotColor = "#2F459B",
}: Props) {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<any>>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const indexRef = useRef(0);

  const load = useCallback(async () => {
    try {
      setSlides(await getSlides());
    } catch (e) {
      console.warn("[carousel] loading slides failed", e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );
  useEffect(() => {
    if (reloadKey) load();
  }, [reloadKey, load]);

  const items: { key: string; source: ImageSourcePropType }[] =
    slides.length > 0
      ? slides.map((s) => ({
          key: String(s.slide_id),
          source: { uri: s.image_url },
        }))
      : [{ key: "fallback", source: FALLBACK }];

  useEffect(() => {
    if (index >= items.length) {
      indexRef.current = 0;
      setIndex(0);
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
    }
  }, [items.length, index]);

  const goTo = useCallback(
    (i: number) => {
      if (!width) return;
      listRef.current?.scrollToOffset({ offset: i * width, animated: true });
      indexRef.current = i;
      setIndex(i);
    },
    [width],
  );

  const stopAuto = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const startAuto = useCallback(() => {
    stopAuto();
    if (items.length < 2 || !width) return;
    timerRef.current = setInterval(() => {
      goTo((indexRef.current + 1) % items.length);
    }, AUTO_SLIDE_MS);
  }, [items.length, width, goTo]);

  useEffect(() => {
    startAuto();
    return stopAuto;
  }, [startAuto]);

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!width) return;
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    indexRef.current = i;
    setIndex(i);
    startAuto();
  };

  const onLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (w && w !== width) setWidth(w);
  };

  return (
    <View>
      <View style={[styles.frame, { height }]} onLayout={onLayout}>
        {width > 0 && (
          <FlatList
            ref={listRef}
            data={items}
            keyExtractor={(it) => it.key}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScrollBeginDrag={stopAuto}
            onMomentumScrollEnd={onScrollEnd}
            getItemLayout={(_, i) => ({
              length: width,
              offset: width * i,
              index: i,
            })}
            renderItem={({ item }) => (
              <Image
                source={item.source}
                style={{ width, height }}
                resizeMode="cover"
              />
            )}
          />
        )}
        {onEdit && (
          <TouchableOpacity style={styles.editBtn} onPress={onEdit}>
            <Ionicons name="pencil-outline" size={16} color="black" />
          </TouchableOpacity>
        )}
      </View>

      {items.length > 1 && (
        <View style={styles.dots}>
          {items.map((it, i) => (
            <TouchableOpacity
              key={it.key}
              onPress={() => {
                goTo(i);
                startAuto();
              }}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            >
              <View
                style={[
                  styles.dot,
                  { backgroundColor: i === index ? activeDotColor : dotColor },
                  i === index && styles.activeDot,
                ]}
              />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#F2F4F7",
  },
  editBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 16,
    padding: 7,
  },
  dots: { flexDirection: "row", justifyContent: "center", marginTop: 12 },
  dot: { width: 8, height: 8, borderRadius: 4, marginHorizontal: 4 },
  activeDot: { width: 18 },
});
