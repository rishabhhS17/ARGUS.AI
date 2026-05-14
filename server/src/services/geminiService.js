const { GoogleGenerativeAI } = require('@google/generative-ai');

const { env } = require('../config/env');
const {
  parseIncidentAnalysis,
  stripMarkdownFences,
} = require('../utils/aiResponseParser');

function getModel() {
  if (!env.geminiApiKey) {
    const err = new Error('GEMINI_API_KEY is not configured');
    err.statusCode = 500;
    err.publicMessage = 'AI service is not configured';
    throw err;
  }

  const genAI = new GoogleGenerativeAI(env.geminiApiKey);
  return genAI.getGenerativeModel({ model: env.geminiModel });
}

async function analyzeIncidentInput({ text, fileData, mimeType }) {
  const model = getModel();
  const parts = [];

  if (text) {
    parts.push({ text });
  }

  if (fileData) {
    parts.push({
      inlineData: {
        data: fileData,
        mimeType: mimeType || 'application/octet-stream',
      },
    });
  }

  parts.push({ text: getIncidentAnalysisPrompt() });

  const result = await model.generateContent({
    contents: [{ role: 'user', parts }],
  });

  const rawText = result.response.text();
  return parseIncidentAnalysis(rawText);
}

async function generatePublicAdvisory(text) {
  const model = getModel();

  const result = await model.generateContent({
    contents: [
      {
        role: 'user',
        parts: [{ text: getAdvisoryPrompt(text) }],
      },
    ],
  });

  return stripMarkdownFences(result.response.text()).trim();
}

function getIncidentAnalysisPrompt() {
  return `
You are ARGUS AI, an emergency response analysis assistant.
Analyze the citizen input for a command-center prototype.

Return only valid JSON. Do not include Markdown, comments, or prose.
Use this exact shape:
{
  "type": "Incident Type",
  "severity": 1,
  "description": "Short operational summary",
  "location": {
    "address": "Approximate address or area",
    "coordinates": [28.6139, 77.2090]
  },
  "breakdown": {
    "evidence_source": "Text, image, audio, or mixed",
    "acoustics": [],
    "visual_clues": [],
    "logistics_needed": []
  },
  "action_plan": "Immediate tactical recommendation"
}

Rules:
- Severity must be a number from 1 to 10.
- Coordinates must be [latitude, longitude]. If uncertain, estimate near the described location.
- Prefer concise, operator-friendly language.
- Do not invent impossible certainty; use approximate wording when needed.
`;
}

function getAdvisoryPrompt(text) {
  return `
You are ARGUS AI drafting an official public safety advisory.

Incident details:
${text}

Write one urgent, professional public advisory under 280 characters.
Do not use quotes, hashtags, Markdown, or extra explanation.
`;
}

module.exports = { analyzeIncidentInput, generatePublicAdvisory };
