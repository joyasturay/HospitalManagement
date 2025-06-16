const mongoose = require('mongoose');

const bedSchema = new mongoose.Schema({
  bedNumber: { type: Number, required: true },
  ward: { type: String },
  hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true },
  isOccupied: { type: Boolean, default: false },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
});

const Bed = mongoose.model('Bed', bedSchema);

module.exports = Bed;

