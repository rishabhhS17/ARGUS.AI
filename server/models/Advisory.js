const mongoose = require('mongoose');

const AdvisorySchema = new mongoose.Schema({
  message: String,
  timestamp: { type: Date, default: Date.now },
  author: { type: String, default: "Location Help Centre" },
  relatedIncidentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Incident' } // Optional: link to incident
});

module.exports = mongoose.model('Advisory', AdvisorySchema);