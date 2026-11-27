import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { session, user } from "./core.ts";
import { oauthClient } from "./oauth-client.ts";

const timestampMs = (name: string) =>
  timestamp(name, { mode: "date", precision: 3, withTimezone: true });

export const oauthRefreshToken = pgTable("oauth_refresh_token", {
  id: text("id").primaryKey(),
  token: text("token").notNull(),
  clientId: text("client_id")
    .notNull()
    .references(() => oauthClient.clientId, { onDelete: "cascade" }),
  sessionId: text("session_id").references(() => session.id, {
    onDelete: "set null",
  }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  referenceId: text("reference_id"),
  expiresAt: timestampMs("expires_at").notNull(),
  createdAt: timestampMs("created_at").notNull(),
  revoked: timestampMs("revoked"),
  authTime: timestampMs("auth_time"),
  scopes: jsonb("scopes").notNull(),
});

export const oauthAccessToken = pgTable("oauth_access_token", {
  id: text("id").primaryKey(),
  token: text("token").notNull().unique("oauth_access_token_token_unique"),
  clientId: text("client_id")
    .notNull()
    .references(() => oauthClient.clientId, { onDelete: "cascade" }),
  sessionId: text("session_id").references(() => session.id, {
    onDelete: "set null",
  }),
  userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
  referenceId: text("reference_id"),
  refreshId: text("refresh_id").references(() => oauthRefreshToken.id, {
    onDelete: "cascade",
  }),
  expiresAt: timestampMs("expires_at").notNull(),
  createdAt: timestampMs("created_at").notNull(),
  scopes: jsonb("scopes").notNull(),
});

export const oauthConsent = pgTable("oauth_consent", {
  id: text("id").primaryKey(),
  clientId: text("client_id")
    .notNull()
    .references(() => oauthClient.clientId, { onDelete: "cascade" }),
  userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
  referenceId: text("reference_id"),
  scopes: jsonb("scopes").notNull(),
  createdAt: timestampMs("created_at").notNull(),
  updatedAt: timestampMs("updated_at").notNull(),
});
