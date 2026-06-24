---
name: StyleSwipe stack decisions
description: Key architecture and implementation decisions for the StyleSwipe app
---

# StyleSwipe — Key Decisions

## Auth
Simple email-only token auth (no password). Register with name+email → server returns 64-char hex token stored in AsyncStorage. `setAuthTokenGetter` in UserContext supplies token for every API call.

**Why:** Fast first-build; password auth adds complexity not needed for a style quiz MVP.

**How to apply:** `POST /api/auth/register` (name+email) or `POST /api/auth/login` (email only). On 409 from register, prompt user to sign in instead.

## Swipe Cards
PanResponder from react-native + react-native Animated (NOT reanimated) for swipe cards. SWIPE_THRESHOLD = 30% of screen width. Cards animate off at 1.5x screen width.

**Why:** PanResponder + Animated.event integration is simpler than mixing reanimated gesture handlers; avoids "useDerivedValue" crashes on web.

## Photo Seed Data
36 curated Unsplash photos seeded on first server start (checked by count > 0). Tags are flat string arrays (not JSONB). Style tags: minimalist, scandinavian, japandi, industrial, bohemian, farmhouse, contemporary, coastal, mid-century, maximalist, rustic, art-deco.

**Why:** Static curated set ensures reliable URLs and consistent style coverage.

## Style Profile
Computed on-the-fly in GET /api/style-profile by counting tags from liked photos. No caching in style_profiles table for Task 1. Formula: score = count / likedCount (raw ratio).

## Color Palette
Light: background #FAFAF7, primary #C4815A (terracotta), accent #D4A96A (gold)
Dark: background #0F0D0C, primary #D4A96A (gold), accent #C4815A

## DB Schema
Tables: users, style_photos (tags: text[]), swipes (userId, photoId, liked), style_profiles (unused in Task 1)

## Tab Layout
3 tabs: Discover (quiz swipe), Board (liked photos + style profile bars), Profile (stats + DNA)
Uses NativeTabs (liquid glass) on iOS 26+, falls back to classic Tabs with BlurView.
