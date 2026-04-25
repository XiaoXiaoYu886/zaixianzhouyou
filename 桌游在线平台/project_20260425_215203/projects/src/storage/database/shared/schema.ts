import { sql } from "drizzle-orm";
import { pgTable, varchar, timestamp, boolean, integer, jsonb, index, text, serial } from "drizzle-orm/pg-core";
import { createSchemaFactory } from "drizzle-zod";
import { z } from "zod";

// 用户资料表（扩展 Supabase Auth）
export const profiles = pgTable(
  "profiles",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    user_id: varchar("user_id", { length: 36 }).notNull().unique(), // 关联 Supabase Auth
    username: varchar("username", { length: 50 }).notNull().unique(),
    avatar_url: varchar("avatar_url", { length: 500 }),
    total_games: integer("total_games").default(0).notNull(),
    total_wins: integer("total_wins").default(0).notNull(),
    total_score: integer("total_score").default(0).notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("profiles_user_id_idx").on(table.user_id),
    index("profiles_username_idx").on(table.username),
    index("profiles_total_score_idx").on(table.total_score),
  ]
);

// 房间表
export const rooms = pgTable(
  "rooms",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    room_code: varchar("room_code", { length: 8 }).notNull().unique(),
    room_name: varchar("room_name", { length: 100 }).notNull(),
    game_type: varchar("game_type", { length: 50 }).notNull(), // ludo, blackjack, etc.
    max_players: integer("max_players").default(4).notNull(),
    current_players: integer("current_players").default(0).notNull(),
    status: varchar("status", { length: 20 }).default("waiting").notNull(), // waiting, playing, finished
    host_id: varchar("host_id", { length: 36 }).notNull(),
    settings: jsonb("settings"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("rooms_room_code_idx").on(table.room_code),
    index("rooms_game_type_idx").on(table.game_type),
    index("rooms_status_idx").on(table.status),
    index("rooms_host_id_idx").on(table.host_id),
  ]
);

// 玩家房间关系表
export const room_players = pgTable(
  "room_players",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    room_id: varchar("room_id", { length: 36 }).notNull().references(() => rooms.id, { onDelete: "cascade" }),
    user_id: varchar("user_id", { length: 36 }).notNull().references(() => profiles.id, { onDelete: "cascade" }),
    player_position: integer("player_position").default(0).notNull(), // 玩家在房间中的位置
    is_ready: boolean("is_ready").default(false).notNull(),
    is_online: boolean("is_online").default(true).notNull(),
    score: integer("score").default(0).notNull(),
    joined_at: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("room_players_room_id_idx").on(table.room_id),
    index("room_players_user_id_idx").on(table.user_id),
  ]
);

// 游戏记录表
export const game_records = pgTable(
  "game_records",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    room_id: varchar("room_id", { length: 36 }).notNull().references(() => rooms.id, { onDelete: "cascade" }),
    game_type: varchar("game_type", { length: 50 }).notNull(),
    winner_id: varchar("winner_id", { length: 36 }).references(() => profiles.id),
    game_data: jsonb("game_data"), // 游戏过程数据
    started_at: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    ended_at: timestamp("ended_at", { withTimezone: true }),
    duration: integer("duration"), // 游戏时长（秒）
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("game_records_room_id_idx").on(table.room_id),
    index("game_records_game_type_idx").on(table.game_type),
    index("game_records_winner_id_idx").on(table.winner_id),
  ]
);

// 玩家游戏记录表（关联每局游戏中各玩家的表现）
export const player_game_records = pgTable(
  "player_game_records",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    game_record_id: varchar("game_record_id", { length: 36 }).notNull().references(() => game_records.id, { onDelete: "cascade" }),
    user_id: varchar("user_id", { length: 36 }).notNull().references(() => profiles.id, { onDelete: "cascade" }),
    final_score: integer("final_score").default(0).notNull(),
    rank: integer("rank"),
    is_winner: boolean("is_winner").default(false).notNull(),
    stats: jsonb("stats"), // 玩家在这局游戏中的详细数据
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("player_game_records_game_record_id_idx").on(table.game_record_id),
    index("player_game_records_user_id_idx").on(table.user_id),
  ]
);

// 聊天记录表
export const chat_messages = pgTable(
  "chat_messages",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    room_id: varchar("room_id", { length: 36 }).notNull().references(() => rooms.id, { onDelete: "cascade" }),
    user_id: varchar("user_id", { length: 36 }).notNull().references(() => profiles.id, { onDelete: "cascade" }),
    message: text("message").notNull(),
    message_type: varchar("message_type", { length: 20 }).default("text").notNull(), // text, system, game_action
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("chat_messages_room_id_idx").on(table.room_id),
    index("chat_messages_user_id_idx").on(table.user_id),
    index("chat_messages_created_at_idx").on(table.created_at),
  ]
);

// Zod Schemas
const { createInsertSchema: createCoercedInsertSchema } = createSchemaFactory({ coerce: { date: true } });

export const insertProfileSchema = createCoercedInsertSchema(profiles).omit({ id: true });
export type Profile = typeof profiles.$inferSelect;
export type InsertProfile = z.infer<typeof insertProfileSchema>;

export const insertRoomSchema = createCoercedInsertSchema(rooms).omit({ id: true });
export type Room = typeof rooms.$inferSelect;
export type InsertRoom = z.infer<typeof insertRoomSchema>;

export const insertRoomPlayerSchema = createCoercedInsertSchema(room_players).omit({ id: true });
export type RoomPlayer = typeof room_players.$inferSelect;
export type InsertRoomPlayer = z.infer<typeof insertRoomPlayerSchema>;

export const insertGameRecordSchema = createCoercedInsertSchema(game_records).omit({ id: true });
export type GameRecord = typeof game_records.$inferSelect;
export type InsertGameRecord = z.infer<typeof insertGameRecordSchema>;

export const insertPlayerGameRecordSchema = createCoercedInsertSchema(player_game_records).omit({ id: true });
export type PlayerGameRecord = typeof player_game_records.$inferSelect;
export type InsertPlayerGameRecord = z.infer<typeof insertPlayerGameRecordSchema>;

export const insertChatMessageSchema = createCoercedInsertSchema(chat_messages).omit({ id: true });
export type ChatMessage = typeof chat_messages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
