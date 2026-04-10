// ═══════════════════════════════════════════════════
//  dbService.js — Supabase Database Operations
//  All database reads and writes go through here.
// ═══════════════════════════════════════════════════

const { createClient } = require("@supabase/supabase-js");

// Initialize Supabase client with credentials from .env
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

/**
 * saveReport()
 * Inserts a new report record into the `reports` table.
 *
 * @param {object} reportData - All report fields
 * @returns {object} The saved report record (with its new ID)
 */
async function saveReport(reportData) {
  const { data, error } = await supabase
    .from("reports")
    .insert([reportData])   // Supabase expects an array
    .select()               // Return the inserted row
    .single();              // We only inserted one row

  if (error) {
    console.error("❌ Supabase insert error:", error.message);
    throw new Error("Failed to save report to database");
  }

  return data;
}

/**
 * getAllReports()
 * Fetches all reports with optional filtering by category, priority, or status.
 * Results are sorted newest first.
 *
 * @param {object} filters - { category, priority, status } (all optional)
 * @returns {array} Array of report objects
 */
async function getAllReports(filters = {}) {
  // Start building the query
  let query = supabase
    .from("reports")
    .select("*")
    .order("created_at", { ascending: false }); // Newest first

  // Apply filters only if they were provided
  if (filters.category) query = query.eq("category", filters.category);
  if (filters.priority) query = query.eq("priority", filters.priority);
  if (filters.status)   query = query.eq("status",   filters.status);

  const { data, error } = await query;

  if (error) {
    console.error("❌ Supabase select error:", error.message);
    throw new Error("Failed to fetch reports from database");
  }

  return data;
}

/**
 * updateReportStatus()
 * Allows admin to update a report's status (Open → In Progress → Resolved).
 *
 * @param {string} id     - The report UUID
 * @param {string} status - New status value
 * @returns {object} The updated report record
 */
async function updateReportStatus(id, status) {
  const validStatuses = ["Open", "In Progress", "Resolved"];
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status. Must be one of: ${validStatuses.join(", ")}`);
  }

  const { data, error } = await supabase
    .from("reports")
    .update({ status })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("❌ Supabase update error:", error.message);
    throw new Error("Failed to update report status");
  }

  return data;
}

module.exports = { saveReport, getAllReports, updateReportStatus };
