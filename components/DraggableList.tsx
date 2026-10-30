import { ReactNode, useEffect, useRef, useState } from "react";
import {
    Animated,
    PanResponder,
    PanResponderInstance,
    View,
} from "react-native";

type Props<T extends { key: string }> = {
  data: T[];
  rowHeight: number;
  renderRow: (item: T, handle: ReactNode, isActive: boolean) => ReactNode;
  renderHandle: () => ReactNode;
  onReorder: (data: T[]) => void;
  onDragStateChange?: (dragging: boolean) => void;
};

export default function DraggableList<T extends { key: string }>({
  data,
  rowHeight,
  renderRow,
  renderHandle,
  onReorder,
  onDragStateChange,
}: Props<T>) {
  const [order, setOrder] = useState<T[]>(data);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [target, setTarget] = useState(0);

  const orderRef = useRef(order);
  const startRef = useRef(0);
  const targetRef = useRef(0);
  const dy = useRef(new Animated.Value(0)).current;
  const responders = useRef(new Map<string, PanResponderInstance>()).current;
  const callbacks = useRef({ onReorder, onDragStateChange });
  callbacks.current = { onReorder, onDragStateChange };

  useEffect(() => {
    if (activeKey === null) {
      setOrder(data);
      orderRef.current = data;
    }
  }, [data]);

  const finish = () => {
    const list = [...orderRef.current];
    const [moved] = list.splice(startRef.current, 1);
    list.splice(targetRef.current, 0, moved);
    orderRef.current = list;
    setOrder(list);
    setActiveKey(null);
    dy.setValue(0);
    callbacks.current.onDragStateChange?.(false);
    if (startRef.current !== targetRef.current)
      callbacks.current.onReorder(list);
  };

  const responderFor = (key: string) => {
    let r = responders.get(key);
    if (r) return r;
    r = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        const index = orderRef.current.findIndex((i) => i.key === key);
        startRef.current = index;
        targetRef.current = index;
        setTarget(index);
        setActiveKey(key);
        dy.setValue(0);
        callbacks.current.onDragStateChange?.(true);
      },
      onPanResponderMove: (_, g) => {
        dy.setValue(g.dy);
        const last = orderRef.current.length - 1;
        const t = Math.max(
          0,
          Math.min(last, startRef.current + Math.round(g.dy / rowHeight)),
        );
        if (t !== targetRef.current) {
          targetRef.current = t;
          setTarget(t);
        }
      },
      onPanResponderRelease: finish,
      onPanResponderTerminate: finish,
    });
    responders.set(key, r);
    return r;
  };

  const start = startRef.current;

  return (
    <View style={{ height: order.length * rowHeight }}>
      {order.map((item, index) => {
        const isActive = item.key === activeKey;
        let shift = 0;
        if (activeKey !== null && !isActive) {
          if (start < target && index > start && index <= target)
            shift = -rowHeight;
          if (start > target && index >= target && index < start)
            shift = rowHeight;
        }

        const handle = (
          <View
            {...responderFor(item.key).panHandlers}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {renderHandle()}
          </View>
        );

        return (
          <Animated.View
            key={item.key}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              height: rowHeight,
              top: index * rowHeight + shift,
              zIndex: isActive ? 10 : 0,
              elevation: isActive ? 6 : 0,
              transform: isActive ? [{ translateY: dy }] : [],
            }}
          >
            {renderRow(item, handle, isActive)}
          </Animated.View>
        );
      })}
    </View>
  );
}
