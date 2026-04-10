// ═══════════════════════════════════════════════════
//  aiService.js — OpenAI Integration
//  Analyzes report descriptions to assign a category
//  and priority level using GPT.
// ═══════════════════════════════════════════════════

const OpenAI = require("openai");

// Initialize OpenAI client with your API key from .env
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * analyzeReport()
 * Sends the report title + description to GPT and gets back
 * a category and priority in structured JSON format.
 *
 * @param {string} title       - The report title
 * @param {string} description - The report description
 * @returns {{ category: string, priority: string }}
 */
async function analyzeReport(title, description) {
  const prompt = `
You are a municipal service assistant for a small town.
Analyze the following service issue report and return ONLY a JSON object.

Report Title: "${title}"
Report Description: "${description}"

Classify the report into exactly one of these categories:
- Water       (pipe bursts, leaks, water outages, flooding)
- Electricity (power outages, broken streetlights, downed lines)
- Roads       (potholes, damaged roads, broken signage, pavements)
- Waste       (uncollected garbage, illegal dumping, overflowing bins)
- Other       (anything that doesn't fit above)

Assign exactly one priority level:
- Low    (minor inconvenience, not urgent)
- Medium (affects daily life but not dangerous)
- High   (safety risk, urgent, affects many people)

Return ONLY this JSON, no other text:
{
  "category": "<category>",
  "priority": "<priority>",
  "reasoning": "<one sentence explaining your decision>"
}
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Affordable and fast; upgrade to gpt-4 for better accuracy
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,       // Low temperature = more consistent, predictable outputs
      max_tokens: 150,
    });

    // Extract the text content from the response
    const raw = response.choices[0].message.content.trim();

    // Parse the JSON response from GPT
    const result = JSON.parse(raw);

    // Validate the values to prevent garbage data entering our DB
    const validCategories = ["Water", "Electricity", "Roads", "Waste", "Other"];
    const validPriorities  = ["Low", "Medium", "High"];

    return {
      category:  validCategories.includes(result.category) ? result.category : "Other",
      priority:  validPriorities.includes(result.priority)  ? result.priority : "Medium",
      reasoning: result.reasoning || "",
    };

  } catch (error) {
    console.error("❌ OpenAI error:", error.message);

    // If AI fails, return safe defaults so the report still gets saved
    return { category: "Other", priority: "Medium", reasoning: "AI unavailable" };
  }
}

module.exports = { analyzeReport };
