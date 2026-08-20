const { pool } = require("../src/config/db");

async function applySearchIndexes() {
  console.log("⚡ [PostgreSQL Optimization] Applying GIN Trigram Search Indexes...");

  try {
    await pool.query("CREATE EXTENSION IF NOT EXISTS pg_trgm;");
    console.log("  ✅ Extension pg_trgm enabled.");

    await pool.query('CREATE INDEX IF NOT EXISTS idx_project_title_trgm ON "Project" USING gin (title gin_trgm_ops);');
    console.log("  ✅ GIN index idx_project_title_trgm created.");

    await pool.query('CREATE INDEX IF NOT EXISTS idx_project_desc_trgm ON "Project" USING gin (description gin_trgm_ops);');
    console.log("  ✅ GIN index idx_project_desc_trgm created.");

    await pool.query('CREATE INDEX IF NOT EXISTS idx_user_name_trgm ON "User" USING gin (name gin_trgm_ops);');
    console.log("  ✅ GIN index idx_user_name_trgm created.");

    console.log("✨ PostgreSQL search optimization complete! Fast ILIKE queries enabled.");
  } catch (err) {
    console.log("⚠️ Search Index Warning (non-fatal):", err.message);
  } finally {
    await pool.end();
  }
}

applySearchIndexes();
