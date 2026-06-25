import {
  useGetStyleBoard,
  useGetStyleProfile,
  useGetProductBoard,
  useGetRooms,
  useAssignProductToRoom,
  useRemoveProductFromRoom,
  useGetProductFeed,
  useRecordProductSwipe,
} from "@workspace/api-client-react";
import React, { useCallback, useRef, useState } from "react";
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
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useUser } from "@/context/UserContext";
import { useSession } from "@/context/SessionContext";
import { useMode } from "@/context/ModeContext";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { ProductCard } from "@/components/ProductCard";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;
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

type Segment = "photos" | "products" | "shop";

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

const BATCH_SIZE = 200;

export default function BoardsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isLoggedIn } = useUser();
  const { session, isActive } = useSession();
  const { isDecoration, isRegistry } = useMode();
  const queryClient = useQueryClient();
  const topInset = insets.top + (Platform.OS === "web" ? 67 : 0);

  const [segment, setSegment] = useState<Segment>("products");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [roomModalProduct, setRoomModalProduct] = useState<Product | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<string>("All");
  const [customRoomInput, setCustomRoomInput] = useState("");

  const sessionId = isActive && session ? session.id : undefined;

  // ── Board data ─────────────────────────────────────────────────────────────
  const { data: boardData, isLoading: boardLoading } = useGetStyleBoard({
    query: { enabled: isLoggedIn, staleTime: 0 },
  });

  const { data: profileData } = useGetStyleProfile({
    query: { enabled: isLoggedIn, staleTime: 0 },
  });

  const { data: productBoardData, isLoading: productBoardLoading } = useGetProductBoard(
    sessionId ? { sessionId } : undefined,
    { query: { enabled: isLoggedIn, staleTime: 0 } }
  );

  const { data: roomsData } = useGetRooms(
    sessionId ? { sessionId } : undefined,
    {
      query: {
        enabled: isLoggedIn && isDecoration,
        staleTime: 0,
      },
    }
  );

  const assignToRoom = useAssignProductToRoom();
  const removeFromRoom = useRemoveProductFromRoom();

  const photos = (boardData?.photos ?? []) as Array<{ id: number; url: string; tags: string[] }>;
  const products = (productBoardData?.products ?? []) as Product[];
  const topTags = profileData?.topTags ?? [];

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

  const assignedRoomNames = rooms.map((r) => r.name);
  const allRoomNames = ["All", ...Array.from(new Set([...presetRooms, ...assignedRoomNames]))];

  const filteredProducts = React.useMemo(() => {
    if (!isDecoration || selectedRoom === "All") return products;
    return products.filter((p) => productRoomMap.get(p.id)?.has(selectedRoom));
  }, [products, selectedRoom, productRoomMap, isDecoration]);

  const mutualMatches = products.filter((p) => p.likedByPartner);

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

  // ── Shop deck ──────────────────────────────────────────────────────────────
  const [deck, setDeck] = useState<Product[]>([]);
  const [deckDone, setDeckDone] = useState(false);
  const swipeInFlight = useRef(false);
  const hasFetched = useRef(false);

  const { data: feedData, isLoading: feedLoading, refetch: refetchFeed } = useGetProductFeed(
    { limit: BATCH_SIZE, offset: 0, ...(sessionId ? { sessionId } : {}) } as never,
    { query: { enabled: isLoggedIn && segment === "shop", staleTime: 0 } }
  );

  const swipeMutation = useRecordProductSwipe();

  const prevSessionRef = useRef<number | undefined>(undefined);
  React.useEffect(() => {
    if (prevSessionRef.current === sessionId) return;
    prevSessionRef.current = sessionId;
    hasFetched.current = false;
    setDeckDone(false);
    setDeck([]);
  }, [sessionId]);

  React.useEffect(() => {
    if (!feedData) return;
    if (hasFetched.current) return;
    hasFetched.current = true;
    const incoming = (feedData.products ?? []) as Product[];
    if (incoming.length === 0) {
      setDeckDone(true);
    } else {
      setDeck(incoming);
    }
  }, [feedData]);

  useFocusEffect(
    useCallback(() => {
      if (segment === "shop" && deckDone && !hasFetched.current) {
        hasFetched.current = false;
        setDeckDone(false);
        setDeck([]);
        refetchFeed();
      }
    }, [segment, deckDone, refetchFeed])
  );

  const resetDeck = useCallback(() => {
    hasFetched.current = false;
    setDeckDone(false);
    setDeck([]);
    refetchFeed();
  }, [refetchFeed]);

  const handleProductSwipe = useCallback(
    async (product: Product, liked: boolean) => {
      if (swipeInFlight.current) return;
      swipeInFlight.current = true;
      if (Platform.OS !== "web") {
        Haptics.impactAsync(
          liked ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light
        );
      }
      setDeck((prev) => {
        const next = prev.filter((p) => p.id !== product.id);
        if (next.length === 0) setDeckDone(true);
        return next;
      });
      try {
        await swipeMutation.mutateAsync({
          data: { productId: product.id, liked, ...(sessionId ? { sessionId } : {}) },
        });
        if (liked) {
          queryClient.invalidateQueries({ queryKey: ["/api/products/board"] });
        }
      } catch {
        // silent
      } finally {
        swipeInFlight.current = false;
      }
    },
    [swipeMutation, queryClient, sessionId]
  );

  const s = stylesheet(colors);
  const isLoading = boardLoading || productBoardLoading;

  if (!isLoggedIn) return null;

  const displayPrice = (price: number) =>
    `$${price.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const cardAreaHeight = SCREEN_HEIGHT - topInset - insets.bottom - 220;

  // ── Header + Segments ─────────────────────────────────────────────────────
  const ListHeader = () => (
    <View>
      <View style={[s.header, { paddingTop: topInset + 8 }]}>
        <Text style={[s.headerTitle, { color: colors.foreground }]}>Boards</Text>
      </View>

      {/* Session banner */}
      {isActive && session && (
        <View style={[s.sessionBanner, { backgroundColor: colors.card, marginHorizontal: 16, marginBottom: 12 }]}>
          <View style={[s.sessionAvatar, { backgroundColor: colors.primary }]}>
            <Text style={[s.sessionAvatarText, { color: colors.primaryForeground }]}>
              {session.creator.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={s.sessionBannerText}>
            <Text style={[s.sessionBannerTitle, { color: colors.foreground }]}>
              {isRegistry ? "Registry active" : "Session active"}
            </Text>
            <Text style={[s.sessionBannerSub, { color: colors.mutedForeground }]}>
              {isRegistry
                ? `Building registry with ${session.partner?.name ?? "partner"}`
                : `Swiping with ${session.partner?.name ?? "partner"}`}
            </Text>
          </View>
          <View style={[s.sessionAvatar, { backgroundColor: colors.primary + "55" }]}>
            <Text style={[s.sessionAvatarText, { color: colors.primaryForeground }]}>
              {(session.partner?.name ?? "P").charAt(0).toUpperCase()}
            </Text>
          </View>
        </View>
      )}

      {topTags.length > 0 && segment === "photos" && (
        <View style={[s.tagsRow, { marginHorizontal: 16, marginBottom: 12 }]}>
          {(topTags as string[]).slice(0, 3).map((tag) => (
            <View key={tag} style={[s.topTag, { backgroundColor: colors.primary }]}>
              <Text style={[s.topTagText, { color: colors.primaryForeground }]}>{tag}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={[s.segmentRow, { borderBottomColor: colors.border }]}>
        {(["photos", "products", "shop"] as Segment[]).map((seg) => {
          const label = seg === "photos" ? `Photos${photos.length > 0 ? ` (${photos.length})` : ""}` :
            seg === "products" ? `Saved${products.length > 0 ? ` (${products.length})` : ""}` : "Shop";
          return (
            <Pressable
              key={seg}
              style={[s.segment, segment === seg && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
              onPress={() => setSegment(seg)}
            >
              <Text style={[s.segmentText, { color: segment === seg ? colors.primary : colors.mutedForeground }]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {isDecoration && segment === "products" && (
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

      {isActive && session && segment === "products" && mutualMatches.length > 0 && (
        <View style={[s.mutualSection, { marginHorizontal: 16, marginBottom: 8 }]}>
          <View style={s.mutualHeader}>
            <Ionicons name="heart-circle" size={16} color={colors.primary} />
            <Text style={[s.mutualHeaderText, { color: colors.primary }]}>
              Both loved · {mutualMatches.length}
            </Text>
          </View>
        </View>
      )}
    </View>
  );

  // ── Photos segment ─────────────────────────────────────────────────────────
  if (isLoading && photos.length === 0 && products.length === 0 && deck.length === 0) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // ── Shop segment ───────────────────────────────────────────────────────────
  if (segment === "shop") {
    return (
      <View style={[s.container, { backgroundColor: colors.background }]}>
        <ListHeader />
        <View style={[s.shopArea, { height: cardAreaHeight }]}>
          {feedLoading && deck.length === 0 ? (
            <View style={s.center}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : deckDone || deck.length === 0 ? (
            <View style={s.center}>
              <Ionicons name="checkmark-circle-outline" size={64} color={colors.primary} />
              <Text style={[s.doneTitle, { color: colors.foreground }]}>All caught up!</Text>
              <Text style={[s.doneSub, { color: colors.mutedForeground }]}>
                You've seen all products curated for your style.
              </Text>
              <Pressable style={[s.reloadBtn, { backgroundColor: colors.primary }]} onPress={resetDeck}>
                <Ionicons name="refresh-outline" size={18} color={colors.primaryForeground} />
                <Text style={[s.reloadBtnText, { color: colors.primaryForeground }]}>Browse Again</Text>
              </Pressable>
            </View>
          ) : (
            deck
              .slice(0, 2)
              .reverse()
              .map((product, revIdx) => {
                const isTop = revIdx === deck.slice(0, 2).length - 1;
                return (
                  <ProductCard
                    key={product.id}
                    product={product}
                    isTop={isTop}
                    onSwipe={(liked) => handleProductSwipe(product, liked)}
                    saveLabel={isRegistry ? "ADD" : "SAVE"}
                    skipLabel="SKIP"
                  />
                );
              })
          )}
        </View>
        {!deckDone && deck.length > 0 && (
          <View style={[s.shopHint, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 80 }]}>
            <Ionicons name="arrow-back-outline" size={16} color={colors.mutedForeground} />
            <Text style={[s.shopHintText, { color: colors.mutedForeground }]}>skip</Text>
            <View style={s.shopHintSpacer} />
            <Text style={[s.shopHintText, { color: colors.mutedForeground }]}>
              {isRegistry ? "add to registry" : "save"}
            </Text>
            <Ionicons name="arrow-forward-outline" size={16} color={colors.mutedForeground} />
          </View>
        )}
      </View>
    );
  }

  // ── Photos / Products segments ─────────────────────────────────────────────
  const photoData = segment === "photos" ? photos : [];
  const productData = segment === "products" ? filteredProducts : [];

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      {segment === "photos" ? (
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
                Swipe right on inspiration photos in Discover
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
                    Swipe right on products in the Shop tab
                  </Text>
                  <Pressable
                    style={[s.shopCta, { backgroundColor: colors.primary }]}
                    onPress={() => setSegment("shop")}
                  >
                    <Ionicons name="bag-outline" size={16} color={colors.primaryForeground} />
                    <Text style={[s.shopCtaText, { color: colors.primaryForeground }]}>Browse Shop</Text>
                  </Pressable>
                </>
              )}
            </View>
          }
          renderItem={({ item }) => {
            const assignedRooms = productRoomMap.get(item.id);
            const firstRoom = assignedRooms ? [...assignedRooms][0] : null;
            const isMutual = !!item.likedByPartner;
            return (
              <Pressable
                style={[s.productCard, { backgroundColor: colors.card }]}
                onPress={() => setSelectedProduct(item)}
              >
                <Image source={{ uri: item.url }} style={s.productImage} resizeMode="cover" />
                {isMutual && (
                  <View style={[s.mutualBadge, { backgroundColor: colors.primary }]}>
                    <Ionicons name="heart" size={10} color={colors.primaryForeground} />
                  </View>
                )}
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

function stylesheet(colors: ReturnType<typeof import("@/hooks/useColors").useColors>) {
  return StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
    header: {
      paddingHorizontal: 24,
      paddingBottom: 12,
      flexDirection: "row",
      alignItems: "baseline",
      justifyContent: "space-between",
    },
    headerTitle: { fontSize: 28, fontFamily: "Inter_700Bold" },
    sessionBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      borderRadius: 16,
      padding: 12,
    },
    sessionAvatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
    },
    sessionAvatarText: { fontSize: 13, fontFamily: "Inter_700Bold" },
    sessionBannerText: { flex: 1 },
    sessionBannerTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
    sessionBannerSub: { fontSize: 11, fontFamily: "Inter_400Regular" },
    tagsRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
    topTag: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
    topTagText: { fontSize: 13, fontFamily: "Inter_600SemiBold", textTransform: "capitalize" },
    mutualSection: { paddingTop: 4 },
    mutualHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
    mutualHeaderText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
    segmentRow: {
      flexDirection: "row",
      borderBottomWidth: 1,
      marginHorizontal: 16,
      marginBottom: 4,
    },
    segment: {
      flex: 1,
      paddingVertical: 10,
      alignItems: "center",
    },
    segmentText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
    roomFilter: { marginBottom: 4 },
    roomFilterContent: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
    roomChip: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 16,
      borderWidth: 1,
    },
    roomChipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
    grid: { padding: 16, gap: 8 },
    row: { gap: 8 },
    photoCard: {
      width: CARD_WIDTH,
      borderRadius: 16,
      overflow: "hidden",
      position: "relative",
    },
    photo: { width: "100%", aspectRatio: 1 },
    photoTag: {
      position: "absolute",
      bottom: 8,
      left: 8,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    photoTagText: { fontSize: 11, fontFamily: "Inter_500Medium", textTransform: "capitalize" },
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
    emptyState: {
      alignItems: "center",
      paddingVertical: 48,
      paddingHorizontal: 32,
      gap: 12,
    },
    emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", textAlign: "center" },
    emptySubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 21 },
    shopCta: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 24,
      marginTop: 4,
    },
    shopCtaText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
    shopArea: {
      marginHorizontal: 16,
      position: "relative",
    },
    shopHint: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingTop: 12,
      paddingHorizontal: 32,
      gap: 6,
    },
    shopHintText: { fontSize: 13, fontFamily: "Inter_400Regular" },
    shopHintSpacer: { flex: 1 },
    doneTitle: { fontSize: 22, fontFamily: "Inter_600SemiBold", textAlign: "center" },
    doneSub: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22, paddingHorizontal: 16 },
    reloadBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 24,
    },
    reloadBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
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
    doneBtn: {
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: "center",
    },
    doneBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  });
}
