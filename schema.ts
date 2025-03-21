import { Message } from "ai";
import { InferSelectModel } from "drizzle-orm";
import {
  pgTable,
  varchar,
  text,
  real,
  timestamp,
  json,
  serial,
} from "drizzle-orm/pg-core";

export const user = pgTable("User", {
  email: varchar("email", { length: 64 }).primaryKey().notNull(),
  password: varchar("password", { length: 64 }),
  role: varchar("role", { length: 20 }).notNull().default("user"),
});

export const chat = pgTable("Chat", {
  id: text("id").primaryKey().notNull(),
  createdAt: timestamp("createdAt").notNull(),
  messages: json("messages").notNull(),
  author: varchar("author", { length: 64 })
    .notNull()
    .references(() => user.email),
});

export const chunk = pgTable("Chunk", {
  id: text("id").primaryKey().notNull(),
  filePath: text("filePath").notNull(),
  content: text("content").notNull(),
  embedding: real("embedding").array().notNull(),
});

export const pineconeIds = pgTable("pinecone_ids", {
  id: serial("id").primaryKey(),
  filePath: text("file_path").notNull(),
  vectorIds: text("vector_ids").notNull(),  // JSON string of IDs
  createdAt: timestamp("created_at").notNull()
});

export type Chat = Omit<InferSelectModel<typeof chat>, "messages"> & {
  messages: Array<Message>;
};

export type Chunk = InferSelectModel<typeof chunk>;
