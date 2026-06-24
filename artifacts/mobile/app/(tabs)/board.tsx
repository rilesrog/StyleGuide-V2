import {
  useGetStyleBoard,
  useGetStyleProfile,
  useResetSwipes,
  useGetProductBoard,
  useGetRooms,
  useAssignProductToRoom,
  useRemoveProductFromRoom,
} from "@workspace/api-client-react";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
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
import { useColors } from "@/hooks/useColors";
import { useUser } from "@/context/UserContext";
import { useSession } from "@/context/SessionContext";
import { useMode } from "@/context/ModeContext";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_WIDTH = (SCREEN_WIDTH - 32 - 8) / 2;

const PRESET_ROOMS = [
  "Living Room",
  "Bedroom",
  "Kitchen",
  "Bathroom",
  "Dining Room",
  "Office",
  "Other",
];

type Product = {
  id: number;
  url: string;
  name: string;
  price: number;
  tags: string[];
  category: string;
  brand?: string | null;
  affiliateUrl?: string | null;
};

export default function BoardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isLoggedIn } = useUser();
  const { session, isActive } = useSession();
  const { isDecoration } = useMode();
  const queryClient = useQueryClient();
  const router = useRouter();
  const topInset = insets.top + (Platform.OS === "web" ? 67 : 0);
  const [activeTab, setActiveTab] = useState<"photos" | "products">("photos");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [roomModalProduct, setRoomModalProduct] = useState<Product | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<string>("All");
  const [customRoomInput, setCustomRoomInput] = useState("");

  const { data: boardData, isLoading: boardLoading } = useGetStyleBoard({
    query: { enabled: isLoggedIn, staleTime: 0 },
  });

  const { data: profileData } = useGetStyleProfile({
    query: { enabled: isLoggedIn, staleTime: 0 },
  });

  const { data: productBoardData, isLoading: productBoardLoading } = useGetProductBoard({
    query: { enabled: isLoggedIn, staleTime: 0 },
  });

  const sessionId = isActive && session ? session.id : undefined;

  const { data: roomsData } = useGetRooms({
    query: {
      enabled: isLoggedIn && isDecoration,
      staleTime: 0,
      queryKey: ["/api/rooms", sessionId],
    },
  });

  const assignToRoom = useAssignProductToRoom();
  const removeFromRoom = useRemoveProductFromRoom();
  const resetSwipesMutation = useResetSwipes();

  const photos = (boardData?.photos ?? []) as Array<{ id: number; url: string; tags: string[] }>;
  const products = (productBoardData?.products ?? []) as Product[];
  const topTags = profileData?.topTags ?? [];
  const tagWeights = (profileData?.tagWeights ?? []) as Array<{
    tag: string;
    score: number;
    count: number;
  }>;

  // Build room assignment map: productId → Set<room>
  const rooms = (roomsData?.rooms ?? []) as Array<{
    name: string;
    items: Array<{ id: number; product: Product }>;
  }>;
  const presetRooms = (roomsData?.presetRooms ?? PRESET_ROOMS) as string[];

  const productRoomMap = React.useMemo(() => {
    const map = new Map<number, Set<string>>();
    for (const roomGroup of rooms) {
      for (const item of roomGroup.items) {
        if (!map.has(item.product.id)) map.set(item.product.id, new Set());
        map.get(item.product.id)!.add(roomGroup.name);
      }
    }
    return map;
  }, [rooms]);

  // Determine all existing room names (preset + assigned)
  const assignedRoomNames = rooms.map((r) => r.name);
  const allRoomNames = ["All", ...Array.from(new Set([...presetRooms, ...assignedRoomNames]))];

  // Filter products by selected room (decoration mode)
  const filteredProducts = React.useMemo(() => {
    if (!isDecoration || selectedRoom === "All") return products;
    return products.filter((p) => productRoomMap.get(p.id)?.has(selectedRoom));
  }, [products, selectedRoom, productRoomMap, isDecoration]);

  const handleAssignRoom = async (product: Product, room: string) => {
    const alreadyAssigned = productRoomMap.get(product.id)?.has(room);
    if (alreadyAssigned) {
      await removeFromRoom.mutateAsync({ data: { productId: product.id, room } });
    } else {
      await assignToRoom.mutateAsync({ data: { productId: product.id, room } });
    }
    queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleRetakeQuiz = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const doReset = async () => {
      await resetSwipesMutation.mutateAsync({});
      queryClient.invalidateQueries();
      router.navigate("/");
    };

    if (Platform.OS === "web") {
      if (window.confirm("Reset all swipes and retake the quiz?")) {
        doReset();
      }
    } else {
      Alert.alert(
        "Retake Quiz",
        "This will clear your style board and start fresh. Continue?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Reset & Retake", style: "destructive", onPress: doReset },
        ]
      );
    }
  };

  const s = stylesheet(colors);
  const isLoading = boardLoading || productBoardLoading;

  if (!isLoggedIn) return null;

  if (isLoading && photos.length === 0 && products.length === 0) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const displayPrice = (price: number) =>
    `$${price.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const ListHeader = () => (
    <View>
      <View style={[s.header, { paddingTop: topInset + 8 }]}>
        <Text style={[s.headerTitle, { color: colors.foreground }]}>My Board</Text>
      </View>

      {topTags.length > 0 && (
        <View style={[s.profileCard, { backgroundColor: colors.card, marginHorizontal: 16, marginBottom: 16 }]}>
          <Text style={[s.profileCardLabel, { color: colors.mutedForeground }]}>Your Style</Text>
          <View style={s.topTagsRow}>
            {topTags.slice(0, 3).map((tag) => (
              <View key={tag} style={[s.topTag, { backgroundColor: colors.primary }]}>
                <Text style={[s.topTagText, { color: colors.primaryForeground }]}>{tag}</Text>
              </View>
            ))}
          </View>
          {tagWeights.slice(0, 4).map((tw) => (
            <View key={tw.tag} style={s.tagBar}>
              <Text style={[s.tagBarLabel, { color: colors.foreground }]}>{tw.tag}</Text>
              <View style={[s.tagBarTrack, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    s.tagBarFill,
                    { backgroundColor: colors.primary, width: `${Math.round(tw.score * 100)}%` },
                  ]}
                />
              </View>
              <Text style={[s.tagBarPct, { color: colors.mutedForeground }]}>
                {Math.round(tw.score * 100)}%
              </Text>
            </View>
          ))}
          <Pressable
            style={[s.retakeBtn, { borderColor: colors.border }]}
            onPress={handleRetakeQuiz}
            disabled={resetSwipesMutation.isPending}
          >
            <Ionicons name="refresh-outline" size={16} color={colors.mutedForeground} />
            <Text style={[s.retakeBtnText, { color: colors.mutedForeground }]}>
              {resetSwipesMutation.isPending ? "Resetting..." : "Retake Quiz"}
            </Text>
          </Pressable>
        </View>
      )}

      <View style={[s.segmentRow, { borderBottomColor: colors.border }]}>
        <Pressable
          style={[s.segment, activeTab === "photos" && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab("photos")}
        >
          <Text style={[s.segmentText, { color: activeTab === "photos" ? colors.primary : colors.mutedForeground }]}>
            Photos {photos.length > 0 ? `(${photos.length})` : ""}
          </Text>
        </Pressable>
        <Pressable
          style={[s.segment, activeTab === "products" && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab("products")}
        >
          <Text style={[s.segmentText, { color: activeTab === "products" ? colors.primary : colors.mutedForeground }]}>
            Products {products.length > 0 ? `(${products.length})` : ""}
          </Text>
        </Pressable>
      </View>

      {/* Room filter strip — shown in decoration mode on products tab */}
      {isDecoration && activeTab === "products" && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.roomFilterContent}
          style={s.roomFilter}
        >
          {allRoomNames.map((room) => (
            <Pressable
              key={room}
              style={[
                s.roomChip,
                {
                  backgroundColor: selectedRoom === room ? colors.primary : colors.card,
                  borderColor: selectedRoom === room ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setSelectedRoom(room)}
            >
              <Text
                style={[
                  s.roomChipText,
                  { color: selectedRoom === room ? colors.primaryForeground : colors.foreground },
                ]}
              >
                {room}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );

  const photoData = activeTab === "photos" ? photos : [];
  const productData = activeTab === "products" ? filteredProducts : [];

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      {activeTab === "photos" ? (
        <FlatList
          data={photoData}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          columnWrapperStyle={s.row}
          contentContainerStyle={[
            s.grid,
            { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 80 },
          ]}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={
            <View style={s.emptyState}>
              <Ionicons name="images-outline" size={48} color={colors.mutedForeground} />
              <Text style={[s.emptyTitle, { color: colors.foreground }]}>No photos saved yet</Text>
              <Text style={[s.emptySubtitle, { color: colors.mutedForeground }]}>
                Swipe right on photos you love in the Discover tab
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[s.photoCard, { backgroundColor: colors.card }]}>
              <Image source={{ uri: item.url }} style={s.photo} resizeMode="cover" />
              {item.tags
                .filter(
                  (t: string) =>
                    !["neutral", "warm", "light", "dark", "bright", "airy", "clean", "bold", "white"].includes(t)
                )
                .slice(0, 1)
                .map((tag: string) => (
                  <View
                    key={tag}
                    style={[s.photoTag, { backgroundColor: colors.background + "DD" }]}
                  >
                    <Text style={[s.photoTagText, { color: colors.foreground }]}>{tag}</Text>
                  </View>
                ))}
            </View>
          )}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={productData}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          columnWrapperStyle={s.row}
          contentContainerStyle={[
            s.grid,
            { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 80 },
          ]}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={
            <View style={s.emptyState}>
              {selectedRoom !== "All" && isDecoration ? (
                <>
                  <Ionicons name="cube-outline" size={48} color={colors.mutedForeground} />
                  <Text style={[s.emptyTitle, { color: colors.foreground }]}>
                    No products in {selectedRoom}
                  </Text>
                  <Text style={[s.emptySubtitle, { color: colors.mutedForeground }]}>
                    Save products and assign them to this room.
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons name="bag-outline" size={48} color={colors.mutedForeground} />
                  <Text style={[s.emptyTitle, { color: colors.foreground }]}>No products saved yet</Text>
                  <Text style={[s.emptySubtitle, { color: colors.mutedForeground }]}>
                    Swipe right on products you love in the Shop tab
                  </Text>
                </>
              )}
            </View>
          }
          renderItem={({ item }) => {
            const assignedRooms = productRoomMap.get(item.id);
            const firstRoom = assignedRooms ? [...assignedRooms][0] : null;
            return (
              <Pressable
                style={[s.productCard, { backgroundColor: colors.card }]}
                onPress={() => setSelectedProduct(item)}
              >
                <Image source={{ uri: item.url }} style={s.productImage} resizeMode="cover" />
                {isDecoration && firstRoom && (
                  <View style={[s.roomBadge, { backgroundColor: colors.primary + "EE" }]}>
                    <Text style={[s.roomBadgeText, { color: colors.primaryForeground }]} numberOfLines={1}>
                      {firstRoom}
                    </Text>
                  </View>
                )}
                <View style={s.productInfo}>
                  <Text style={[s.productName, { color: colors.foreground }]} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <View style={s.productFooter}>
                    <Text style={[s.productPrice, { color: colors.primary }]}>
                      {displayPrice(item.price)}
                    </Text>
                    {isDecoration && (
                      <Pressable
                        style={[s.roomBtn, { backgroundColor: colors.muted }]}
                        onPress={(e) => {
                          e.stopPropagation();
                          setRoomModalProduct(item);
                        }}
                      >
                        <Ionicons name="add-circle-outline" size={14} color={colors.mutedForeground} />
                        <Text style={[s.roomBtnText, { color: colors.mutedForeground }]}>Room</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              </Pressable>
            );
          }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Product detail modal */}
      <Modal
        visible={!!selectedProduct}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedProduct(null)}
      >
        <Pressable style={s.modalBackdrop} onPress={() => setSelectedProduct(null)}>
          <Pressable style={[s.modalSheet, { backgroundColor: colors.card }]} onPress={() => {}}>
            <View style={[s.modalHandle, { backgroundColor: colors.border }]} />
            {selectedProduct && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Image
                  source={{ uri: selectedProduct.url }}
                  style={s.modalImage}
                  resizeMode="cover"
                />
                <View style={s.modalContent}>
                  <View style={s.modalTopRow}>
                    <Text style={[s.modalName, { color: colors.foreground }]}>
                      {selectedProduct.name}
                    </Text>
                    <Text style={[s.modalPrice, { color: colors.primary }]}>
                      {displayPrice(selectedProduct.price)}
                    </Text>
                  </View>
                  <Text style={[s.modalCategory, { color: colors.mutedForeground }]}>
                    {selectedProduct.category}
                    {selectedProduct.brand ? ` · ${selectedProduct.brand}` : ""}
                  </Text>
                  <View style={s.modalTagsRow}>
                    {(selectedProduct.tags ?? [])
                      .filter(
                        (t) =>
                          !["neutral", "warm", "light", "dark", "bright", "airy", "clean", "bold", "white"].includes(t)
                      )
                      .slice(0, 4)
                      .map((tag) => (
                        <View
                          key={tag}
                          style={[
                            s.modalTag,
                            {
                              backgroundColor: colors.primary + "20",
                              borderColor: colors.primary + "40",
                            },
                          ]}
                        >
                          <Text style={[s.modalTagText, { color: colors.primary }]}>{tag}</Text>
                        </View>
                      ))}
                  </View>
                  {isDecoration && (
                    <Pressable
                      style={[s.viewProductBtn, { backgroundColor: colors.secondary }]}
                      onPress={() => {
                        setSelectedProduct(null);
                        setRoomModalProduct(selectedProduct);
                      }}
                    >
                      <Ionicons name="home-outline" size={18} color={colors.secondaryForeground} />
                      <Text style={[s.viewProductBtnText, { color: colors.secondaryForeground }]}>
                        Assign to Room
                      </Text>
                    </Pressable>
                  )}
                  <Pressable
                    style={[s.viewProductBtn, { backgroundColor: colors.primary }]}
                    onPress={() => setSelectedProduct(null)}
                  >
                    <Ionicons name="open-outline" size={18} color={colors.primaryForeground} />
                    <Text style={[s.viewProductBtnText, { color: colors.primaryForeground }]}>
                      View Product
                    </Text>
                  </Pressable>
                </View>
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Room assignment modal */}
      <Modal
        visible={!!roomModalProduct}
        animationType="slide"
        transparent
        onRequestClose={() => setRoomModalProduct(null)}
      >
        <Pressable style={s.modalBackdrop} onPress={() => setRoomModalProduct(null)}>
          <Pressable style={[s.modalSheet, { backgroundColor: colors.card }]} onPress={() => {}}>
            <View style={[s.modalHandle, { backgroundColor: colors.border }]} />
            <View style={s.roomModalContent}>
              <Text style={[s.roomModalTitle, { color: colors.foreground }]}>Assign to Room</Text>
              {roomModalProduct && (
                <Text style={[s.roomModalSubtitle, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {roomModalProduct.name}
                </Text>
              )}
              <ScrollView style={s.roomList} showsVerticalScrollIndicator={false}>
                {presetRooms.map((room) => {
                  const assigned = roomModalProduct
                    ? productRoomMap.get(roomModalProduct.id)?.has(room)
                    : false;
                  return (
                    <Pressable
                      key={room}
                      style={[
                        s.roomListItem,
                        {
                          backgroundColor: assigned ? colors.primary + "15" : "transparent",
                          borderColor: assigned ? colors.primary + "40" : colors.border,
                        },
                      ]}
                      onPress={() => roomModalProduct && handleAssignRoom(roomModalProduct, room)}
                    >
                      <Text
                        style={[
                          s.roomListItemText,
                          { color: assigned ? colors.primary : colors.foreground },
                        ]}
                      >
                        {room}
                      </Text>
                      {assigned && (
                        <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* Custom room name input */}
              <View style={[s.customRoomRow, { borderColor: colors.border, backgroundColor: colors.muted }]}>
                <TextInput
                  style={[s.customRoomInput, { color: colors.foreground }]}
                  placeholder="Custom room name…"
                  placeholderTextColor={colors.mutedForeground}
                  value={customRoomInput}
                  onChangeText={setCustomRoomInput}
                  returnKeyType="done"
                  onSubmitEditing={() => {
                    const name = customRoomInput.trim();
                    if (name && roomModalProduct) {
                      handleAssignRoom(roomModalProduct, name);
                      setCustomRoomInput("");
                    }
                  }}
                />
                <Pressable
                  style={[
                    s.customRoomAddBtn,
                    { backgroundColor: customRoomInput.trim() ? colors.primary : colors.border },
                  ]}
                  onPress={() => {
                    const name = customRoomInput.trim();
                    if (name && roomModalProduct) {
                      handleAssignRoom(roomModalProduct, name);
                      setCustomRoomInput("");
                    }
                  }}
                  disabled={!customRoomInput.trim()}
                >
                  <Ionicons name="add" size={18} color={customRoomInput.trim() ? colors.primaryForeground : colors.mutedForeground} />
                </Pressable>
              </View>

              <Pressable
                style={[s.doneBtn, { backgroundColor: colors.primary }]}
                onPress={() => { setRoomModalProduct(null); setCustomRoomInput(""); }}
              >
                <Text style={[s.doneBtnText, { color: colors.primaryForeground }]}>Done</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function stylesheet(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    header: {
      paddingHorizontal: 24,
      paddingBottom: 16,
      flexDirection: "row",
      alignItems: "baseline",
      justifyContent: "space-between",
    },
    headerTitle: { fontSize: 28, fontFamily: "Inter_700Bold" },
    profileCard: { borderRadius: 20, padding: 20, gap: 12 },
    profileCardLabel: {
      fontSize: 12,
      fontFamily: "Inter_500Medium",
      textTransform: "uppercase",
      letterSpacing: 1,
    },
    topTagsRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
    topTag: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
    topTagText: { fontSize: 13, fontFamily: "Inter_600SemiBold", textTransform: "capitalize" },
    tagBar: { flexDirection: "row", alignItems: "center", gap: 10 },
    tagBarLabel: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      textTransform: "capitalize",
      width: 90,
    },
    tagBarTrack: { flex: 1, height: 6, borderRadius: 3, overflow: "hidden" },
    tagBarFill: { height: "100%", borderRadius: 3 },
    tagBarPct: { fontSize: 12, fontFamily: "Inter_400Regular", width: 34, textAlign: "right" },
    retakeBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
      marginTop: 4,
    },
    retakeBtnText: { fontSize: 14, fontFamily: "Inter_500Medium" },
    segmentRow: {
      flexDirection: "row",
      marginHorizontal: 16,
      marginBottom: 8,
      borderBottomWidth: 1,
    },
    segment: {
      flex: 1,
      alignItems: "center",
      paddingVertical: 12,
    },
    segmentText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
    roomFilter: { marginBottom: 8 },
    roomFilterContent: {
      paddingHorizontal: 16,
      gap: 8,
      flexDirection: "row",
      paddingBottom: 8,
    },
    roomChip: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 20,
      borderWidth: 1,
    },
    roomChipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
    emptyState: { alignItems: "center", paddingVertical: 48, paddingHorizontal: 32, gap: 12 },
    emptyTitle: { fontSize: 20, fontFamily: "Inter_600SemiBold", textAlign: "center" },
    emptySubtitle: {
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      textAlign: "center",
      lineHeight: 22,
    },
    grid: { paddingHorizontal: 16 },
    row: { gap: 8, marginBottom: 8 },
    photoCard: {
      width: CARD_WIDTH,
      height: CARD_WIDTH * 1.3,
      borderRadius: 16,
      overflow: "hidden",
    },
    photo: { width: "100%", height: "100%" },
    photoTag: {
      position: "absolute",
      bottom: 8,
      left: 8,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    photoTagText: { fontSize: 11, fontFamily: "Inter_500Medium", textTransform: "capitalize" },
    productCard: {
      width: CARD_WIDTH,
      borderRadius: 16,
      overflow: "hidden",
    },
    productImage: { width: "100%", height: CARD_WIDTH * 1.1 },
    roomBadge: {
      position: "absolute",
      top: 8,
      left: 8,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
      maxWidth: CARD_WIDTH - 16,
    },
    roomBadgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
    productInfo: { padding: 10, gap: 4 },
    productName: {
      fontSize: 13,
      fontFamily: "Inter_500Medium",
      lineHeight: 18,
    },
    productFooter: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    productPrice: {
      fontSize: 14,
      fontFamily: "Inter_700Bold",
    },
    roomBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      paddingHorizontal: 7,
      paddingVertical: 4,
      borderRadius: 8,
    },
    roomBtnText: { fontSize: 11, fontFamily: "Inter_500Medium" },
    modalBackdrop: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: "rgba(0,0,0,0.4)",
    },
    modalSheet: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: "85%",
      paddingTop: 12,
    },
    modalHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      alignSelf: "center",
      marginBottom: 16,
    },
    modalImage: {
      width: "100%",
      height: 280,
    },
    modalContent: {
      padding: 20,
      gap: 10,
    },
    modalTopRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 12,
    },
    modalName: {
      fontSize: 18,
      fontFamily: "Inter_600SemiBold",
      flex: 1,
      lineHeight: 24,
    },
    modalPrice: {
      fontSize: 20,
      fontFamily: "Inter_700Bold",
    },
    modalCategory: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      textTransform: "capitalize",
    },
    modalTagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    modalTag: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      borderWidth: 1,
    },
    modalTagText: {
      fontSize: 12,
      fontFamily: "Inter_500Medium",
      textTransform: "capitalize",
    },
    viewProductBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 14,
      borderRadius: 16,
      marginTop: 4,
    },
    viewProductBtnText: {
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
    },
    roomModalContent: {
      padding: 24,
      gap: 12,
      maxHeight: 480,
    },
    roomModalTitle: {
      fontSize: 20,
      fontFamily: "Inter_700Bold",
    },
    roomModalSubtitle: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      marginTop: -4,
    },
    roomList: { maxHeight: 320 },
    roomListItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: 8,
    },
    roomListItemText: {
      fontSize: 15,
      fontFamily: "Inter_500Medium",
    },
    doneBtn: {
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: "center",
    },
    doneBtnText: {
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
    },
    customRoomRow: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 4,
      gap: 8,
    },
    customRoomInput: {
      flex: 1,
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      paddingVertical: 8,
    },
    customRoomAddBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
    },
  });
}
