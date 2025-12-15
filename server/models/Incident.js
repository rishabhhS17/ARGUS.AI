const mongoose = require('mongoose');

const IncidentSchema = new mongoose.Schema({
  type: String,         
  description: String,  
  severity: Number,     
  location: {
    address: String,
    coordinates: [Number] 
  },
  // --- NEW FIELDS ---
  breakdown: {
    evidence_source: String,
    acoustics: [String],
    visual_clues: [String],
    logistics_needed: [String]
  },
  action_plan: String,
  // ------------------
  status: { type: String, default: 'PENDING' }, 
  assignedUnit: { type: mongoose.Schema.Types.ObjectId, ref: 'ForceUnit' },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Incident', IncidentSchema);