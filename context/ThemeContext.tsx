import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Appearance,
  Platform,
  useColorScheme,
} from "react-native";

export type ThemeMode = "light" | "dark" | "system";
export type ColorScheme = "light" | "dark";

const THEME_STORAGE_KEY = "app-theme-mode";

const palettes = {
  light: {
    background: "#FFFFFF",
    surface: "#FFFFFF",
    text: "#333333",
    secondaryText: "#718096",
    border: "#E5E7EB",
    primary: "#0D2A94",
    mutedSurface: "#F5F7FB",
  },
  dark: {
    background: "#111827",
    surface: "#1F2937",
    text: "#F3F4F6",
    secondaryText: "#A7B0C0",
    border: "#374151",
    primary: "#93A9FF",
    mutedSurface: "#273449",
  },
} satisfies Record<ColorScheme, Record<string, string>>;

interface ThemeContextValue {
  mode: ThemeMode;
  colorScheme: ColorScheme;
  colors: (typeof palettes)[ColorScheme];
  setMode: (mode: ThemeMode) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isLightColor(color: string) {
  const channels = color.match(/[\d.]+/g)?.slice(0, 3).map(Number);
  return Boolean(
    channels &&
      channels.length === 3 &&
      Math.min(...channels) > 178 &&
      Math.max(...channels) - Math.min(...channels) < 58,
  );
}

function luminance(color: string) {
  const channels = color.match(/[\d.]+/g)?.slice(0, 3).map(Number);
  if (!channels || channels.length !== 3) return 255;
  return channels[0] * 0.299 + channels[1] * 0.587 + channels[2] * 0.114;
}

function nearestBackground(element: Element): string {
  let current: Element | null = element;
  while (current) {
    const background = window.getComputedStyle(current).backgroundColor;
    if (background !== "rgba(0, 0, 0, 0)" && background !== "transparent") {
      return background;
    }
    current = current.parentElement;
  }
  return window.getComputedStyle(document.body).backgroundColor;
}

function saveInlineStyle(element: HTMLElement, property: "background-color" | "color") {
  const value = element.style.getPropertyValue(property);
  const priority = element.style.getPropertyPriority(property);
  element.dataset[`themeOriginal${property === "color" ? "Color" : "Background"}`] =
    JSON.stringify({ value, priority });
}

function isCardSurface(element: HTMLElement) {
  const style = window.getComputedStyle(element);
  const radius = Number.parseFloat(style.borderTopLeftRadius) || 0;
  const hasShadow = style.boxShadow !== "none";
  const hasBorder =
    style.borderTopWidth !== "0px" ||
    style.borderRightWidth !== "0px" ||
    style.borderBottomWidth !== "0px" ||
    style.borderLeftWidth !== "0px";
  return radius >= 8 || hasShadow || hasBorder;
}

function restoreInlineStyle(
  element: HTMLElement,
  property: "background-color" | "color",
) {
  const key = `themeOriginal${property === "color" ? "Color" : "Background"}`;
  const original = element.dataset[key];
  if (original === undefined) return;
  const { value, priority } = JSON.parse(original) as {
    value: string;
    priority: string;
  };
  if (value) element.style.setProperty(property, value, priority);
  else element.style.removeProperty(property);
  delete element.dataset[key];
}

function applyWebTheme(element: Element, isDark: boolean) {
  if (!(element instanceof HTMLElement)) return;

  if (!isDark) {
    restoreInlineStyle(element, "background-color");
    restoreInlineStyle(element, "color");
    return;
  }

  if (element.dataset.themeOriginalBackground === undefined) {
    const background = window.getComputedStyle(element).backgroundColor;
    if (isLightColor(background)) {
      saveInlineStyle(element, "background-color");
      element.style.setProperty(
        "background-color",
        isCardSurface(element) ? "#1F2937" : "#111827",
        "important",
      );
    }
  }

  if (element.dataset.themeOriginalColor === undefined) {
    const color = window.getComputedStyle(element).color;
    if (
      luminance(color) < 92 &&
      luminance(nearestBackground(element)) < 165
    ) {
      saveInlineStyle(element, "color");
      element.style.setProperty("color", "#F3F4F6", "important");
    }
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((storedMode) => {
        if (
          active &&
          (storedMode === "light" ||
            storedMode === "dark" ||
            storedMode === "system")
        ) {
          setModeState(storedMode);
        }
      })
      .catch((error: unknown) => {
        console.error("Could not load the saved app theme.", error);
      });

    return () => {
      active = false;
    };
  }, []);

  const colorScheme: ColorScheme =
    mode === "system" ? (systemScheme === "dark" ? "dark" : "light") : mode;

  const setMode = useCallback(async (nextMode: ThemeMode) => {
    setModeState(nextMode);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, nextMode);
    } catch (error) {
      console.error("Could not save the selected app theme.", error);
      throw error;
    }
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") {
      Appearance.setColorScheme(mode === "system" ? "unspecified" : colorScheme);
      return undefined;
    }
    if (typeof document === "undefined") return undefined;

    document.documentElement.dataset.appTheme = colorScheme;
    document.body.dataset.appTheme = colorScheme;
    document.documentElement.style.colorScheme = colorScheme;
    if (colorScheme === "dark") {
      saveInlineStyle(document.body, "background-color");
      document.body.style.setProperty("background-color", "#111827", "important");
    } else {
      restoreInlineStyle(document.body, "background-color");
    }

    const updateTree = (node: Element) => {
      applyWebTheme(node, colorScheme === "dark");
      node.querySelectorAll("*").forEach((child) =>
        applyWebTheme(child, colorScheme === "dark"),
      );
    };

    updateTree(document.body);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof Element) updateTree(node);
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      delete document.documentElement.dataset.appTheme;
      delete document.body.dataset.appTheme;
      document.documentElement.style.colorScheme = "";
      restoreInlineStyle(document.body, "background-color");
      document.body.querySelectorAll("*").forEach((element) => {
        applyWebTheme(element, false);
      });
    };
  }, [colorScheme, mode]);

  const value = useMemo(
    () => ({ mode, colorScheme, colors: palettes[colorScheme], setMode }),
    [mode, colorScheme, setMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const theme = useContext(ThemeContext);
  if (!theme) {
    throw new Error("useAppTheme must be used within a ThemeProvider.");
  }
  return theme;
}
