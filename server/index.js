require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const { Server } = require('socket.io');

// Load Models
const Incident = require('./models/Incident');
const ForceUnit = require('./models/ForceUnit');
const Advisory = require('./models/Advisory');

const app = express();

app.use(cors());

// [FIX 1: Increase Payload Limit for Base64 Images/Audio]
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// [FIX 2: Initialize Gemini Client Correctly]
// Ensure you have run: npm install @google/generative-ai
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/sentinel_db')
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ MongoDB Error:", err));

// Routes
app.post('/api/analyze', async (req, res) => {
  try {
    const { text, fileData, mimeType, taskType } = req.body;
    
    // Construct the parts array for Gemini
    let parts = [];
    if (text) parts.push({ text });
    if (fileData) {
        // Ensure fileData is the raw base64 string without headers
        parts.push({ 
            inlineData: { 
                data: fileData, 
                mimeType: mimeType 
            } 
        });
    }

    let promptContext = "";
    
    // Select Persona/Prompt based on task
    if (taskType === 'ADVISORY') {
        promptContext = `
            Context: You are ARGUS AI.
            Incident Details: ${text}
            Task: Write a single, urgent, professional public safety advisory tweet (max 280 chars).
            Output: Just the text. No quotes.
        `;
    } else {
        // DEFAULT DISASTER ANALYSIS
        promptContext = `
            You are ARGUS AI. Analyze the input for disaster management.
            Output Strict JSON:
            {
              "type": "Incident Type",
              "severity": Number (1-10),
              "description": "Short summary",
              "location": { "address": "Approx address", "coordinates": [28.61, 77.20] },
              "breakdown": {
                "evidence_source": "Visual/Text",
                "acoustics": ["List"],
                "visual_clues": ["List"],
                "logistics_needed": ["Ambulance", "Fire"]
              },
              "action_plan": "Tactical advice."
            }
            DO NOT use Markdown. Just raw JSON.
        `;
    }
    
    // Append context to parts (as text)
    parts.push({ text: promptContext });

    // [FIX 2 Continued: Correct Model Instantiation]
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); // Use 1.5-flash or 2.0-flash-exp if available
    
    const result = await model.generateContent({
      contents: [{ role: 'user', parts }]
    });
    
    const response = await result.response;
    const rawText = response.text();
    
    // Return parsed JSON for analysis, or plain text for advisory
    if (taskType !== 'ADVISORY') {
        // Clean markdown code blocks if Gemini returns them
        const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        res.json(JSON.parse(cleaned));
    } else {
        res.json({ text: rawText.trim() });
    }

  } catch (err) {
    console.error("AI Processing Error:", err);
    // Return the actual error message for debugging
    res.status(500).json({ error: "AI Analysis Failed", details: err.message });
  }
});

app.get('/api/data', async (req, res) => {
  try {
    // Run all 3 queries simultaneously instead of waiting for each one
    const [incidents, units, advisories] = await Promise.all([
      Incident.find().populate('assignedUnit').sort({ timestamp: -1 }).lean(),
      ForceUnit.find().lean(),
      Advisory.find().sort({ timestamp: -1 }).limit(50).lean() // Limit advisories to last 50
    ]);
    
    res.json({ incidents, units, advisories });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/units', async (req, res) => {
  const unit = await ForceUnit.create(req.body);
  io.emit('units_updated', await ForceUnit.find());
  res.json(unit);
});

app.post('/api/deploy', async (req, res) => {
  const { incidentId, unitId } = req.body;
  const incident = await Incident.findByIdAndUpdate(incidentId, { status: 'DISPATCHED', assignedUnit: unitId }, { new: true }).populate('assignedUnit');
  await ForceUnit.findByIdAndUpdate(unitId, { status: 'BUSY' });
  
  const incidents = await Incident.find().populate('assignedUnit').sort({ timestamp: -1 });
  const units = await ForceUnit.find();
  
  io.emit('incident_alert', { incidents, units, newIncident: incident });
  res.json({ success: true });
});

app.post('/api/incident', async (req, res) => {
  try {
    const { type, description, severity, location, breakdown, action_plan } = req.body;
    const newIncident = new Incident({ type, description, severity, location, breakdown, action_plan, status: 'PENDING', assignedUnit: null });
    await newIncident.save();

    const fullList = await Incident.find().populate('assignedUnit').sort({ timestamp: -1 });
    const fullUnits = await ForceUnit.find();
    
    io.emit('incident_alert', { incidents: fullList, units: fullUnits, newIncident: newIncident });
    res.json({ success: true, incident: newIncident });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/advisory', async (req, res) => {
  try {
    const { message } = req.body;
    const newAdvisory = new Advisory({ message });
    await newAdvisory.save();
    
    io.emit('advisory_posted', newAdvisory);
    res.json({ success: true, advisory: newAdvisory });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/clear', async (req, res) => {
  await Incident.deleteMany({});
  await ForceUnit.updateMany({}, { status: 'IDLE' });
  await Advisory.deleteMany({}); 
  
  io.emit('incident_alert', { incidents: [], units: await ForceUnit.find(), newIncident: null });
  io.emit('advisories_cleared'); 
  
  res.json({ success: true });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));