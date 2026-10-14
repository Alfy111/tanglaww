import { Ionicons } from "@expo/vector-icons";
import { useRef, useState } from "react";
import {
  Animated,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type MatchAnswer = Record<string, string>;
type Rect = { x: number; y: number; w: number; h: number };

const COLORS = {
  primary: "#0D2A94",
  border: "#C9D0DD",
  text: "#1A1A2E",
  muted: "#6B7280",
  hover: "#E3E9FF",
  filled: "#EEF1FB",
};

function DraggableChip({
  label,
  selected,
  onTap,
  onDragStart,
  onDragMove,
  onDrop,
}: {
  label: string;
  selected: boolean;
  onTap: () => void;
  onDragStart: () => void;
  onDragMove: (pageX: number, pageY: number) => void;
  onDrop: (pageX: number, pageY: number) => void;
}) {
  const pan = useRef(new Animated.ValueXY()).current;
  const [dragging, setDragging] = useState(false);
  const handlers = useRef({ onTap, onDragStart, onDragMove, onDrop });
  handlers.current = { onTap, onDragStart, onDragMove, onDrop };

  const snapBack = () =>
    Animated.spring(pan, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: false,
    }).start();

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        setDragging(true);
        handlers.current.onDragStart();
      },
      onPanResponderMove: (e, g) => {
        pan.setValue({ x: g.dx, y: g.dy });
        handlers.current.onDragMove(e.nativeEvent.pageX, e.nativeEvent.pageY);
      },
      onPanResponderRelease: (e, g) => {
        setDragging(false);
        const moved = Math.abs(g.dx) > 6 || Math.abs(g.dy) > 6;
        if (moved)
          handlers.current.onDrop(e.nativeEvent.pageX, e.nativeEvent.pageY);
        else handlers.current.onTap();
        snapBack();
      },
      onPanResponderTerminate: () => {
        setDragging(false);
        handlers.current.onDrop(-1, -1);
        snapBack();
      },
    }),
  ).current;

  return (
    <Animated.View
      {...responder.panHandlers}
      style={[
        styles.chip,
        selected && styles.chipSelected,
        dragging && styles.chipDragging,
        { transform: pan.getTranslateTransform() },
      ]}
    >
      <Ionicons
        name="reorder-two"
        size={14}
        color={selected ? "white" : COLORS.muted}
      />
      <Text style={[styles.chipText, selected && { color: "white" }]}>
        {label}
      </Text>
    </Animated.View>
  );
}

export default function MatchingBoard({
  items,
  options,
  value,
  onChange,
  onDraggingChange,
}: {
  items: { pair_id: number; leftText: string }[];
  options: string[];
  value: MatchAnswer;
  onChange: (next: MatchAnswer) => void;
  onDraggingChange?: (dragging: boolean) => void;
}) {
  const slotRefs = useRef<Record<string, View | null>>({});
  const slotRects = useRef<Record<string, Rect>>({});
  const hoveredRef = useRef<string | null>(null);
  const valueRef = useRef(value);
  valueRef.current = value;

  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const placed = new Set(Object.values(value));
  const pool = options.filter((o) => !placed.has(o));

  const measureSlots = () => {
    Object.entries(slotRefs.current).forEach(([key, ref]) => {
      ref?.measure((_x, _y, w, h, pageX, pageY) => {
        slotRects.current[key] = { x: pageX, y: pageY, w, h };
      });
    });
  };

  const slotAt = (px: number, py: number): string | null => {
    for (const [key, r] of Object.entries(slotRects.current)) {
      if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h)
        return key;
    }
    return null;
  };

  const place = (slotKey: string, option: string) => {
    const next: MatchAnswer = { ...valueRef.current };
    for (const k of Object.keys(next)) if (next[k] === option) delete next[k];
    next[slotKey] = option;
    onChange(next);
  };

  const clearSlot = (slotKey: string) => {
    const next: MatchAnswer = { ...valueRef.current };
    delete next[slotKey];
    onChange(next);
  };

  const updateHover = (key: string | null) => {
    if (hoveredRef.current === key) return;
    hoveredRef.current = key;
    setHovered(key);
  };

  return (
    <View>
      {items.map((item, i) => {
        const key = String(item.pair_id);
        const chosen = value[key];
        return (
          <View key={key} style={styles.row}>
            <Text style={styles.leftText}>
              {i + 1}. {item.leftText}
            </Text>
            <View
              ref={(r) => {
                slotRefs.current[key] = r;
              }}
              collapsable={false}
              style={[
                styles.slot,
                chosen ? styles.slotFilled : null,
                hovered === key && styles.slotHover,
              ]}
            >
              <TouchableOpacity
                style={styles.slotInner}
                onPress={() => {
                  if (selected) {
                    place(key, selected);
                    setSelected(null);
                  } else if (chosen) {
                    clearSlot(key);
                  }
                }}
              >
                {chosen ? (
                  <>
                    <Text style={styles.placedText}>{chosen}</Text>
                    <Ionicons
                      name="close-circle"
                      size={16}
                      color={COLORS.primary}
                    />
                  </>
                ) : (
                  <Text style={styles.slotHint}>
                    {selected ? "Tap to place here" : "Drop answer here"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        );
      })}

      <Text style={styles.poolLabel}>
        {pool.length > 0
          ? "Drag each answer to its match, or tap an answer and then a box."
          : "All answers placed. Tap a placed answer to take it back."}
      </Text>
      <View style={styles.pool}>
        {pool.map((option) => (
          <DraggableChip
            key={option}
            label={option}
            selected={selected === option}
            onTap={() => setSelected((s) => (s === option ? null : option))}
            onDragStart={() => {
              setSelected(null);
              measureSlots();
              onDraggingChange?.(true);
            }}
            onDragMove={(x, y) => updateHover(slotAt(x, y))}
            onDrop={(x, y) => {
              const key = slotAt(x, y);
              if (key) place(key, option);
              updateHover(null);
              onDraggingChange?.(false);
            }}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { marginBottom: 12 },
  leftText: { fontSize: 13, color: COLORS.text, marginBottom: 6 },
  slot: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: COLORS.border,
    borderRadius: 6,
    minHeight: 44,
  },
  slotFilled: {
    borderStyle: "solid",
    borderColor: COLORS.primary,
    backgroundColor: COLORS.filled,
  },
  slotHover: { borderColor: COLORS.primary, backgroundColor: COLORS.hover },
  slotInner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  slotHint: { fontSize: 12, color: "#9AA1AE" },
  placedText: { flex: 1, fontSize: 13, color: COLORS.text, fontWeight: "600" },

  poolLabel: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 10,
    marginBottom: 10,
  },
  pool: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "white",
  },
  chipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipDragging: {
    zIndex: 10,
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  chipText: { fontSize: 13, color: COLORS.text },
});
