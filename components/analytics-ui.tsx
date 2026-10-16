import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
    FlatList,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ViewStyle,
} from "react-native";

export const C = {
  primary: "#0D2A94",
  yellow: "#FFB800",
  green: "#4CD964",
  red: "#FF4D4D",
  grey: "#BDC3C7",
  bg: "#F8F9FA",
  text: "#2C3E50",
  sub: "#7F8C8D",
  track: "#ECF0F1",
  chip: "#E0E6F8",
};

export const scoreColor = (v: number | null | undefined) =>
  v == null ? C.grey : v >= 75 ? C.green : v >= 60 ? C.yellow : C.red;

export const pct = (v: number | null | undefined) =>
  v == null ? "–" : `${Math.round(Number(v))}%`;

export const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

export function Header({
  title,
  onBack,
}: {
  title: string;
  onBack: () => void;
}) {
  return (
    <View style={s.header}>
      <TouchableOpacity style={{ padding: 4 }} onPress={onBack}>
        <Ionicons name="arrow-back" size={24} color="white" />
      </TouchableOpacity>
      <Text style={s.headerTitle}>{title}</Text>
      <View style={{ width: 24 }} />
    </View>
  );
}

export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: T; label: string }[];
  active: T;
  onChange: (key: T) => void;
}) {
  return (
    <View style={s.tabContainer}>
      {tabs.map((t) => (
        <TouchableOpacity
          key={t.key}
          style={[s.tab, active === t.key && s.activeTab]}
          onPress={() => onChange(t.key)}
        >
          <Text style={[s.tabText, active === t.key && s.activeTabText]}>
            {t.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export function Chips({
  items,
  selected,
  onSelect,
}: {
  items: { id: number; label: string }[];
  selected: number | null;
  onSelect: (id: number) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginBottom: 12 }}
    >
      {items.map((c) => (
        <TouchableOpacity
          key={c.id}
          style={[s.chip, selected === c.id && s.chipActive]}
          onPress={() => onSelect(c.id)}
        >
          <Text style={[s.chipText, selected === c.id && s.chipTextActive]}>
            {c.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

export function Card({
  title,
  subtitle,
  children,
  style,
  right,
}: {
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  right?: React.ReactNode;
}) {
  return (
    <View style={[s.card, style as ViewStyle]}>
      {title && (
        <View style={s.cardTitleRow}>
          <Text style={s.cardTitle}>{title}</Text>
          {right}
        </View>
      )}
      {subtitle && <Text style={s.subtitle}>{subtitle}</Text>}
      {children}
    </View>
  );
}

export function EmptyNote({ text }: { text: string }) {
  return <Text style={s.empty}>{text}</Text>;
}

export function ScoreStat({
  label,
  value,
  note,
}: {
  label: string;
  value: number | null;
  color?: string;
  note?: string;
}) {
  return (
    <View style={{ alignItems: "center" }}>
      <Text style={s.metricLabel}>{label}</Text>
      <Text style={s.scoreValue}>{pct(value)}</Text>
      <View style={s.scoreLine} />
      {note && <Text style={s.scoreNote}>{note}</Text>}
    </View>
  );
}

export function Dropdown<T extends string | number>({
  value,
  options,
  onChange,
  title,
}: {
  value: T | null;
  options: { key: T; label: string; sub?: string }[];
  onChange: (key: T) => void;
  title: string;
}) {
  const [open, setOpen] = React.useState(false);
  const selected = options.find((o) => o.key === value);
  return (
    <>
      <TouchableOpacity style={s.dropdown} onPress={() => setOpen(true)}>
        <Text style={s.dropdownText} numberOfLines={1}>
          {selected?.label ?? title}
        </Text>
        <Ionicons name="chevron-down" size={18} color={C.sub} />
      </TouchableOpacity>
      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>{title}</Text>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <Ionicons name="close" size={22} color={C.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={options}
              keyExtractor={(o) => String(o.key)}
              style={{ maxHeight: 460 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[s.option, item.key === value && s.optionActive]}
                  onPress={() => {
                    onChange(item.key);
                    setOpen(false);
                  }}
                >
                  <Text style={s.optionText}>{item.label}</Text>
                  {item.sub && <Text style={s.optionSub}>{item.sub}</Text>}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

export function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.statTile}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={s.statValue}>{value}</Text>
    </View>
  );
}

export function BarRow({
  label,
  value,
  color,
  note,
}: {
  label: string;
  value: number | null;
  color?: string;
  note?: string;
}) {
  const v = Math.max(0, Math.min(100, Number(value ?? 0)));
  return (
    <View style={{ marginVertical: 8 }}>
      <View style={s.barRow}>
        <Text style={s.barLabel} numberOfLines={1}>
          {label}
        </Text>
        <View style={s.barTrackWrap}>
          <View style={s.barTrack}>
            <View
              style={[
                s.barFill,
                { width: `${v}%`, backgroundColor: color ?? scoreColor(value) },
              ]}
            />
          </View>
        </View>
        <Text style={s.barValue}>{pct(value)}</Text>
      </View>
      {note && <Text style={s.barNote}>{note}</Text>}
    </View>
  );
}

export function ColumnChart({
  values,
  labels,
}: {
  values: (number | null)[];
  labels: string[];
}) {
  return (
    <View style={s.columns}>
      {values.map((v, i) => (
        <View key={i} style={s.columnWrap}>
          <Text style={s.columnTop}>{pct(v)}</Text>
          <View style={s.columnTrack}>
            <View
              style={[
                s.columnFill,
                {
                  height: `${Math.max(0, Math.min(100, Number(v ?? 0)))}%`,
                  backgroundColor: scoreColor(v),
                },
              ]}
            />
          </View>
          <Text style={s.columnLabel}>{labels[i]}</Text>
        </View>
      ))}
    </View>
  );
}

export function Histogram({ bins }: { bins: number[] }) {
  const step = Math.max(1, Math.ceil(Math.max(...bins, 1) / 2));
  const top = step * 2;
  const ticks = [0, step, top];
  const PLOT_H = 140;
  const SIDE = 22;

  return (
    <View>
      <View style={{ flexDirection: "row" }}>
        <View style={{ width: 26, height: PLOT_H }}>
          {ticks.map((t) => (
            <Text
              key={t}
              style={[s.histoTick, { bottom: (t / top) * PLOT_H - 6 }]}
            >
              {t}
            </Text>
          ))}
        </View>

        <View style={{ flex: 1, height: PLOT_H }}>
          {ticks.map((t) => (
            <View
              key={t}
              style={[
                s.gridLine,
                { bottom: (t / top) * PLOT_H },
                t === 0 && s.baseLine,
              ]}
            />
          ))}
          <View style={[s.histoBars, { paddingHorizontal: SIDE }]}>
            {bins.map((c, i) => (
              <View key={i} style={s.histoCol}>
                {c > 0 && <Text style={s.histoCount}>{c}</Text>}
                <View
                  style={[s.histoBar, { height: (c / top) * (PLOT_H - 16) }]}
                />
              </View>
            ))}
          </View>
        </View>
      </View>

      <View
        style={{
          marginLeft: 26 + SIDE,
          marginRight: SIDE,
          height: 16,
          marginTop: 4,
        }}
      >
        {[0, 20, 40, 60, 80, 100].map((n) => (
          <Text key={n} style={[s.histoLabel, { left: `${n}%` }]}>
            {n}
          </Text>
        ))}
      </View>
      <Text style={s.histoCaption}>Score (%) · number of students</Text>
    </View>
  );
}

export const s = StyleSheet.create({
  header: {
    backgroundColor: C.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  headerTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: C.primary,
    paddingBottom: 2,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },
  activeTab: { borderBottomColor: C.yellow },
  tabText: { color: "rgba(255,255,255,0.6)", fontSize: 14, fontWeight: "600" },
  activeTabText: { color: "white", fontWeight: "700" },

  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: C.chip,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  chipActive: { backgroundColor: C.primary },
  chipText: { fontSize: 13, color: C.primary, fontWeight: "600" },
  chipTextActive: { color: "white" },

  card: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  cardTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: C.text,
    marginBottom: 12,
  },
  subtitle: { fontSize: 12, color: C.sub, marginTop: -8, marginBottom: 12 },
  empty: {
    fontSize: 12,
    color: C.sub,
    fontStyle: "italic",
    paddingVertical: 6,
  },

  metricLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: C.sub,
    marginBottom: 4,
  },
  scoreValue: { fontSize: 22, fontWeight: "700", color: C.text, marginTop: 2 },
  scoreLine: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: C.primary,
    marginTop: 6,
  },
  scoreNote: { fontSize: 11, color: C.sub, marginTop: 6 },

  dropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  dropdownText: { flex: 1, fontSize: 13, color: C.text },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "white",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sheetTitle: { fontSize: 16, fontWeight: "700", color: C.primary },
  option: {
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  optionActive: { backgroundColor: "#EEF1FB" },
  optionText: { fontSize: 14, color: C.text, fontWeight: "600" },
  optionSub: { fontSize: 11, color: C.sub, marginTop: 2 },

  statTile: {
    flex: 1,
    backgroundColor: "#F4F6FB",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  statLabel: { fontSize: 11, fontWeight: "700", color: C.text },
  statValue: { fontSize: 13, color: C.text, marginTop: 4 },

  barRow: { flexDirection: "row", alignItems: "center" },
  barLabel: { flex: 3, fontSize: 13, color: "#34495E", fontWeight: "500" },
  barTrackWrap: { flex: 4, paddingHorizontal: 8 },
  barTrack: {
    height: 8,
    backgroundColor: C.track,
    borderRadius: 4,
    overflow: "hidden",
  },
  barFill: { height: "100%", borderRadius: 4 },
  barValue: {
    flex: 1.2,
    textAlign: "right",
    fontSize: 13,
    fontWeight: "600",
    color: C.text,
  },
  barNote: { fontSize: 11, color: C.sub, marginTop: 2 },

  columns: {
    flexDirection: "row",
    justifyContent: "space-around",
    height: 170,
    alignItems: "flex-end",
    paddingTop: 10,
  },
  columnWrap: { alignItems: "center", width: 44 },
  columnTop: { fontSize: 10, color: C.sub, marginBottom: 4 },
  columnTrack: {
    height: 120,
    width: 24,
    backgroundColor: "#F1F3F9",
    borderRadius: 6,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  columnFill: { width: "100%", borderRadius: 6 },
  columnLabel: { marginTop: 8, fontSize: 12, fontWeight: "600", color: C.sub },

  histoBars: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
    flexDirection: "row",
    alignItems: "flex-end",
  },
  histoCol: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    marginHorizontal: 1,
  },
  histoBar: { width: "100%", backgroundColor: C.primary },
  histoCount: { fontSize: 10, color: C.text, marginBottom: 2 },
  histoTick: { position: "absolute", right: 6, fontSize: 10, color: C.sub },
  gridLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "#E5E8EE",
  },
  baseLine: { backgroundColor: "#9AA1AE" },
  histoLabel: {
    position: "absolute",
    width: 30,
    marginLeft: -15,
    textAlign: "center",
    fontSize: 10,
    color: C.sub,
  },
  histoCaption: {
    fontSize: 11,
    color: C.sub,
    textAlign: "center",
    marginTop: 6,
    fontStyle: "italic",
  },
});
