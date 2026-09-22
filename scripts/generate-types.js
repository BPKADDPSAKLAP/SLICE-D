// ONE-OFF SCRIPT — not part of the app. Introspects a Postgres
// database (here: the local test DB used to validate the Phase 2
// migrations) and writes types/database.ts in Supabase's generated
// shape. Once a real Supabase project exists, prefer regenerating
// with the official CLI:
//   npx supabase gen types typescript --project-id <ref> > types/database.ts
const { Client } = require("pg");
const fs = require("fs");

const PG_TO_TS = {
  uuid: "string",
  text: "string",
  boolean: "boolean",
  integer: "number",
  bigint: "number",
  numeric: "number",
  date: "string",
  timestamptz: "string",
  "timestamp with time zone": "string",
  jsonb: "Json",
};

// Hand-mapped from CHECK constraints (information_schema doesn't
// expose the constraint's literal set in a trivially queryable way).
const ENUM_COLUMNS = {
  "profiles.role": ["'admin'", "'opd'"],
  "recon_headers.status_opd": ["'DRAFT'", "'SUBMITTED'"],
  "recon_headers.status_admin": ["'PENDING'", "'VERIFIED'"],
};

function tsType(table, col, dataType) {
  const key = `${table}.${col}`;
  if (ENUM_COLUMNS[key]) return ENUM_COLUMNS[key].join(" | ");
  return PG_TO_TS[dataType] || "unknown";
}

async function main() {
  const client = new Client({
    connectionString: "postgresql://postgres:postgres@localhost:5432/slice_d_test",
  });
  await client.connect();

  const { rows: tables } = await client.query(`
    select table_name
    from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE'
    order by table_name
  `);

  const { rows: views } = await client.query(`
    select table_name
    from information_schema.views
    where table_schema = 'public'
    order by table_name
  `);

  async function getColumns(name) {
    const { rows } = await client.query(
      `
      select column_name, data_type, is_nullable, column_default
      from information_schema.columns
      where table_schema = 'public' and table_name = $1
      order by ordinal_position
      `,
      [name]
    );
    return rows;
  }

  function buildRowType(tableName, cols) {
    return cols
      .map((c) => {
        const ts = tsType(tableName, c.column_name, c.data_type);
        const nullable = c.is_nullable === "YES";
        return `          ${c.column_name}: ${ts}${nullable ? " | null" : ""};`;
      })
      .join("\n");
  }

  function buildInsertType(tableName, cols) {
    return cols
      .map((c) => {
        const ts = tsType(tableName, c.column_name, c.data_type);
        const nullable = c.is_nullable === "YES";
        const hasDefault = c.column_default !== null;
        const optional = nullable || hasDefault;
        return `          ${c.column_name}${optional ? "?" : ""}: ${ts}${nullable ? " | null" : ""};`;
      })
      .join("\n");
  }

  function buildUpdateType(tableName, cols) {
    return cols
      .map((c) => {
        const ts = tsType(tableName, c.column_name, c.data_type);
        const nullable = c.is_nullable === "YES";
        return `          ${c.column_name}?: ${ts}${nullable ? " | null" : ""};`;
      })
      .join("\n");
  }

  let tablesBlock = "";
  for (const t of tables) {
    const cols = await getColumns(t.table_name);
    tablesBlock += `      ${t.table_name}: {
        Row: {
${buildRowType(t.table_name, cols)}
        };
        Insert: {
${buildInsertType(t.table_name, cols)}
        };
        Update: {
${buildUpdateType(t.table_name, cols)}
        };
        Relationships: [];
      };
`;
  }

  let viewsBlock = "";
  for (const v of views) {
    const cols = await getColumns(v.table_name);
    viewsBlock += `      ${v.table_name}: {
        Row: {
${buildRowType(v.table_name, cols)}
        };
        Relationships: [];
      };
`;
  }

  const output = `/**
 * GENERATED FILE — do not hand-edit.
 *
 * Produced by introspecting the Phase 2 migrations applied to a
 * local Postgres instance (scripts/generate-types.js), matching the
 * shape Supabase's own \`supabase gen types typescript\` produces.
 * Regenerate the same way after any schema change, or — once a real
 * Supabase project exists — with:
 *
 *   npx supabase gen types typescript --project-id <project-ref> > types/database.ts
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
${tablesBlock}    };
    Views: {
${viewsBlock}    };
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      get_my_opd_id: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
`;

  fs.writeFileSync("types/database.ts", output);
  console.log("types/database.ts written:", output.length, "bytes");
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
