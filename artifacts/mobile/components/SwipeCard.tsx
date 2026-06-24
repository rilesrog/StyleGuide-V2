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

interface SwipeCardProps {
  photoUrl: string;
  tags: string[];
  onSwipe: (liked: boolean) => void;
  isTop: boolean;
  index: number;
}

export function SwipeCard({ photoUrl, tags, onSwipe, isTop, index }: SwipeCardProps) {
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

  const likeOpacity = pan.x.interpolate({
    inputRange: [0, 80],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const nopeOpacity = pan.x.interpolate({
    inputRange: [-80, 0],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  const scale = isTop
    ? 1
    : Animated.add(
        new Animated.Value(0.93),
        Animated.multiply(pan.x, new Animated.Value(0))
      );

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

  const displayTags = tags.filter((t) => !["neutral", "warm", "light", "dark", "bright", "airy", "clean", "bold", "white"].includes(t)).slice(0, 2);

  return (
    <Animated.View style={cardStyle} {...(isTop ? panResponder.panHandlers : {})}>
      <Image source={{ uri: photoUrl }} style={styles.image} resizeMode="cover" />

      {isTop && (
        <>
          <Animated.View style={[styles.likeOverlay, { opacity: likeOpacity }]}>
            <Text style={styles.likeText}>LOVE IT</Text>
          </Animated.View>

          <Animated.View style={[styles.nopeOverlay, { opacity: nopeOpacity }]}>
            <Text style={styles.nopeText}>NOPE</Text>
          </Animated.View>
        </>
      )}

      <View style={[styles.tagsContainer, { backgroundColor: colors.background + "CC" }]}>
        {displayTags.map((tag) => (
          <View key={tag} style={[styles.tag, { backgroundColor: colors.primary + "20", borderColor: colors.primary + "50" }]}>
            <Text style={[styles.tagText, { color: colors.primary }]}>{tag}</Text>
          </View>
        ))}
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
  likeOverlay: {
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
  likeText: {
    color: "#4CAF7A",
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  nopeOverlay: {
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
  nopeText: {
    color: "#E05A45",
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  tagsContainer: {
    position: "absolute",
    bottom: 24,
    left: 16,
    right: 16,
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    textTransform: "capitalize",
  },
});
