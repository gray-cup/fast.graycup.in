CREATE TABLE IF NOT EXISTS "pincodes" (
  "pincode" text PRIMARY KEY,
  "latitude" real NOT NULL,
  "longitude" real NOT NULL,
  "city" text,
  "state" text,
  "district" text
);
