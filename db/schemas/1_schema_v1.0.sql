CREATE TYPE "article_status" AS ENUM (
  'published',
  'approved',
  'draft',
  'in_review',
  'refused'
);

CREATE TYPE "faq_status" AS ENUM (
  'published',
  'draft',
  'in_review',
  'refused'
);

CREATE TABLE "articles" (
  "id" SERIAL UNIQUE,
  "article_id" UUID PRIMARY KEY DEFAULT (gen_random_uuid()),
  "category_id" UUID NOT NULL,
  "image" varchar,
  "status" article_status NOT NULL,
  "primary_sources" Array,
  "created_at" timestamp DEFAULT (now()),
  "created_by" UUID NOT NULL
);

CREATE TABLE "article_details" (
  "id" SERIAL UNIQUE,
  "articles_details_id" UUID PRIMARY KEY DEFAULT (gen_random_uuid()),
  "language_id" UUID,
  "article_id" UUID NOT NULL,
  "title" varchar NOT NULL,
  "reading_time" int,
  "read_count" int,
  "content" varchar NOT NULL,
  "created_at" timestamp DEFAULT (now()),
  "updated_by" UUID,
  "created_by" UUID NOT NULL
);

CREATE TABLE "articles_to_countries" (
  "id" SERIAL UNIQUE,
  "country_id" UUID NOT NULL,
  "article_id" UUID NOT NULL,
  "created_at" timestamp DEFAULT (now())
);

CREATE TABLE "categories" (
  "id" SERIAL UNIQUE,
  "category_id" UUID PRIMARY KEY DEFAULT (gen_random_uuid()),
  "name" varchar NOT NULL,
  "image" varchar,
  "created_at" timestamp DEFAULT (now()),
  "created_by" UUID NOT NULL,
  "updated_at" timestamp DEFAULT NULL,
  "deleted_at" timestamp DEFAULT NULL
);

CREATE TABLE "tags" (
  "id" SERIAL UNIQUE,
  "tag_id" UUID PRIMARY KEY DEFAULT (gen_random_uuid()),
  "name" varchar NOT NULL,
  "created_at" timestamp DEFAULT (now()),
  "updated_at" timestamp DEFAULT NULL,
  "deleted_at" timestamp DEFAULT NULL
);

CREATE TABLE "articles_to_tags" (
  "id" SERIAL UNIQUE,
  "article_id" UUID NOT NULL,
  "tag_id" UUID NOT NULL,
  "created_at" timestamp DEFAULT (now())
);

CREATE TABLE "faqs" (
  "id" SERIAL UNIQUE,
  "faq_id" UUID PRIMARY KEY DEFAULT (gen_random_uuid()),
  "status" faq_status NOT NULL,
  "created_at" timestamp DEFAULT (now()),
  "created_by" UUID NOT NULL
);

CREATE TABLE "faq_details" (
  "id" SERIAL UNIQUE,
  "faq_id" UUID PRIMARY KEY DEFAULT (gen_random_uuid()),
  "language_id" UUID NOT NULL,
  "question" varchar NOT NULL,
  "answer" varchar,
  "created_at" timestamp DEFAULT (now()),
  "created_by" UUID NOT NULL,
  "updated_by" UUID NOT NULL
);

CREATE TABLE "faq_to_country" (
  "id" SERIAL UNIQUE,
  "country_id" UUID NOT NULL,
  "faq_id" UUID NOT NULL,
  "created_at" timestamp DEFAULT (now())
);

ALTER TABLE "articles" ADD FOREIGN KEY ("category_id") REFERENCES "categories" ("category_id");

ALTER TABLE "article_details" ADD FOREIGN KEY ("article_id") REFERENCES "articles" ("article_id");

ALTER TABLE "articles_to_tags" ADD FOREIGN KEY ("article_id") REFERENCES "articles" ("article_id");

ALTER TABLE "articles_to_tags" ADD FOREIGN KEY ("tag_id") REFERENCES "tags" ("tag_id");

ALTER TABLE "faq_details" ADD FOREIGN KEY ("faq_id") REFERENCES "faqs" ("faq_id");
