const mongoose = require('mongoose');

const ForceUnitSchema = new mongoose.Schema({
  name: String,       
  type: String,       
  status: { type: String, default: 'IDLE' }, 
  coordinates: [Number] // [lat, lng]
});

module.exports = mongoose.model('ForceUnit', ForceUnitSchema);
