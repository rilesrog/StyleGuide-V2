import { pgTable, serial, text, integer, boolean, timestamp, jsonb, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  token: text("token").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  passwordSalt: text("password_salt").notNull(),
  mode: text("mode").default("decoration"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;

export const stylePhotosTable = pgTable("style_photos", {
  id: serial("id").primaryKey(),
  url: text("url").notNull(),
  tags: text("tags").array().notNull().default([]),
  source: text("source").default("curated"),
});

export const insertStylePhotoSchema = createInsertSchema(stylePhotosTable).omit({ id: true });
export type InsertStylePhoto = z.infer<typeof insertStylePhotoSchema>;
export type StylePhoto = typeof stylePhotosTable.$inferSelect;

export const swipesTable = pgTable("swipes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  photoId: integer("photo_id").notNull().references(() => stylePhotosTable.id),
  liked: boolean("liked").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSwipeSchema = createInsertSchema(swipesTable).omit({ id: true, createdAt: true });
export type InsertSwipe = z.infer<typeof insertSwipeSchema>;
export type Swipe = typeof swipesTable.$inferSelect;

export const styleProfilesTable = pgTable("style_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique().references(() => usersTable.id),
  tagWeights: jsonb("tag_weights").notNull().default({}),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertStyleProfileSchema = createInsertSchema(styleProfilesTable).omit({ id: true });
export type InsertStyleProfile = z.infer<typeof insertStyleProfileSchema>;
export type StyleProfile = typeof styleProfilesTable.$inferSelect;

// sessionsTable must be defined before productSwipesTable (FK dependency)
export const sessionsTable = pgTable("sessions", {
  id: serial("id").primaryKey(),
  createdBy: integer("created_by").notNull().references(() => usersTable.id),
  partnerId: integer("partner_id").references(() => usersTable.id),
  inviteToken: text("invite_token").notNull().unique(),
  status: text("status").notNull().default("pending"),
  mode: text("mode").default("style"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSessionSchema = createInsertSchema(sessionsTable).omit({ id: true, createdAt: true });
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessionsTable.$inferSelect;

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  url: text("url").notNull(),
  name: text("name").notNull(),
  price: real("price").notNull(),
  tags: text("tags").array().notNull().default([]),
  category: text("category").notNull().default("general"),
  brand: text("brand"),
  source: text("source").default("mock"),
  affiliateUrl: text("affiliate_url"),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({ id: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;

export const productSwipesTable = pgTable("product_swipes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  productId: integer("product_id").notNull().references(() => productsTable.id),
  sessionId: integer("session_id").references(() => sessionsTable.id),
  liked: boolean("liked").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertProductSwipeSchema = createInsertSchema(productSwipesTable).omit({ id: true, createdAt: true });
export type InsertProductSwipe = z.infer<typeof insertProductSwipeSchema>;
export type ProductSwipe = typeof productSwipesTable.$inferSelect;

export const roomAssignmentsTable = pgTable("room_assignments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  productId: integer("product_id").notNull().references(() => productsTable.id),
  room: text("room").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertRoomAssignmentSchema = createInsertSchema(roomAssignmentsTable).omit({ id: true, createdAt: true });
export type InsertRoomAssignment = z.infer<typeof insertRoomAssignmentSchema>;
export type RoomAssignment = typeof roomAssignmentsTable.$inferSelect;
