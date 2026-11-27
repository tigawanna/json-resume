CREATE TABLE "application_answer" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"question" text DEFAULT '' NOT NULL,
	"answer" text DEFAULT '' NOT NULL,
	"resume_id" text,
	"job_id" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"searchable_text" text DEFAULT '' NOT NULL,
	"embedding" "bytea",
	"embedding_model" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assistant_skill" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"name" text DEFAULT '' NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"scopes" jsonb NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"builtin_key" text,
	"searchable_text" text DEFAULT '' NOT NULL,
	"embedding" "bytea",
	"embedding_model" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "apikey" (
	"id" text PRIMARY KEY NOT NULL,
	"config_id" text DEFAULT 'default' NOT NULL,
	"name" text,
	"start" text,
	"reference_id" text NOT NULL,
	"prefix" text,
	"key" text NOT NULL,
	"refill_interval" integer,
	"refill_amount" integer,
	"last_refill_at" timestamp (3) with time zone,
	"enabled" boolean DEFAULT true,
	"rate_limit_enabled" boolean DEFAULT true,
	"rate_limit_time_window" integer DEFAULT 86400000,
	"rate_limit_max" integer DEFAULT 10,
	"request_count" integer DEFAULT 0,
	"remaining" integer,
	"last_request" timestamp (3) with time zone,
	"expires_at" timestamp (3) with time zone,
	"created_at" timestamp (3) with time zone NOT NULL,
	"updated_at" timestamp (3) with time zone NOT NULL,
	"permissions" text,
	"metadata" text
);
--> statement-breakpoint
CREATE TABLE "jwks" (
	"id" text PRIMARY KEY NOT NULL,
	"public_key" text NOT NULL,
	"private_key" text NOT NULL,
	"created_at" timestamp (3) with time zone NOT NULL,
	"expires_at" timestamp (3) with time zone,
	"alg" text,
	"crv" text
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp (3) with time zone,
	"refresh_token_expires_at" timestamp (3) with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp (3) with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"impersonated_by" text,
	"active_organization_id" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"role" text,
	"banned" boolean DEFAULT false,
	"ban_reason" text,
	"ban_expires" timestamp (3) with time zone,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp (3) with time zone NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oauth_client" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"client_secret" text,
	"disabled" boolean DEFAULT false,
	"skip_consent" boolean,
	"enable_end_session" boolean,
	"subject_type" text,
	"scopes" jsonb,
	"user_id" text,
	"created_at" timestamp (3) with time zone,
	"updated_at" timestamp (3) with time zone,
	"name" text,
	"uri" text,
	"icon" text,
	"contacts" jsonb,
	"tos" text,
	"policy" text,
	"software_id" text,
	"software_version" text,
	"software_statement" text,
	"redirect_uris" jsonb NOT NULL,
	"post_logout_redirect_uris" jsonb,
	"token_endpoint_auth_method" text,
	"grant_types" jsonb,
	"response_types" jsonb,
	"public" boolean,
	"type" text,
	"require_pkce" boolean,
	"reference_id" text,
	"metadata" jsonb,
	CONSTRAINT "oauth_client_client_id_unique" UNIQUE("client_id")
);
--> statement-breakpoint
CREATE TABLE "oauth_access_token" (
	"id" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"client_id" text NOT NULL,
	"session_id" text,
	"user_id" text,
	"reference_id" text,
	"refresh_id" text,
	"expires_at" timestamp (3) with time zone NOT NULL,
	"created_at" timestamp (3) with time zone NOT NULL,
	"scopes" jsonb NOT NULL,
	CONSTRAINT "oauth_access_token_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "oauth_consent" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"user_id" text,
	"reference_id" text,
	"scopes" jsonb NOT NULL,
	"created_at" timestamp (3) with time zone NOT NULL,
	"updated_at" timestamp (3) with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oauth_refresh_token" (
	"id" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"client_id" text NOT NULL,
	"session_id" text,
	"user_id" text NOT NULL,
	"reference_id" text,
	"expires_at" timestamp (3) with time zone NOT NULL,
	"created_at" timestamp (3) with time zone NOT NULL,
	"revoked" timestamp (3) with time zone,
	"auth_time" timestamp (3) with time zone,
	"scopes" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitation" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"email" text NOT NULL,
	"role" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp (3) with time zone NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"inviter_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp (3) with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"logo" text,
	"created_at" timestamp (3) with time zone NOT NULL,
	"metadata" text,
	CONSTRAINT "organization_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "cover_letter" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"title" text DEFAULT '' NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"resume_id" text,
	"job_id" text,
	"searchable_text" text DEFAULT '' NOT NULL,
	"embedding" "bytea",
	"embedding_model" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_ledger" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"bucket" text NOT NULL,
	"type" text NOT NULL,
	"amount" integer NOT NULL,
	"period_key" text,
	"resume_id" text,
	"idempotency_key" text NOT NULL,
	"reason" text,
	"created_by_user_id" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_wallet" (
	"user_id" text PRIMARY KEY NOT NULL,
	"monthly_balance" integer DEFAULT 0 NOT NULL,
	"bonus_balance" integer DEFAULT 0 NOT NULL,
	"monthly_period_key" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "waitlist_entry" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"user_id" text,
	"status" text DEFAULT 'joined' NOT NULL,
	"source" text NOT NULL,
	"consent_at" timestamp (3) with time zone NOT NULL,
	"claimed_at" timestamp (3) with time zone,
	"notes" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"company" text NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"description" text NOT NULL,
	"url" text DEFAULT '' NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"pay_rate" text DEFAULT '' NOT NULL,
	"hourly_min_cents" integer,
	"hourly_max_cents" integer,
	"pay_basis" text,
	"status" text DEFAULT 'saved' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"applied_at" timestamp (3) with time zone,
	"searchable_text" text DEFAULT '' NOT NULL,
	"embedding" "bytea",
	"embedding_model" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limit_counter" (
	"key" text PRIMARY KEY NOT NULL,
	"hits" integer DEFAULT 0 NOT NULL,
	"expires_at" bigint NOT NULL,
	"blocked_until" bigint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "public_resume" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"source_resume_id" text NOT NULL,
	"title" text NOT NULL,
	"document" jsonb NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resume" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"full_name" text DEFAULT '' NOT NULL,
	"headline" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"job_id" text,
	"template_id" text DEFAULT 'classic' NOT NULL,
	"layout" jsonb,
	"searchable_text" text DEFAULT '' NOT NULL,
	"embedding" "bytea",
	"embedding_model" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resume_ai_chat" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"resume_id" text NOT NULL,
	"messages" text DEFAULT '[]' NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resume_ai_conversation" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"resume_id" text NOT NULL,
	"title" text,
	"model" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resume_ai_message" (
	"id" text PRIMARY KEY NOT NULL,
	"message_id" text NOT NULL,
	"conversation_id" text NOT NULL,
	"role" text NOT NULL,
	"position" integer NOT NULL,
	"text_content" text DEFAULT '' NOT NULL,
	"parts" text DEFAULT '[]' NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resume_certification" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"issuer" text DEFAULT '' NOT NULL,
	"date" text DEFAULT '' NOT NULL,
	"url" text DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"searchable_text" text DEFAULT '' NOT NULL,
	"embedding" "bytea",
	"embedding_model" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"user_id" text
);
--> statement-breakpoint
CREATE TABLE "resume_contact" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"value" text NOT NULL,
	"label" text DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"searchable_text" text DEFAULT '' NOT NULL,
	"embedding" "bytea",
	"embedding_model" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"user_id" text
);
--> statement-breakpoint
CREATE TABLE "resume_education" (
	"id" text PRIMARY KEY NOT NULL,
	"school" text NOT NULL,
	"degree" text DEFAULT '' NOT NULL,
	"field" text DEFAULT '' NOT NULL,
	"start_date" text DEFAULT '' NOT NULL,
	"end_date" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"searchable_text" text DEFAULT '' NOT NULL,
	"embedding" "bytea",
	"embedding_model" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"user_id" text
);
--> statement-breakpoint
CREATE TABLE "resume_education_bullet" (
	"id" text PRIMARY KEY NOT NULL,
	"education_id" text NOT NULL,
	"text" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"searchable_text" text DEFAULT '' NOT NULL,
	"embedding" "bytea",
	"embedding_model" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resume_experience" (
	"id" text PRIMARY KEY NOT NULL,
	"company" text NOT NULL,
	"role" text NOT NULL,
	"start_date" text DEFAULT '' NOT NULL,
	"end_date" text DEFAULT '' NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"searchable_text" text DEFAULT '' NOT NULL,
	"embedding" "bytea",
	"embedding_model" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"user_id" text
);
--> statement-breakpoint
CREATE TABLE "resume_experience_bullet" (
	"id" text PRIMARY KEY NOT NULL,
	"experience_id" text NOT NULL,
	"text" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"searchable_text" text DEFAULT '' NOT NULL,
	"embedding" "bytea",
	"embedding_model" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resume_language" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"proficiency" text DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"searchable_text" text DEFAULT '' NOT NULL,
	"embedding" "bytea",
	"embedding_model" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"user_id" text
);
--> statement-breakpoint
CREATE TABLE "resume_link" (
	"id" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"url" text NOT NULL,
	"icon" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"searchable_text" text DEFAULT '' NOT NULL,
	"embedding" "bytea",
	"embedding_model" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"user_id" text
);
--> statement-breakpoint
CREATE TABLE "resume_note" (
	"id" text PRIMARY KEY NOT NULL,
	"label" text DEFAULT 'Notes' NOT NULL,
	"text" text DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"searchable_text" text DEFAULT '' NOT NULL,
	"embedding" "bytea",
	"embedding_model" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"user_id" text
);
--> statement-breakpoint
CREATE TABLE "resume_project" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"url" text DEFAULT '' NOT NULL,
	"homepage_url" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"tech" text DEFAULT '[]' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"searchable_text" text DEFAULT '' NOT NULL,
	"embedding" "bytea",
	"embedding_model" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"user_id" text
);
--> statement-breakpoint
CREATE TABLE "resume_skill" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"name" text NOT NULL,
	"level" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"searchable_text" text DEFAULT '' NOT NULL,
	"embedding" "bytea",
	"embedding_model" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resume_skill_group" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"searchable_text" text DEFAULT '' NOT NULL,
	"embedding" "bytea",
	"embedding_model" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"user_id" text
);
--> statement-breakpoint
CREATE TABLE "resume_summary" (
	"id" text PRIMARY KEY NOT NULL,
	"text" text DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"searchable_text" text DEFAULT '' NOT NULL,
	"embedding" "bytea",
	"embedding_model" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"user_id" text
);
--> statement-breakpoint
CREATE TABLE "resume_talk" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"event" text DEFAULT '' NOT NULL,
	"date" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"links" text DEFAULT '[]' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"searchable_text" text DEFAULT '' NOT NULL,
	"embedding" "bytea",
	"embedding_model" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"user_id" text
);
--> statement-breakpoint
CREATE TABLE "resume_volunteer" (
	"id" text PRIMARY KEY NOT NULL,
	"organization" text NOT NULL,
	"role" text DEFAULT '' NOT NULL,
	"start_date" text DEFAULT '' NOT NULL,
	"end_date" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"searchable_text" text DEFAULT '' NOT NULL,
	"embedding" "bytea",
	"embedding_model" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"user_id" text
);
--> statement-breakpoint
CREATE TABLE "saved_project" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"homepage_url" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"tech" text DEFAULT '[]' NOT NULL,
	"searchable_text" text NOT NULL,
	"embedding" "bytea",
	"embedding_dimensions" integer,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_backend" (
	"id" serial PRIMARY KEY NOT NULL,
	"backend_id" text NOT NULL,
	"last_projected_seq" bigint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_event" (
	"global_seq" bigserial PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"user_id" text NOT NULL,
	"collection_id" text NOT NULL,
	"type" text NOT NULL,
	"key" text NOT NULL,
	"payload" text NOT NULL,
	"previous" text,
	"tx_id" text NOT NULL,
	"client_id" text NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"client_timestamp" bigint NOT NULL,
	"server_timestamp" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"projected_at" timestamp (3) with time zone
);
--> statement-breakpoint
CREATE TABLE "sync_squash_state" (
	"user_id" text PRIMARY KEY NOT NULL,
	"squashed_through_seq" bigint DEFAULT 0 NOT NULL,
	"squashed_at" timestamp (3) with time zone,
	"removed_events" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "application_answer" ADD CONSTRAINT "application_answer_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assistant_skill" ADD CONSTRAINT "assistant_skill_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_client" ADD CONSTRAINT "oauth_client_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_access_token" ADD CONSTRAINT "oauth_access_token_client_id_oauth_client_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."oauth_client"("client_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_access_token" ADD CONSTRAINT "oauth_access_token_session_id_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."session"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_access_token" ADD CONSTRAINT "oauth_access_token_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_access_token" ADD CONSTRAINT "oauth_access_token_refresh_id_oauth_refresh_token_id_fk" FOREIGN KEY ("refresh_id") REFERENCES "public"."oauth_refresh_token"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_consent" ADD CONSTRAINT "oauth_consent_client_id_oauth_client_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."oauth_client"("client_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_consent" ADD CONSTRAINT "oauth_consent_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_refresh_token" ADD CONSTRAINT "oauth_refresh_token_client_id_oauth_client_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."oauth_client"("client_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_refresh_token" ADD CONSTRAINT "oauth_refresh_token_session_id_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."session"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_refresh_token" ADD CONSTRAINT "oauth_refresh_token_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_inviter_id_user_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cover_letter" ADD CONSTRAINT "cover_letter_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_ledger" ADD CONSTRAINT "credit_ledger_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_wallet" ADD CONSTRAINT "credit_wallet_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waitlist_entry" ADD CONSTRAINT "waitlist_entry_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job" ADD CONSTRAINT "job_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public_resume" ADD CONSTRAINT "public_resume_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resume" ADD CONSTRAINT "resume_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resume_ai_chat" ADD CONSTRAINT "resume_ai_chat_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resume_ai_chat" ADD CONSTRAINT "resume_ai_chat_resume_id_resume_id_fk" FOREIGN KEY ("resume_id") REFERENCES "public"."resume"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resume_ai_conversation" ADD CONSTRAINT "resume_ai_conversation_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resume_ai_conversation" ADD CONSTRAINT "resume_ai_conversation_resume_id_resume_id_fk" FOREIGN KEY ("resume_id") REFERENCES "public"."resume"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resume_ai_message" ADD CONSTRAINT "resume_ai_message_conversation_id_resume_ai_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."resume_ai_conversation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resume_education_bullet" ADD CONSTRAINT "resume_education_bullet_education_id_resume_education_id_fk" FOREIGN KEY ("education_id") REFERENCES "public"."resume_education"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resume_experience_bullet" ADD CONSTRAINT "resume_experience_bullet_experience_id_resume_experience_id_fk" FOREIGN KEY ("experience_id") REFERENCES "public"."resume_experience"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_project" ADD CONSTRAINT "saved_project_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_event" ADD CONSTRAINT "sync_event_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_squash_state" ADD CONSTRAINT "sync_squash_state_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "application_answer_userId_idx" ON "application_answer" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "application_answer_userId_updatedAt_idx" ON "application_answer" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "application_answer_jobId_idx" ON "application_answer" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "application_answer_resumeId_idx" ON "application_answer" USING btree ("resume_id");--> statement-breakpoint
CREATE INDEX "assistant_skill_userId_idx" ON "assistant_skill" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "assistant_skill_userId_updatedAt_idx" ON "assistant_skill" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "apikey_configId_idx" ON "apikey" USING btree ("config_id");--> statement-breakpoint
CREATE INDEX "apikey_referenceId_idx" ON "apikey" USING btree ("reference_id");--> statement-breakpoint
CREATE INDEX "apikey_key_idx" ON "apikey" USING btree ("key");--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "invitation_organizationId_idx" ON "invitation" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "invitation_email_idx" ON "invitation" USING btree ("email");--> statement-breakpoint
CREATE INDEX "member_organizationId_idx" ON "member" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "member_userId_idx" ON "member" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_slug_uidx" ON "organization" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "cover_letter_userId_idx" ON "cover_letter" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "cover_letter_userId_updatedAt_idx" ON "cover_letter" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "cover_letter_resumeId_idx" ON "cover_letter" USING btree ("resume_id");--> statement-breakpoint
CREATE UNIQUE INDEX "credit_ledger_idempotencyKey_idx" ON "credit_ledger" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "credit_ledger_userId_createdAt_idx" ON "credit_ledger" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "credit_ledger_resumeId_idx" ON "credit_ledger" USING btree ("resume_id");--> statement-breakpoint
CREATE INDEX "credit_wallet_monthlyPeriodKey_idx" ON "credit_wallet" USING btree ("monthly_period_key");--> statement-breakpoint
CREATE UNIQUE INDEX "waitlist_entry_email_idx" ON "waitlist_entry" USING btree ("email");--> statement-breakpoint
CREATE INDEX "waitlist_entry_status_createdAt_idx" ON "waitlist_entry" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "waitlist_entry_userId_idx" ON "waitlist_entry" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "job_userId_idx" ON "job" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "job_userId_updatedAt_idx" ON "job" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "job_status_idx" ON "job" USING btree ("status");--> statement-breakpoint
CREATE INDEX "public_resume_userId_idx" ON "public_resume" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "public_resume_userId_sourceResumeId_idx" ON "public_resume" USING btree ("user_id","source_resume_id");--> statement-breakpoint
CREATE INDEX "resume_userId_idx" ON "resume" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "resume_updatedAt_idx" ON "resume" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "resume_jobId_idx" ON "resume" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "resume_ai_chat_userId_idx" ON "resume_ai_chat" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "resume_ai_chat_resumeId_idx" ON "resume_ai_chat" USING btree ("resume_id");--> statement-breakpoint
CREATE UNIQUE INDEX "resume_ai_chat_userId_resumeId_idx" ON "resume_ai_chat" USING btree ("user_id","resume_id");--> statement-breakpoint
CREATE INDEX "resume_ai_conversation_userId_idx" ON "resume_ai_conversation" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "resume_ai_conversation_resumeId_idx" ON "resume_ai_conversation" USING btree ("resume_id");--> statement-breakpoint
CREATE INDEX "resume_ai_conversation_userId_updatedAt_idx" ON "resume_ai_conversation" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "resume_ai_conversation_userId_resumeId_idx" ON "resume_ai_conversation" USING btree ("user_id","resume_id");--> statement-breakpoint
CREATE INDEX "resume_ai_message_conversationId_idx" ON "resume_ai_message" USING btree ("conversation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "resume_ai_message_conversationId_position_idx" ON "resume_ai_message" USING btree ("conversation_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "resume_ai_message_conversationId_messageId_idx" ON "resume_ai_message" USING btree ("conversation_id","message_id");--> statement-breakpoint
CREATE INDEX "resume_certification_userId_idx" ON "resume_certification" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "resume_contact_userId_idx" ON "resume_contact" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "resume_education_userId_idx" ON "resume_education" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "resume_education_bullet_educationId_idx" ON "resume_education_bullet" USING btree ("education_id");--> statement-breakpoint
CREATE INDEX "resume_experience_userId_idx" ON "resume_experience" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "resume_exp_bullet_experienceId_idx" ON "resume_experience_bullet" USING btree ("experience_id");--> statement-breakpoint
CREATE INDEX "resume_language_userId_idx" ON "resume_language" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "resume_link_userId_idx" ON "resume_link" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "resume_note_userId_idx" ON "resume_note" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "resume_project_userId_idx" ON "resume_project" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "resume_skill_userId_idx" ON "resume_skill" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "resume_skill_group_userId_idx" ON "resume_skill_group" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "resume_summary_userId_idx" ON "resume_summary" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "resume_talk_userId_idx" ON "resume_talk" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "resume_volunteer_userId_idx" ON "resume_volunteer" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "saved_project_userId_idx" ON "saved_project" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "saved_project_userId_updatedAt_idx" ON "saved_project" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "sync_event_eventId_idx" ON "sync_event" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "sync_event_userId_globalSeq_idx" ON "sync_event" USING btree ("user_id","global_seq");--> statement-breakpoint
CREATE INDEX "sync_event_row_idx" ON "sync_event" USING btree ("collection_id","key","global_seq");--> statement-breakpoint
CREATE INDEX "sync_event_userRow_idx" ON "sync_event" USING btree ("user_id","collection_id","key","global_seq");--> statement-breakpoint
CREATE INDEX "sync_event_projectedAt_idx" ON "sync_event" USING btree ("projected_at");--> statement-breakpoint
CREATE INDEX "sync_squash_state_squashedAt_idx" ON "sync_squash_state" USING btree ("squashed_at");