const express = require('express');
const router  = express.Router();

const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');

// ── Supabase client ──────────────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// ── OpenAI client ────────────────────────────────────
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── POST /api/reports ────────────────────────────────
router.post('/', async (req, res) => {
  const { title, description, location } = req.body;

  if (!title || !description || !location) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  console.log('📥 Report received:', title);

  // Step 1: Ask OpenAI to categorize and prioritize
  let category = 'Other';
  let priority = 'Medium';

  try {
    const aiResponse = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      max_tokens: 100,
      temperature: 0.2,
      messages: [{
        role: 'user',
        content: `Classify this municipal issue report. Reply ONLY with valid JSON, no extra text.

Title: "${title}"
Description: "${description}"

Return exactly:
{"category":"Water|Electricity|Roads|Waste|Other","priority":"Low|Medium|High"}`
      }]
    });

    const parsed = JSON.parse(aiResponse.choices[0].message.content.trim());
    category = parsed.category || 'Other';
    priority = parsed.priority || 'Medium';
    console.log(`🤖 AI result: ${category} / ${priority}`);

  } catch (aiErr) {
    console.error('⚠️ AI failed, using defaults:', aiErr.message);
  }

  // Step 2: Save to Supabase
  try {
    const { data, error } = await supabase
      .from('reports')
      .insert([{ title, description, location, category, priority, status: 'Open' }])
      .select()
      .single();

    if (error) throw error;

    console.log(`💾 Saved to Supabase: ${data.id}`);
    return res.status(201).json({ message: "Report saved!", report: data });

  } catch (dbErr) {
    console.error('❌ Supabase error:', dbErr.message);
    return res.status(500).json({ error: "Failed to save report: " + dbErr.message });
  }
});

// ── GET /api/reports ─────────────────────────────────
router.get('/', async (req, res) => {
  const { category, priority, status } = req.query;

  let query = supabase.from('reports').select('*').order('created_at', { ascending: false });

  if (category) query = query.eq('category', category);
  if (priority)  query = query.eq('priority',  priority);
  if (status)    query = query.eq('status',    status);

  const { data, error } = await query;

  if (error) {
    console.error('❌ Fetch error:', error.message);
    return res.status(500).json({ error: error.message });
  }

  res.json({ success: true, count: data.length, reports: data });
});

// ── PATCH /api/reports/:id ───────────────────────────
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const { data, error } = await supabase
    .from('reports')
    .update({ status })
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  res.json({ success: true, report: data });
});

module.exports = router;