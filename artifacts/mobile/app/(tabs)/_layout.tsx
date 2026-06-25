import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Feather, Ionicons } from "@expo/vector-icons";
import React from "react";
import { Platform, Pressable, StyleSheet, View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useUser } from "@/context/UserContext";

const VISIBLE_TABS = ["profile", "index", "boards"];

function CustomTabBar({ state, descriptors, navigation }: any) {
  const colors = useColors();
  const { quizCompleted } = useUser();
  const insets = useSafeAreaInsets();
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  if (!quizCompleted) return null;

  return (
    <View style={[
      styles.bar,
      {
        paddingBottom: insets.bottom,
        height: (isWeb ? 64 : 49) + insets.bottom,
        backgroundColor: isIOS ? "transparent" : colors.background,
        borderTopWidth: isWeb ? 1 : 0,
        borderTopColor: colors.border,
      },
    ]}>
      {isIOS && (
        <BlurView
          intensity={100}
          tint={isDark ? "dark" : "light"}
          style={StyleSheet.absoluteFill}
        />
      )}
      {state.routes
        .filter((r: any) => VISIBLE_TABS.includes(r.name))
        .map((route: any) => {
          const { options } = descriptors[route.key];
          const isFocused = state.routes[state.index].name === route.name;
          const color = isFocused ? colors.primary : colors.mutedForeground;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable key={route.key} onPress={onPress} style={styles.item}>
              {options.tabBarIcon?.({ color, size: 24, focused: isFocused })}
            </Pressable>
          );
        })}
    </View>
  );
}

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="profile">
        <Icon sf={{ default: "person", selected: "person.fill" }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "sparkles", selected: "sparkles.fill" }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="boards">
        <Icon sf={{ default: "square.grid.2x2", selected: "square.grid.2x2.fill" }} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const isIOS = Platform.OS === "ios";

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarShowLabel: false,
        tabBarLabelStyle: { height: 0, overflow: "hidden", fontSize: 0 },
      }}
    >
      <Tabs.Screen
        name="profile"
        options={{
          title: "",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="person" tintColor={color} size={24} />
            ) : (
              <Feather name="user" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: "",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="sparkles" tintColor={color} size={24} />
            ) : (
              <Ionicons name="sparkles-outline" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="boards"
        options={{
          title: "",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="square.grid.2x2" tintColor={color} size={24} />
            ) : (
              <Feather name="grid" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen name="shop" options={{ href: null }} />
      <Tabs.Screen name="matches" options={{ href: null }} />
      <Tabs.Screen name="board" options={{ href: null }} />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    elevation: 0,
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
