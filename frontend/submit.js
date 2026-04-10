const API_BASE = "http://localhost:3000";

const form      = document.getElementById("reportForm");
const submitBtn = document.getElementById("submitBtn");
const aiResult  = document.getElementById("aiResult");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const title       = document.getElementById("title").value.trim();
  const description = document.getElementById("description").value.trim();
  const location    = document.getElementById("location").value.trim();

  if (!title || !description || !location) {
    alert("Please fill in all required fields.");
    return;
  }

  submitBtn.disabled    = true;
  submitBtn.textContent = "Submitting...";

  try {
    const response = await fetch(`${API_BASE}/api/reports`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ title, description, location }),
    });

    const data = await response.json();

    if (!response.ok) throw new Error(data.error || "Submission failed");

    // Show result
    document.getElementById("aiCategory").textContent = data.report?.category || "Pending";
    document.getElementById("aiPriority").textContent = data.report?.priority || "Pending";
    document.getElementById("aiReasoning").textContent = "";
    aiResult.classList.add("show");

    alert(`✅ Report submitted successfully!`);
    form.reset();

  } catch (error) {
    alert(`❌ Error: ${error.message}`);
  } finally {
    submitBtn.disabled    = false;
    submitBtn.textContent = "Submit Report";
  }
});