const { urlencoded } = require('express');
const mongoose = require('mongoose');
const Patient = require('./Patient');

const hospitalSchema = new mongoose.Schema({
  name: { type: String, required: true },
  location: { type: String, required: true },
  totalBeds: { type: Number, required: true },
  availableBeds: { type: Number, required: true },
  departments: [String],
  emergencyFacilities: [String],
  doctors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' }],
  nurses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Nurse' }],
  staff: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Staff' }],
  beds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Bed' }],
  image: {
    type: String,
    default: "https://images.unsplash.com/photo-1577896851231-70ef18881754?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    set: (v) => v === "" ? "https://images.unsplash.com/photo-1577896851231-70ef18881754?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" : v
},
phoneno: { type: Number , required: true },
});

const Hospital = mongoose.model('Hospital', hospitalSchema);

module.exports = Hospital;

