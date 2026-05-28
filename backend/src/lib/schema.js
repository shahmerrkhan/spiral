import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

// Example schema - agent will modify this based on requirements
export const users = pgTable("users", {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow(),
});

export const shareSnapshots = pgTable("share_snapshots", {
    id: text("id").primaryKey(),
    data: jsonb("data").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const battles = pgTable("battles", {
    id: uuid("id").defaultRandom().primaryKey(),
    battle_name: text("battle_name").notNull(),
    goal_text: text("goal_text").notNull(),
    user_1_id: uuid("user_1_id").notNull(),
    user_2_id: uuid("user_2_id").notNull(),
    user_1_score: text("user_1_score").default("0"),
    user_2_score: text("user_2_score").default("0"),
    status: text("status").default("active"), // active, completed
    created_at: timestamp("created_at").defaultNow(),
    updated_at: timestamp("updated_at").defaultNow(),
});

export const battle_logs = pgTable("battle_logs", {
    id: uuid("id").defaultRandom().primaryKey(),
    battle_id: uuid("battle_id").notNull(),
    user_id: uuid("user_id").notNull(),
    week_number: text("week_number").notNull(),
    effort_score: text("effort_score").notNull(),
    log_text: text("log_text"),
    created_at: timestamp("created_at").defaultNow(),
});
