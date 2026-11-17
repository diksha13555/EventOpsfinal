// Collects the database setup SQL: the core files first, then every file in the ".d" folders,
// in file-name order. This is how teammates add their own tables without editing shared files:
//   db/schema.d/30-participant.sql   (tables)      db/seed.d/30-participant.sql   (sample data)
// Name files with a two-digit number first (20-..., 30-...) so the order is clear.
import coreSchema from "../../db/schema.sql?raw";
import coreSeed from "../../db/seed.sql?raw";

const schemaParts = import.meta.glob("../../db/schema.d/*.sql", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
const seedParts = import.meta.glob("../../db/seed.d/*.sql", { query: "?raw", import: "default", eager: true }) as Record<string, string>;

const inOrder = (parts: Record<string, string>) =>
  Object.keys(parts)
    .sort()
    .map((key) => parts[key] ?? "");

export const schemaSql = [coreSchema, ...inOrder(schemaParts)].join("\n");
export const seedSql = [coreSeed, ...inOrder(seedParts)].join("\n");
