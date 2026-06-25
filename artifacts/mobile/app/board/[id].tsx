import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useUser } from "@/context/UserContext";
import { useSession } from "@/context/SessionContext";
import { useMode } from "@/context/ModeContext";
import {
  useGetRooms,
  useAssignProductToRoom,
  useRemoveProductFromRoom,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_WIDTH = (SCREEN_WIDTH - 32 - 8) / 2;

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

const PRESET_ROOMS = [
  "Living Room", "Bedroom", "Kitchen", "Bathroom", "Dining Room", "Office", "Other",
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
  likedByPartner?: boolean;
};

export default function BoardDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token, isLoggedIn } = useUser();
  const { session, isActive } = useSession();
  const { isDecoration } = useMode();
  const queryClient = useQueryClient();

  const isPartnerBoard = id === "partner";
  const boardId = isPartnerBoard ? null : Number(id);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [roomModalProduct, setRoomModalProduct] = useState<Product | null>(null);
  const [customRoomInput, setCustomRoomInput] = useState("");

  const sessionId = isActive && session ? session.id : undefined;

  const fetchProducts = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      if (isPartnerBoard) {
        if (!sessionId) { setProducts([]); return; }
        const resp = await fetch(`${API_BASE}/api/products/board?sessionId=${sessionId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (resp.ok) {
          const data = await resp.json();
          const all = (data as { products: Product[] }).products ?? [];
          setProducts(all.filter((p) => p.likedByPartner));
        }
      } else {
        const resp = await fetch(`${API_BASE}/api/boards/${boardId}/items`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (resp.ok) {
          const data = await resp.json();
          setProducts((data as { products: Product[] }).products ?? []);
        }
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [token, isPartnerBoard, boardId, sessionId]);

  useFocusEffect(
    useCallback(() => {
      if (isLoggedIn) fetchProducts();
    }, [isLoggedIn, fetchProducts])
  );

  // Room assignment
  const { data: roomsData } = useGetRooms(
    sessionId ? { sessionId } : undefined,
    { query: { enabled: isLoggedIn && isDecoration && !isPartnerBoard, staleTime: 0 } }
  );
  const assignToRoom = useAssignProductToRoom();
  const removeFromRoom = useRemoveProductFromRoom();

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

  const displayPrice = (price: number) =>
    `$${price.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const s = stylesheet(colors);
  const topInset = insets.top + (Platform.OS === "web" ? 67 : 0);

  const boardTitle = isPartnerBoard
    ? `With ${session?.partner?.name ?? "Partner"}`
    : products.length >= 0
    ? undefined
    : "Board";

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={products}
        keyExtractor={(item) => String(item.id)}
        numColumns={2}
        columnWrapperStyle={s.row}
        contentContainerStyle={[
          s.grid,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 32 },
        ]}
        ListHeaderComponent={() => (
          <View style={[s.header, { paddingTop: topInset + 8 }]}>
            <Pressable style={s.backBtn} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={24} color={colors.foreground} />
            </Pressable>
            {boardTitle && (
              <Text style={[s.headerTitle, { color: colors.foreground }]}>{boardTitle}</Text>
            )}
          </View>
        )}
        ListEmptyComponent={
          loading ? (
            <View style={s.center}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <View style={s.center}>
              {isPartnerBoard ? (
                <>
                  <Ionicons name="heart-circle-outline" size={56} color={colors.mutedForeground} />
                  <Text style={[s.emptyTitle, { color: colors.foreground }]}>No mutual picks yet</Text>
                  <Text style={[s.emptySub, { color: colors.mutedForeground }]}>
                    Both of you need to like the same product for it to appear here.
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons name="bag-outline" size={56} color={colors.mutedForeground} />
                  <Text style={[s.emptyTitle, { color: colors.foreground }]}>This board is empty</Text>
                  <Text style={[s.emptySub, { color: colors.mutedForeground }]}>
                    Save products from the Shop to add them here.
                  </Text>
                </>
              )}
            </View>
          )
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
              {item.likedByPartner && (
                <View style={[s.mutualBadge, { backgroundColor: colors.primary }]}>
                  <Ionicons name="heart" size={10} color={colors.primaryForeground} />
                </View>
              )}
              {isDecoration && !isPartnerBoard && firstRoom && (
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
                  {isDecoration && !isPartnerBoard && (
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
                            { backgroundColor: colors.primary + "20", borderColor: colors.primary + "40" },
                          ]}
                        >
                          <Text style={[s.modalTagText, { color: colors.primary }]}>{tag}</Text>
                        </View>
                      ))}
                  </View>
                  {isDecoration && !isPartnerBoard && (
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
      {isDecoration && !isPartnerBoard && (
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
                        {assigned && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
                      </Pressable>
                    );
                  })}
                </ScrollView>
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
      )}
    </View>
  );
}

function stylesheet(colors: ReturnType<typeof import("@/hooks/useColors").useColors>) {
  return StyleSheet.create({
    container: { flex: 1 },
    header: {
      paddingHorizontal: 16,
      paddingBottom: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
    grid: { paddingHorizontal: 16, gap: 8 },
    row: { gap: 8 },
    center: {
      paddingVertical: 80,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 32,
      gap: 16,
    },
    emptyTitle: { fontSize: 20, fontFamily: "Inter_600SemiBold", textAlign: "center" },
    emptySub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 21 },
    productCard: {
      width: CARD_WIDTH,
      borderRadius: 16,
      overflow: "hidden",
    },
    productImage: { width: "100%", aspectRatio: 1 },
    mutualBadge: {
      position: "absolute",
      top: 8,
      left: 8,
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: "center",
      justifyContent: "center",
    },
    roomBadge: {
      position: "absolute",
      top: 8,
      right: 8,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      maxWidth: "60%",
    },
    roomBadgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
    productInfo: { padding: 10, gap: 4 },
    productName: { fontSize: 12, fontFamily: "Inter_500Medium", lineHeight: 17 },
    productFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    productPrice: { fontSize: 13, fontFamily: "Inter_700Bold" },
    roomBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    roomBtnText: { fontSize: 10, fontFamily: "Inter_500Medium" },
    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.4)",
      justifyContent: "flex-end",
    },
    modalSheet: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: "85%",
    },
    modalHandle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      alignSelf: "center",
      marginTop: 12,
      marginBottom: 8,
    },
    modalImage: { width: "100%", aspectRatio: 4 / 3 },
    modalContent: { padding: 20, gap: 12 },
    modalTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
    modalName: { flex: 1, fontSize: 18, fontFamily: "Inter_600SemiBold", lineHeight: 24 },
    modalPrice: { fontSize: 20, fontFamily: "Inter_700Bold" },
    modalCategory: { fontSize: 13, fontFamily: "Inter_400Regular" },
    modalTagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    modalTag: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 10,
      borderWidth: 1,
    },
    modalTagText: { fontSize: 12, fontFamily: "Inter_500Medium", textTransform: "capitalize" },
    viewProductBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 14,
      borderRadius: 14,
    },
    viewProductBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
    roomModalContent: { padding: 20, gap: 16 },
    roomModalTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
    roomModalSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: -8 },
    roomList: { maxHeight: 240 },
    roomListItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: 8,
    },
    roomListItemText: { fontSize: 15, fontFamily: "Inter_500Medium" },
    customRoomRow: {
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 12,
      borderWidth: 1,
      overflow: "hidden",
    },
    customRoomInput: {
      flex: 1,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      fontFamily: "Inter_400Regular",
    },
    customRoomAddBtn: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    doneBtn: { paddingVertical: 14, borderRadius: 14, alignItems: "center" },
    doneBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
    customRoomInputField: {},
  });
}
