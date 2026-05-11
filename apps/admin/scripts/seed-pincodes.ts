/**
 * Seed the pincodes table from pincode-with-coords.txt.
 * Run: npx tsx scripts/seed-pincodes.ts
 *
 * Each pincode may appear multiple times (different localities). We average
 * the lat/lng and keep the first city/state/district we encounter.
 */

import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL env var required");

const db = drizzle(neon(DATABASE_URL));

type Row = { latSum: number; lngSum: number; count: number; city: string; state: string; district: string };

async function main() {
  const file = path.join(__dirname, "../lib/pincode-with-coords.txt");
  const rl = readline.createInterface({ input: fs.createReadStream(file) });

  const map = new Map<string, Row>();

  for await (const line of rl) {
    const parts = line.split("\t");
    if (parts.length < 11) continue;
    const pincode = parts[1]?.trim();
    const city = parts[2]?.trim() ?? "";
    const state = parts[3]?.trim() ?? "";
    const district = parts[5]?.trim() ?? "";
    const lat = parseFloat(parts[9]);
    const lng = parseFloat(parts[10]);
    if (!pincode || isNaN(lat) || isNaN(lng)) continue;

    const existing = map.get(pincode);
    if (existing) {
      existing.latSum += lat;
      existing.lngSum += lng;
      existing.count += 1;
    } else {
      map.set(pincode, { latSum: lat, lngSum: lng, count: 1, city, state, district });
    }
  }

  console.log(`Parsed ${map.size} unique pincodes. Seeding...`);

  // Ensure table exists
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS pincodes (
      pincode TEXT PRIMARY KEY,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      city TEXT,
      state TEXT,
      district TEXT
    )
  `);

  // Batch insert in chunks of 500
  const entries = Array.from(map.entries());
  const CHUNK = 500;
  let inserted = 0;

  for (let i = 0; i < entries.length; i += CHUNK) {
    const chunk = entries.slice(i, i + CHUNK);
    const values = chunk
      .map(([pincode, r]) => {
        const lat = r.latSum / r.count;
        const lng = r.lngSum / r.count;
        const city = r.city.replace(/'/g, "''");
        const state = r.state.replace(/'/g, "''");
        const district = r.district.replace(/'/g, "''");
        return `('${pincode}', ${lat}, ${lng}, '${city}', '${state}', '${district}')`;
      })
      .join(",\n");

    await db.execute(sql.raw(`
      INSERT INTO pincodes (pincode, latitude, longitude, city, state, district)
      VALUES ${values}
      ON CONFLICT (pincode) DO UPDATE SET
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        city = EXCLUDED.city,
        state = EXCLUDED.state,
        district = EXCLUDED.district
    `));

    inserted += chunk.length;
    process.stdout.write(`\r${inserted}/${entries.length}`);
  }

  console.log(`\nDone. Seeded ${inserted} pincodes.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
