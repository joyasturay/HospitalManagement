const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  appointmentDate: { type: Date, required: true },
  status: { type: String, enum: ['booked', 'completed', 'cancelled'], default: 'booked' },
});

module.exports = mongoose.model('Appointment', appointmentSchema);
