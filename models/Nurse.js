const mongoose = require('mongoose');

const nurseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  shiftTimings: { type: String, required: true },
  assignedBeds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Bed' }], 
  hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true },
  contactInfo: { type: String },
});

const Nurse = mongoose.model('Nurse', nurseSchema);

module.exports = Nurse;

