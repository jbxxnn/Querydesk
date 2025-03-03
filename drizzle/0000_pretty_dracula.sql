CREATE TABLE IF NOT EXISTS "Chat" (
	"id" text PRIMARY KEY NOT NULL,
	"createdAt" timestamp NOT NULL,
	"messages" json NOT NULL,
	"author" varchar(64) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Chunk" (
	"id" text PRIMARY KEY NOT NULL,
	"filePath" text NOT NULL,
	"content" text NOT NULL,
	"embedding" real[] NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "User" (
	"email" varchar(64) PRIMARY KEY NOT NULL,
	"password" varchar(64),
	"role" varchar(20) DEFAULT 'user' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pinecone_ids" (
	"id" serial PRIMARY KEY NOT NULL,
	"file_path" text NOT NULL,
	"vector_ids" text NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Chat" ADD CONSTRAINT "Chat_author_User_email_fk" FOREIGN KEY ("author") REFERENCES "public"."User"("email") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
