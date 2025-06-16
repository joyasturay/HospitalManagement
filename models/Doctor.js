const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  specialization: { type: String, required: true },
  experience: { type: Number },
  availableAppointments: [{ type: Date }],
  hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true },
  contactInfo: { type: String },
  image: {
    type: String,
    default: "https://images.unsplash.com/photo-1577896851231-70ef18881754?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    set: (v) => v === "" ? "https://images.unsplash.com/photo-1577896851231-70ef18881754?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" : v
  },
  fees: { type: Number, default: 0 },
  reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Review' }],
});

const Doctor = mongoose.model('Doctor', doctorSchema);

module.exports = Doctor;


