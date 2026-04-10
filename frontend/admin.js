// ═══════════════════════════════════════════════════
//  admin.js — Dashboard Logic
//  Loads reports from the API, renders the table,
//  updates stats, and handles status changes.
// ═══════════════════════════════════════════════════

// ── Config ───────────────────────────────────────────
const API_BASE = "http://localhost:3000"; // Change when deployed

// ── Load and render reports ──────────────────────────
async function loadReports() {
  const tbody      = document.getElementById("reportsTableBody");
  const emptyState = document.getElementById("emptyState");
  const lastUpdated= document.getElementById("lastUpdated");

  // Show loading state
  tbody.innerHTML = `
    <tr>
      <td colspan="5" style="text-align:center; padding:2rem; color:var(--muted)">
        <span class="spinner" style="border-color:rgba(0,0,0,0.1); border-top-color:var(--accent)"></span>
        Loading reports...
      </td>
    </tr>`;

  // Read active filters from the dropdowns
  const category = document.getElementById("filterCategory").value;
  const priority  = document.getElementById("filterPriority").value;
  const status    = document.getElementById("filterStatus").value;

  // Build query string with only non-empty filters
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (priority)  params.set("priority",  priority);
  if (status)    params.set("status",    status);

  try {
    const response = await fetch(`${API_BASE}/api/reports?${params}`);
    const data     = await response.json();

    if (!response.ok) throw new Error(data.error || "Failed to load");

    const reports = data.reports || [];

    // Update stats (always fetch without filters for accurate totals)
    await updateStats();

    // Render the table rows
    if (reports.length === 0) {
      tbody.innerHTML  = "";
      emptyState.style.display = "block";
    } else {
      emptyState.style.display = "none";
      tbody.innerHTML = reports.map(renderRow).join("");
    }

    // Update the last-refreshed timestamp
    lastUpdated.textContent = `${reports.length} reports · Last updated ${formatTime(new Date())}`;

  } catch (error) {
    console.error("Error loading reports:", error);
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center; padding:2rem; color:var(--high)">
          ❌ Could not load reports. Is the server running?
        </td>
      </tr>`;
  }
}

// ── Render a single table row ────────────────────────
function renderRow(report) {
  const date = new Date(report.created_at);

  // Map status to a CSS-safe class name (spaces → dashes)
  const statusClass = report.status.replace(" ", "-");

  return `
    <tr>
      <!-- Title + Location -->
      <td style="max-width:280px">
        <div class="report-title">${escapeHtml(report.title)}</div>
        <div class="report-location">📍 ${escapeHtml(report.location)}</div>
        <div style="font-size:0.78rem; color:var(--muted); margin-top:0.2rem">
          ID: ${report.id.slice(0, 8).toUpperCase()}
        </div>
      </td>

      <!-- Category badge -->
      <td>
        <span class="badge badge-${report.category}">
          ${categoryIcon(report.category)} ${report.category}
        </span>
      </td>

      <!-- Priority badge -->
      <td>
        <span class="badge badge-${report.priority}">${report.priority}</span>
      </td>

      <!-- Status dropdown — admin can change this -->
      <td>
        <select
          class="status-select badge badge-${statusClass}"
          onchange="updateStatus('${report.id}', this.value, this)"
        >
          <option ${report.status === 'Open'        ? 'selected' : ''}>Open</option>
          <option ${report.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
          <option ${report.status === 'Resolved'    ? 'selected' : ''}>Resolved</option>
        </select>
      </td>

      <!-- Date -->
      <td style="white-space:nowrap; color:var(--muted)">
        ${formatDate(date)}
        <br>
        <span style="font-size:0.78rem">${formatTime(date)}</span>
      </td>
    </tr>`;
}

// ── Update a report's status ──────────────────────────
async function updateStatus(id, newStatus, selectEl) {
  try {
    const response = await fetch(`${API_BASE}/api/reports/${id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ status: newStatus }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error);

    // Update badge class on the select element
    const statusClass = newStatus.replace(" ", "-");
    selectEl.className = `status-select badge badge-${statusClass}`;

    showToast(`✅ Status updated to "${newStatus}"`, "success");

    // Refresh stats
    await updateStats();

  } catch (error) {
    showToast(`❌ ${error.message}`, "error");
  }
}

// ── Fetch and display summary stats ──────────────────
async function updateStats() {
  try {
    // Fetch all reports (no filter) to compute totals
    const response = await fetch(`${API_BASE}/api/reports`);
    const data     = await response.json();
    const reports  = data.reports || [];

    document.getElementById("statTotal").textContent =
      reports.length;

    document.getElementById("statHigh").textContent =
      reports.filter(r => r.priority === "High").length;

    document.getElementById("statOpen").textContent =
      reports.filter(r => r.status === "Open").length;

    document.getElementById("statResolved").textContent =
      reports.filter(r => r.status === "Resolved").length;

  } catch {
    // Silently fail — stats are non-critical
  }
}

// ── Clear all active filters ──────────────────────────
function clearFilters() {
  document.getElementById("filterCategory").value = "";
  document.getElementById("filterPriority").value  = "";
  document.getElementById("filterStatus").value    = "";
  loadReports();
}

// ── Utility: emoji icon for each category ────────────
function categoryIcon(category) {
  const icons = {
    Water:       "💧",
    Electricity: "⚡",
    Roads:       "🛣️",
    Waste:       "♻️",
    Other:       "📋",
  };
  return icons[category] || "📋";
}

// ── Utility: format date as "12 Apr 2025" ────────────
function formatDate(date) {
  return date.toLocaleDateString("en-ZA", {
    day: "numeric", month: "short", year: "numeric",
  });
}

// ── Utility: format time as "14:32" ─────────────────
function formatTime(date) {
  return date.toLocaleTimeString("en-ZA", {
    hour: "2-digit", minute: "2-digit",
  });
}

// ── Utility: prevent XSS by escaping HTML ────────────
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ── Toast notification (same as submit.js) ────────────
function showToast(message, type = "success") {
  document.querySelectorAll(".toast").forEach(t => t.remove());
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// ── Auto-refresh every 60 seconds ────────────────────
setInterval(loadReports, 60_000);

// ── Initial load when the page opens ──────────────────
loadReports();
