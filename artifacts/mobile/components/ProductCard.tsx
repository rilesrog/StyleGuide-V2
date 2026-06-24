import React, { useRef } from "react";
import {
  Animated,
  Dimensions,
  Image,
  PanResponder,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;
const SWIPE_OUT_DURATION = 280;

interface ProductCardProps {
  product: {
    id: number;
    url: string;
    name: string;
    price: number;
    tags: string[];
    category: string;
    brand?: string | null;
  };
  onSwipe: (liked: boolean) => void;
  isTop: boolean;
}

export function ProductCard({ product, onSwipe, isTop }: ProductCardProps) {
  const colors = useColors();
  const pan = useRef(new Animated.ValueXY()).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => isTop,
      onMoveShouldSetPanResponder: () => isTop,
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > SWIPE_THRESHOLD) {
          swipeOut(true, gesture.dy);
        } else if (gesture.dx < -SWIPE_THRESHOLD) {
          swipeOut(false, gesture.dy);
        } else {
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
            friction: 5,
          }).start();
        }
      },
    })
  ).current;

  const swipeOut = (liked: boolean, dy: number) => {
    const x = liked ? SCREEN_WIDTH * 1.5 : -SCREEN_WIDTH * 1.5;
    Animated.timing(pan, {
      toValue: { x, y: dy },
      duration: SWIPE_OUT_DURATION,
      useNativeDriver: false,
    }).start(() => onSwipe(liked));
  };

  const rotate = pan.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ["-12deg", "0deg", "12deg"],
    extrapolate: "clamp",
  });

  const saveOpacity = pan.x.interpolate({
    inputRange: [0, 80],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const skipOpacity = pan.x.interpolate({
    inputRange: [-80, 0],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  const cardStyle = isTop
    ? [
        styles.card,
        {
          transform: [...pan.getTranslateTransform(), { rotate }],
          backgroundColor: colors.card,
        },
      ]
    : [
        styles.card,
        styles.behindCard,
        { transform: [{ scale: 0.94 }, { translateY: 12 }], backgroundColor: colors.card },
      ];

  const displayPrice = `$${product.price.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  const styleTags = (product.tags ?? [])
    .filter((t) => !["neutral", "warm", "light", "dark", "bright", "airy", "clean", "bold", "white"].includes(t))
    .slice(0, 2);

  return (
    <Animated.View style={cardStyle} {...(isTop ? panResponder.panHandlers : {})}>
      <Image source={{ uri: product.url }} style={styles.image} resizeMode="cover" />

      {isTop && (
        <>
          <Animated.View style={[styles.saveOverlay, { opacity: saveOpacity }]}>
            <Text style={styles.saveText}>SAVE</Text>
          </Animated.View>
          <Animated.View style={[styles.skipOverlay, { opacity: skipOpacity }]}>
            <Text style={styles.skipText}>SKIP</Text>
          </Animated.View>
        </>
      )}

      <View style={[styles.infoContainer, { backgroundColor: colors.background + "F0" }]}>
        <View style={styles.topRow}>
          <Text style={[styles.productName, { color: colors.foreground }]} numberOfLines={1}>
            {product.name}
          </Text>
          <Text style={[styles.price, { color: colors.primary }]}>{displayPrice}</Text>
        </View>
        <View style={styles.bottomRow}>
          <Text style={[styles.category, { color: colors.mutedForeground }]}>
            {product.category}
          </Text>
          <View style={styles.tagsRow}>
            {styleTags.map((tag) => (
              <View
                key={tag}
                style={[
                  styles.tag,
                  { backgroundColor: colors.primary + "20", borderColor: colors.primary + "40" },
                ]}
              >
                <Text style={[styles.tagText, { color: colors.primary }]}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: "absolute",
    width: SCREEN_WIDTH - 32,
    height: "100%",
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  behindCard: {
    zIndex: -1,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  saveOverlay: {
    position: "absolute",
    top: 48,
    left: 24,
    borderWidth: 4,
    borderColor: "#4CAF7A",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    transform: [{ rotate: "-15deg" }],
  },
  saveText: {
    color: "#4CAF7A",
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  skipOverlay: {
    position: "absolute",
    top: 48,
    right: 24,
    borderWidth: 4,
    borderColor: "#E05A45",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    transform: [{ rotate: "15deg" }],
  },
  skipText: {
    color: "#E05A45",
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  infoContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    gap: 6,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  productName: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
    marginRight: 12,
  },
  price: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  category: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textTransform: "capitalize",
  },
  tagsRow: {
    flexDirection: "row",
    gap: 6,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    textTransform: "capitalize",
  },
});
