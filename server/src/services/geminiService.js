const { GoogleGenerativeAI } = require('@google/generative-ai');

const { env } = require('../config/env');
const {
  assertReportable,
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
  // Without a timeout a stalled upstream request holds the reporter's request open for minutes.
  return genAI.getGenerativeModel({ model: env.geminiModel }, { timeout: GEMINI_TIMEOUT_MS });
}

const GEMINI_TIMEOUT_MS = 30 * 1000;

// Upstream overload, rate limiting, timeouts and network failures are not our bugs:
// report them as 503 "try again" instead of a generic 500.
async function generate(model, request) {
  try {
    return await model.generateContent(request);
  } catch (err) {
    const status = Number(err.status);
    const transient = status === 429 || status === 503 || status === 504
      || err.name === 'AbortError' || /fetch failed|aborted|timed? ?out/i.test(err.message || '');

    // Key, permission or billing problems on the provider account (e.g. 402 "prepayment
    // credits are depleted"). The details stay in the server log; callers get a clean 503.
    const accountProblem = status === 401 || status === 402 || status === 403;

    if (transient) {
      err.statusCode = 503;
      err.publicMessage = 'The AI service is busy or unreachable right now. Please try again in a minute.';
    } else if (accountProblem) {
      err.statusCode = 503;
      err.publicMessage = 'The AI service is unavailable right now (provider account issue). Please contact the administrator.';
    }
    throw err;
  }
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

  const result = await generate(model, {
    contents: [{ role: 'user', parts }],
  });

  const rawText = result.response.text();
  // Rejected here too, so the reporter learns what is missing before anything is posted.
  return assertReportable(parseIncidentAnalysis(rawText));
}

async function generatePublicAdvisory(text) {
  const model = getModel();

  const result = await generate(model, {
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
    "address": "Place named in the report, e.g. a street, landmark or neighbourhood, with its city",
    "coordinates": [latitude, longitude],
    "precision": "exact | area | city | region"
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
- Coordinates must be [latitude, longitude] for the place the report names.
- Location must come from the input itself (words, a visible sign or landmark, or what a caller says).
  If the input does not name or show an identifiable place, set "address" and "coordinates" to null.
  Never fall back to a default city, a country centre, or [0, 0].
- "precision" says how specific the named place is:
  "exact"  = a street address, building, junction or specific landmark;
  "area"   = a neighbourhood, market, campus or locality;
  "city"   = only a city or town is named (e.g. "a fire in Delhi");
  "region" = only a state, district or larger area is named.
  Judge it from what the input says, not from how confident you are in the coordinates.
  For "city" or "region", give the centre coordinates of that city or region.
- If the input does not describe an actual incident or emergency, set "type" and "description" to null.
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
