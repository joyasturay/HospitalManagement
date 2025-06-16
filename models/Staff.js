const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({
  name: { type: String, required: true },
  role: { type: String, enum: ['nurse', 'doctor'], required: true },
  hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
  contactInfo: { type: String },
});

module.exports = mongoose.model('Staff', staffSchema);
