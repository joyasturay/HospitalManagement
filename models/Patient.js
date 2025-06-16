const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  age: { type: Number, required: true },
  contactInfo: { type: String, required: true },
  admittedAt: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
  bed: { type: mongoose.Schema.Types.ObjectId, ref: 'Bed' },
  admissionDate: { type: Date, default: Date.now },
  dischargeDate: { type: Date },
  prescription: [{ type: String }],
  bill: { 
    services: [String],
    servicesCost: [Number],
    roomCharge: Number,
    totalBill: Number
},
});

module.exports = mongoose.model('Patient', patientSchema);
