const mongoose = require('mongoose');

// One raw citizen report that was folded into this incident.
const ReportSchema = new mongoose.Schema({
  source: { type: String, default: 'UNKNOWN' }, // SOCIAL | HELPLINE | UNKNOWN
  type: String,
  description: String,
  severity: Number,
  address: String,
  coordinates: [Number],
  precision: String, // exact | area | city | region
  receivedAt: { type: Date, default: Date.now },
}, { _id: false });

const IncidentSchema = new mongoose.Schema({
  type: String,
  description: String,
  severity: Number,
  location: {
    address: String,
    coordinates: [Number] // [lat, lng]; precision-weighted centre of merged reports
  },
  locationPrecision: { type: String, default: 'area' }, // most precise report so far
  locationWeight: { type: Number, default: null },      // sum of report weights behind the pin
  breakdown: {
    evidence_source: String,
    acoustics: [String],
    visual_clues: [String],
    logistics_needed: [String]
  },
  action_plan: String,
  status: { type: String, default: 'PENDING' }, // PENDING -> DISPATCHED -> RESOLVED
  resolvedAt: { type: Date, default: null },
  assignedUnit: { type: mongoose.Schema.Types.ObjectId, ref: 'ForceUnit' },
  timestamp: { type: Date, default: Date.now, index: true }, // first report

  // --- Correlation ---
  category: { type: String, default: 'OTHER' },
  reports: { type: [ReportSchema], default: [] }, // most recent 50 kept
  reportCount: { type: Number, default: 1 },     // total, including trimmed ones
  sources: { type: [String], default: [] },      // distinct intake channels
  confidence: { type: Number, default: 35 },     // 0-100
  verification: { type: String, default: 'UNCONFIRMED' }, // UNCONFIRMED | CORROBORATED | CONFIRMED
  lastReportedAt: { type: Date, default: Date.now, index: true },
});

module.exports = mongoose.model('Incident', IncidentSchema);
