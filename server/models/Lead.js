const mongoose = require('mongoose');

// An "unplaced report": it says what happened and names a place, but only a city or a
// region ("fire in Delhi"), which is too vague to pin on the map or to merge automatically.
// It is kept, not discarded, so an operator can attach it to the right incident or dismiss it.
const LeadSchema = new mongoose.Schema({
  source: { type: String, default: 'UNKNOWN' }, // SOCIAL | HELPLINE | UNKNOWN
  type: String,
  category: String,
  description: String,
  severity: Number,
  address: String,                 // e.g. "Delhi"
  coordinates: [Number],           // centre of that city/region; for suggestions only, never a pin
  precision: String,               // city | region
  breakdown: {
    evidence_source: String,
    acoustics: [String],
    visual_clues: [String],
    logistics_needed: [String],
  },
  status: { type: String, default: 'OPEN' }, // OPEN | ATTACHED | DISMISSED
  attachedIncident: { type: mongoose.Schema.Types.ObjectId, ref: 'Incident', default: null },
  receivedAt: { type: Date, default: Date.now, index: true },
  closedAt: { type: Date, default: null },
});

LeadSchema.index({ status: 1, receivedAt: -1 });

module.exports = mongoose.model('Lead', LeadSchema);
