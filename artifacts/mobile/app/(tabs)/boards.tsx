import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useUser } from "@/context/UserContext";
import { useSession } from "@/context/SessionContext";
import { useMode } from "@/context/ModeContext";
import { useQueryClient } from "@tanstack/react-query";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_SIZE = (SCREEN_WIDTH - 32 - 12) / 2;
const THUMB_SIZE = (CARD_SIZE - 2) / 2;
const PHOTO_THUMB = (SCREEN_WIDTH - 32 - 8) / 3;

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

type BoardSummary = {
  id: number;
  name: string;
  isDefault: boolean;
  itemCount: number;
  thumbnails: string[];
};

type StylePhoto = {
  id: number;
  url: string;
  tags: string[];
  source?: string;
};

type StyleBoardData = {
  photos: StylePhoto[];
  myPending?: StylePhoto[];
  theirPending?: StylePhoto[];
  matched?: StylePhoto[];
};

export default function BoardsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token, isLoggedIn } = useUser();
  const { session, isActive } = useSession();
  const { isRegistry } = useMode();
  const queryClient = useQueryClient();
  const topInset = insets.top + (Platform.OS === "web" ? 67 : 0);

  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const [creating, setCreating] = useState(false);

  const [styleBoard, setStyleBoard] = useState<StyleBoardData>({ photos: [] });
  const [styleBoardLoading, setStyleBoardLoading] = useState(false);

  const fetchBoards = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const resp = await fetch(`${API_BASE}/api/boards`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.ok) {
        const data = await resp.json();
        setBoards((data as { boards: BoardSummary[] }).boards ?? []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchStyleBoard = useCallback(async () => {
    if (!token) return;
    try {
      setStyleBoardLoading(true);
      const sessionParam = isRegistry && isActive && session?.id
        ? `?sessionId=${session.id}`
        : "";
      const resp = await fetch(`${API_BASE}/api/style-board${sessionParam}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.ok) {
        const data = await resp.json();
        setStyleBoard(data as StyleBoardData);
      }
    } catch {
      // silent
    } finally {
      setStyleBoardLoading(false);
    }
  }, [token, isRegistry, isActive, session?.id]);

  useFocusEffect(
    useCallback(() => {
      if (isLoggedIn) {
        fetchBoards();
        fetchStyleBoard();
      }
    }, [isLoggedIn, fetchBoards, fetchStyleBoard])
  );

  const handleCreateBoard = async () => {
    const name = newBoardName.trim();
    if (!name || !token) return;
    setCreating(true);
    try {
      const resp = await fetch(`${API_BASE}/api/boards`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name }),
      });
      if (resp.ok) {
        setNewBoardName("");
        setCreateModalVisible(false);
        await fetchBoards();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {
      // silent
    } finally {
      setCreating(false);
    }
  };

  const s = stylesheet(colors);

  if (!isLoggedIn) return null;

  const partnerName = session?.partner?.name ?? "Partner";
  const showPartnerBoard = isActive && session != null;
  const isRegistryWithPartner = isRegistry && isActive && session?.partner != null;

  const likedPhotos = styleBoard.photos ?? [];
  const myPendingPhotos = styleBoard.myPending ?? [];
  const theirPendingPhotos = styleBoard.theirPending ?? [];
  const matchedPhotos = styleBoard.matched ?? [];
  const hasPhotos = likedPhotos.length > 0;
  const hasSessionPhotos = myPendingPhotos.length > 0 || theirPendingPhotos.length > 0 || matchedPhotos.length > 0;

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          s.content,
          {
            paddingTop: topInset + 8,
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 80,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.headerRow}>
          <Text style={[s.headerTitle, { color: colors.foreground }]}>Boards</Text>
          <Pressable
            style={[s.fab, { backgroundColor: colors.primary }]}
            onPress={() => setCreateModalVisible(true)}
          >
            <Ionicons name="add" size={20} color={colors.primaryForeground} />
            <Text style={[s.fabText, { color: colors.primaryForeground }]}>New Board</Text>
          </Pressable>
        </View>

        {/* ── Style inspiration photos ── */}
        {styleBoardLoading && !hasPhotos ? null : hasPhotos ? (
          <>
            {isRegistryWithPartner ? (
              <>
                {/* Matched (Both Loved) section */}
                {matchedPhotos.length > 0 && (
                  <View style={s.photoSection}>
                    <View style={s.sectionHeader}>
                      <Ionicons name="heart" size={16} color={colors.primary} />
                      <Text style={[s.sectionTitle, { color: colors.foreground }]}>
                        Both Loved
                      </Text>
                      <View style={[s.pill, { backgroundColor: colors.primary }]}>
                        <Text style={[s.pillText, { color: colors.primaryForeground }]}>
                          {matchedPhotos.length}
                        </Text>
                      </View>
                    </View>
                    <Text style={[s.sectionSubtitle, { color: colors.mutedForeground }]}>
                      Photos you and {partnerName} both liked
                    </Text>
                    <PhotoGrid photos={matchedPhotos} thumbSize={PHOTO_THUMB} />
                  </View>
                )}

                {/* Partner liked, waiting for me */}
                {theirPendingPhotos.length > 0 && (
                  <View style={s.photoSection}>
                    <View style={s.sectionHeader}>
                      <Ionicons name="heart-outline" size={16} color={colors.primary} />
                      <Text style={[s.sectionTitle, { color: colors.foreground }]}>
                        {partnerName} loved — do you?
                      </Text>
                      <View style={[s.pill, { backgroundColor: colors.primary + "30" }]}>
                        <Text style={[s.pillText, { color: colors.primary }]}>
                          {theirPendingPhotos.length}
                        </Text>
                      </View>
                    </View>
                    <Text style={[s.sectionSubtitle, { color: colors.mutedForeground }]}>
                      {partnerName} liked these — find them in Discover to weigh in
                    </Text>
                    <PhotoGrid photos={theirPendingPhotos} thumbSize={PHOTO_THUMB} />
                  </View>
                )}

                {/* I liked, waiting for partner */}
                {myPendingPhotos.length > 0 && (
                  <View style={s.photoSection}>
                    <View style={s.sectionHeader}>
                      <Ionicons name="time-outline" size={16} color={colors.mutedForeground} />
                      <Text style={[s.sectionTitle, { color: colors.foreground }]}>
                        Waiting for {partnerName}
                      </Text>
                      <View style={[s.pill, { backgroundColor: colors.muted }]}>
                        <Text style={[s.pillText, { color: colors.mutedForeground }]}>
                          {myPendingPhotos.length}
                        </Text>
                      </View>
                    </View>
                    <Text style={[s.sectionSubtitle, { color: colors.mutedForeground }]}>
                      Photos you liked — waiting for {partnerName} to decide
                    </Text>
                    <PhotoGrid photos={myPendingPhotos} thumbSize={PHOTO_THUMB} dimmed />
                  </View>
                )}

                {!hasSessionPhotos && (
                  <View style={[s.photoEmpty, { borderColor: colors.border }]}>
                    <Ionicons name="heart-outline" size={32} color={colors.mutedForeground} />
                    <Text style={[s.photoEmptyText, { color: colors.mutedForeground }]}>
                      Swipe right on photos to start building your shared inspiration board with {partnerName}
                    </Text>
                  </View>
                )}
              </>
            ) : (
              /* Decoration mode or no partner — simple Liked section */
              <View style={s.photoSection}>
                <View style={s.sectionHeader}>
                  <Ionicons name="heart" size={16} color={colors.primary} />
                  <Text style={[s.sectionTitle, { color: colors.foreground }]}>
                    Liked Photos
                  </Text>
                  <View style={[s.pill, { backgroundColor: colors.primary }]}>
                    <Text style={[s.pillText, { color: colors.primaryForeground }]}>
                      {likedPhotos.length}
                    </Text>
                  </View>
                </View>
                <Text style={[s.sectionSubtitle, { color: colors.mutedForeground }]}>
                  Your style inspiration
                </Text>
                <PhotoGrid photos={likedPhotos} thumbSize={PHOTO_THUMB} />
              </View>
            )}
          </>
        ) : null}

        {/* ── Product boards ── */}
        <View style={s.sectionHeader}>
          <Ionicons name="albums-outline" size={16} color={colors.mutedForeground} />
          <Text style={[s.sectionTitle, { color: colors.foreground }]}>My Boards</Text>
        </View>

        {loading && boards.length === 0 ? (
          <View style={s.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <View style={s.grid}>
            {boards.map((board) => (
              <BoardCard
                key={board.id}
                name={board.name}
                itemCount={board.itemCount}
                thumbnails={board.thumbnails}
                isDefault={board.isDefault}
                colors={colors}
                onPress={() => router.push({ pathname: `/board/${board.id}`, params: { name: board.name } })}
              />
            ))}

            {showPartnerBoard && (
              <BoardCard
                name={`With ${partnerName}`}
                itemCount={-1}
                thumbnails={[]}
                isDefault={false}
                isPartner
                colors={colors}
                onPress={() => router.push(`/board/partner`)}
              />
            )}

            {boards.length === 0 && !showPartnerBoard && (
              <View style={[s.empty, { borderColor: colors.border }]}>
                <Ionicons name="images-outline" size={36} color={colors.mutedForeground} />
                <Text style={[s.emptyText, { color: colors.mutedForeground }]}>
                  Save products to see them here
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Create board modal */}
      <Modal
        visible={createModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <Pressable style={s.modalBackdrop} onPress={() => setCreateModalVisible(false)}>
          <Pressable style={[s.modalSheet, { backgroundColor: colors.card }]} onPress={() => {}}>
            <View style={[s.modalHandle, { backgroundColor: colors.border }]} />
            <View style={s.modalContent}>
              <Text style={[s.modalTitle, { color: colors.foreground }]}>New Board</Text>
              <TextInput
                style={[s.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.muted }]}
                placeholder="Board name…"
                placeholderTextColor={colors.mutedForeground}
                value={newBoardName}
                onChangeText={setNewBoardName}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleCreateBoard}
              />
              <Pressable
                style={[
                  s.createBtn,
                  { backgroundColor: newBoardName.trim() ? colors.primary : colors.border },
                ]}
                onPress={handleCreateBoard}
                disabled={!newBoardName.trim() || creating}
              >
                {creating ? (
                  <ActivityIndicator size="small" color={colors.primaryForeground} />
                ) : (
                  <Text style={[s.createBtnText, { color: newBoardName.trim() ? colors.primaryForeground : colors.mutedForeground }]}>
                    Create
                  </Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function PhotoGrid({
  photos,
  thumbSize,
  dimmed,
}: {
  photos: StylePhoto[];
  thumbSize: number;
  dimmed?: boolean;
}) {
  return (
    <View style={photoGridStyles.grid}>
      {photos.map((photo) => (
        <View
          key={photo.id}
          style={[
            photoGridStyles.thumbContainer,
            { width: thumbSize, height: thumbSize },
          ]}
        >
          <Image
            source={{ uri: photo.url }}
            style={[
              photoGridStyles.thumb,
              dimmed && { opacity: 0.55 },
            ]}
            resizeMode="cover"
          />
        </View>
      ))}
    </View>
  );
}

const photoGridStyles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  thumbContainer: {
    borderRadius: 8,
    overflow: "hidden",
  },
  thumb: {
    width: "100%",
    height: "100%",
  },
});

function BoardCard({
  name,
  itemCount,
  thumbnails,
  isDefault,
  isPartner,
  colors,
  onPress,
}: {
  name: string;
  itemCount: number;
  thumbnails: string[];
  isDefault: boolean;
  isPartner?: boolean;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
  onPress: () => void;
}) {
  const filled = thumbnails.slice(0, 4);
  while (filled.length < 4) filled.push("");

  return (
    <Pressable
      style={[styles.card, { backgroundColor: colors.card, width: CARD_SIZE }]}
      onPress={onPress}
    >
      <View style={styles.collage}>
        {filled.map((url, i) =>
          url ? (
            <Image
              key={i}
              source={{ uri: url }}
              style={[styles.thumb, { width: THUMB_SIZE, height: THUMB_SIZE }]}
              resizeMode="cover"
            />
          ) : (
            <View
              key={i}
              style={[
                styles.thumb,
                {
                  width: THUMB_SIZE,
                  height: THUMB_SIZE,
                  backgroundColor: colors.muted,
                  alignItems: "center",
                  justifyContent: "center",
                },
              ]}
            >
              {isPartner ? (
                <Ionicons name="heart" size={20} color={colors.primary} />
              ) : (
                <Ionicons name="image-outline" size={20} color={colors.mutedForeground} />
              )}
            </View>
          )
        )}
      </View>

      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
            {name}
          </Text>
          {isDefault && (
            <View style={[styles.badge, { backgroundColor: colors.primary + "20" }]}>
              <Text style={[styles.badgeText, { color: colors.primary }]}>Default</Text>
            </View>
          )}
          {isPartner && (
            <View style={[styles.badge, { backgroundColor: colors.primary + "20" }]}>
              <Ionicons name="heart" size={10} color={colors.primary} />
            </View>
          )}
        </View>
        <Text style={[styles.count, { color: colors.mutedForeground }]}>
          {isPartner ? "Mutual picks" : itemCount === 1 ? "1 item" : `${itemCount} items`}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: "hidden",
  },
  collage: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: "100%",
    aspectRatio: 1,
  },
  thumb: {},
  info: { padding: 10, gap: 2 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: { flex: 1, fontSize: 13, fontFamily: "Inter_600SemiBold" },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: { fontSize: 9, fontFamily: "Inter_600SemiBold" },
  count: { fontSize: 11, fontFamily: "Inter_400Regular" },
});

function stylesheet(colors: ReturnType<typeof import("@/hooks/useColors").useColors>) {
  return StyleSheet.create({
    container: { flex: 1 },
    content: { paddingHorizontal: 16, gap: 16 },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 8,
    },
    headerTitle: { fontSize: 28, fontFamily: "Inter_700Bold" },
    fab: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 20,
    },
    fabText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
    photoSection: { gap: 8 },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 4,
    },
    sectionTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", flex: 1 },
    sectionSubtitle: { fontSize: 12, fontFamily: "Inter_400Regular", paddingHorizontal: 4, marginTop: -4 },
    pill: {
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 10,
    },
    pillText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
    photoEmpty: {
      borderWidth: 1.5,
      borderStyle: "dashed",
      borderRadius: 16,
      padding: 32,
      alignItems: "center",
      gap: 10,
    },
    photoEmptyText: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      textAlign: "center",
      lineHeight: 19,
    },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    center: { paddingVertical: 80, alignItems: "center", justifyContent: "center" },
    empty: {
      width: "100%",
      borderWidth: 1.5,
      borderStyle: "dashed",
      borderRadius: 16,
      padding: 40,
      alignItems: "center",
      gap: 12,
    },
    emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.4)",
      justifyContent: "flex-end",
    },
    modalSheet: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
    },
    modalHandle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      alignSelf: "center",
      marginTop: 12,
      marginBottom: 8,
    },
    modalContent: { padding: 24, gap: 16, paddingBottom: 40 },
    modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
    input: {
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      fontFamily: "Inter_400Regular",
    },
    createBtn: {
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: "center",
    },
    createBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  });
}
