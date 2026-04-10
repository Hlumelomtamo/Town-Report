// ═══════════════════════════════════════════════════
//  routes/reports.js — Report API Endpoints
//  POST /api/reports       → Submit a new report
//  GET  /api/reports       → Get all reports (with filters)
//  PATCH /api/reports/:id  → Update report status
// ═══════════════════════════════════════════════════

const express    = require("express");
const multer     = require("multer");
const router     = express.Router();

const { analyzeReport }       = require("../services/aiService");
const { saveReport, getAllReports, updateReportStatus } = require("../services/dbService");
const { sendUrgentAlert }     = require("../services/notifyService");

// ── File Upload Setup ────────────────────────────────
// Multer stores uploaded images in memory as a Buffer.
// In production, you'd upload to Supabase Storage or S3.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    // Only allow image files
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

// ── POST /api/reports ────────────────────────────────
// Submit a new service report
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const { title, description, location } = req.body;

    // Basic validation
    if (!title || !description || !location) {
      return res.status(400).json({
        error: "Please provide title, description, and location.",
      });
    }

    console.log(`📥 New report received: "${title}"`);

    // Step 1: Ask AI to categorize and prioritize
    console.log("🤖 Analyzing with AI...");
    const aiResult = await analyzeReport(title, description);
    console.log(`✅ AI result: ${aiResult.category} / ${aiResult.priority}`);

    // Step 2: Build the record to save
    const reportData = {
      title,
      description,
      location,
      category:  aiResult.category,
      priority:  aiResult.priority,
      status:    "Open",
      // image_url would be set here if you integrate Supabase Storage
      image_url: null,
    };

    // Step 3: Save to Supabase
    const saved = await saveReport(reportData);
    console.log(`💾 Report saved with ID: ${saved.id}`);

    // Step 4: Send urgent alert if High priority
    if (aiResult.priority === "High") {
      await sendUrgentAlert(saved);
    }

    // Return the saved report with AI analysis
    res.status(201).json({
      success: true,
      message: "Report submitted successfully!",
      report: saved,
      ai: aiResult,
    });

  } catch (error) {
    console.error("❌ Error submitting report:", error.message);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

// ── GET /api/reports ────────────────────────────────
// Fetch all reports — supports ?category=Water&priority=High&status=Open
router.get("/", async (req, res) => {
  try {
    const { category, priority, status } = req.query;

    // Pass only defined filters
    const filters = {};
    if (category) filters.category = category;
    if (priority) filters.priority = priority;
    if (status)   filters.status   = status;

    const reports = await getAllReports(filters);

    res.json({
      success: true,
      count:   reports.length,
      reports,
    });

  } catch (error) {
    console.error("❌ Error fetching reports:", error.message);
    res.status(500).json({ error: "Failed to fetch reports." });
  }
});

// ── PATCH /api/reports/:id ───────────────────────────
// Update a report's status (for admin use)
router.patch("/:id", async (req, res) => {
  try {
    const { id }     = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: "Please provide a status value." });
    }

    const updated = await updateReportStatus(id, status);

    res.json({
      success: true,
      message: `Status updated to "${status}"`,
      report:  updated,
    });

  } catch (error) {
    console.error("❌ Error updating status:", error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
