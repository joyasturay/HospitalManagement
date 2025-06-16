const express=require('express');
const router=express.Router();
const wrapAsync = require('../utils/wrapAsync');
const ExpressError= require('../utils/ExpressError');
const PDFDocument = require('pdfkit');
const fs = require('fs');

const Hospital=require('../models/Hospital');
const Bed = require('../models/Bed');  
const Nurse = require('../models/Nurse');
const Doctor = require('../models/Doctor');
const Staff = require('../models/Staff');
const Review = require('../models/review'); 
const Patient = require('../models/Patient'); 
const Bill = require('../models/Bill');  

router.get('/', async (req, res) => {
    try {
        let hospitals = await Hospital.find({});
        hospitals = hospitals.map(hospital => {
            let status = 'gray';
            if (hospital.availableBeds >= (hospital.totalBeds / 2)) {
                status = 'green';
            } else if (hospital.availableBeds > 10) {
                status = 'yellow';
            } else if (hospital.availableBeds <= 10) {
                status = 'red';
            }
            return { ...hospital._doc, status };
        });

        hospitals.sort((a, b) => {
            const priority = { 'green': 1, 'yellow': 2, 'red': 3, 'gray': 4 };
            return priority[a.status] - priority[b.status] || b.availableBeds - a.availableBeds;
        });
        let doctors = await Hospital.find({})
        .populate('doctors')  
        .exec();

        let totalDoctors = doctors.reduce((total, hospital) => total + hospital.doctors.length, 0);

        res.render('hospitals/index', {
            hospitals,
            totalHospitals: hospitals.length,
            totalAvailableBeds: hospitals.reduce((total, hospital) => total + hospital.availableBeds, 0),
            totalDoctors   
        });
    } catch (err) {
        console.error('Error fetching hospitals:', err);
        res.status(500).send('Internal Server Error');
    }
});

// New Hospital Form
router.get('/new', (req, res) => {
    res.render('hospitals/new');
});

// Show Hospital Details
router.get('/:hospitalId', async (req, res) => {
    const { hospitalId } = req.params;
    
    try {
      const hospital = await Hospital.findById(hospitalId);
      const reviews = await Review.find({ hospital: hospitalId });
  
      res.render('hospitals/show', { hospital, reviews });
    } catch (err) {
      console.error(err);
      res.status(500).send('Error loading hospital details');
    }
  });
  

// Add a New Hospital
router.post('/', wrapAsync(async (req, res) => {
    const { name, location, totalBeds, availableBeds, departments, emergencyFacilities, image, phoneno } = req.body;

    const newHospital = new Hospital({
        name,
        location,
        totalBeds,
        availableBeds,
        departments: departments.split(',').map(dep => dep.trim()),
        emergencyFacilities: emergencyFacilities.split(',').map(facility => facility.trim()),
        image,
        phoneno,
    });

    await newHospital.save();
    res.redirect('/hospitals');
}));

router.get('/:id/edit', async (req, res) => {
    try {
        const hospital = await Hospital.findById(req.params.id);
        if (!hospital) {
            return res.status(404).send('Hospital Not Found');
        }
        res.render('hospitals/edit', { hospital });
    } catch (err) {
        console.error('Error fetching hospital for edit:', err);
        res.status(500).send('Internal Server Error');
    }
});
router.put('/:id', async (req, res) => {
    try {
        const { name, location, totalBeds, availableBeds, departments, emergencyFacilities, image, phoneno } = req.body;
        const updatedHospital = await Hospital.findByIdAndUpdate(
            req.params.id,
            {
                name,
                location,
                totalBeds,
                availableBeds,
                departments: departments.split(',').map(dep => dep.trim()),
                emergencyFacilities: emergencyFacilities.split(',').map(facility => facility.trim()),
                image,
                phoneno,
            },
            { new: true }
        );
        res.redirect(`/hospitals/${updatedHospital._id}`);
    } catch (err) {
        console.error('Error updating hospital:', err);
        res.status(500).send('Internal Server Error');
    }
});

router.delete('/:id', async (req, res) => {
    try {
        await Hospital.findByIdAndDelete(req.params.id);
        res.redirect('/hospitals');
    } catch (err) {
        console.error('Error deleting hospital:', err);
        res.status(500).send('Internal Server Error');
    }
});


router.get('/:hospitalId/beds/add', async (req, res) => {
    const hospitalId = req.params.hospitalId;
    try {
        const hospital = await Hospital.findById(hospitalId);
        if (!hospital) return res.status(404).send('Hospital not found');
        res.render('hospitals/beds', { hospital });
    } catch (error) {
        res.status(500).send('Error loading hospital data');
    }
});

router.post('/:hospitalId/beds/add', async (req, res) => {
    const hospitalId = req.params.hospitalId;
    const { bedNumber, ward, isOccupied } = req.body;

    try {
        const hospital = await Hospital.findById(hospitalId);
        if (!hospital) return res.status(404).send('Hospital not found');

        const newBed = new Bed({
            bedNumber,
            ward,
            hospital: hospitalId,
            isOccupied
        });

        await newBed.save();

        hospital.beds.push(newBed._id);
        hospital.totalBeds += 1; 
        hospital.availableBeds += isOccupied ? 0 : 1;

        await hospital.save();

        res.redirect(`/hospitals/${hospitalId}/beds`); 
    } catch (error) {
        res.status(500).send('Error adding bed');
    }
});

router.get('/:hospitalId/beds', async (req, res) => {
    const hospitalId = req.params.hospitalId;
    try {
        const hospital = await Hospital.findById(hospitalId);
        if (!hospital) return res.status(404).send('Hospital not found');

        const beds = await Bed.find({ hospital: hospitalId });

        res.render('hospitals/viewBeds', { hospital, beds });
    } catch (error) {
        res.status(500).send('Error loading bed data');
    }
});

router.get('/:hospitalId/beds/:bedId/edit', async (req, res) => {
    const { hospitalId, bedId } = req.params;
    try {
        const hospital = await Hospital.findById(hospitalId);
        if (!hospital) return res.status(404).send('Hospital not found');

        const bed = await Bed.findById(bedId);
        if (!bed) return res.status(404).send('Bed not found');

        res.render('hospitals/editBeds', { hospital, bed });
    } catch (error) {
        res.status(500).send('Error loading bed data');
    }
});

router.post('/:hospitalId/beds/:bedId/edit', async (req, res) => {
    const { hospitalId, bedId } = req.params;
    const { bedNumber, ward, isOccupied } = req.body;
    try {
        const updatedBed = await Bed.findByIdAndUpdate(bedId, {
            bedNumber,
            ward,
            isOccupied: isOccupied === 'on' 
        }, { new: true });

        if (!updatedBed) return res.status(404).send('Bed not found');

        res.redirect(`/hospitals/${hospitalId}/beds`);
    } catch (error) {
        res.status(500).send('Error updating bed');
    }
});

router.delete('/:hospitalId/beds/:bedId/delete', async (req, res) => {
    const { hospitalId, bedId } = req.params;
    try {
        const deletedBed = await Bed.findByIdAndDelete(bedId);
        if (!deletedBed) return res.status(404).send('Bed not found');

        res.redirect(`/hospitals/${hospitalId}/beds`);
    } catch (error) {
        res.status(500).send('Error deleting bed');
    }
});

router.post('/:hospitalId/discharge/:patientId', async (req, res) => {
    const { hospitalId, patientId } = req.params;

    try {
        const hospital = await Hospital.findById(hospitalId);
        const patient = await Patient.findById(patientId);
        
        if (!hospital) return res.status(404).send('Hospital not found');
        if (!patient) return res.status(404).send('Patient not found');
        const bed = await Bed.findById(patient.bed);
        if (!bed) return res.status(404).send('Bed not found');
        bed.isOccupied = false;
        await bed.save();
        patient.bed = null;
        patient.dischargeDate = new Date();
        await patient.save();

        hospital.availableBeds += 1;
        await hospital.save();

        res.redirect(`/hospitals/${hospitalId}/beds`); 
    } catch (error) {
        res.status(500).send('Error discharging patient');
    }
});

router.get('/:id/nurses/add', async (req, res) => {
    try {
        const hospital = await Hospital.findById(req.params.id);
        if (!hospital) {
            return res.status(404).send('Hospital Not Found');
        }
        res.render('hospitals/nurses/new', { hospital });
    } catch (err) {
        console.error('Error fetching hospital for nurse:', err);
        res.status(500).send('Internal Server Error');
    }
});

// Add Nurse to Hospital
router.post('/:id/nurses', async (req, res) => {
    try {
        const hospitalId = req.params.id;
        const { name, shiftTimings, contactInfo } = req.body;
        const newNurse = new Nurse({
            name,
            shiftTimings,
            contactInfo,
            hospital: hospitalId
        });
        await newNurse.save();

        const hospital = await Hospital.findById(hospitalId);
        hospital.nurses.push(newNurse);
        await hospital.save();

        res.redirect(`/hospitals/${hospitalId}`);
    } catch (error) {
        console.error('Error adding nurse:', error);
        res.redirect(`/hospitals/${hospitalId}`);
    }
});

// to display nurses for a specific hospital
router.get('/:id/nurses', async (req, res) => {
    try {
        const hospitalId = req.params.id;
        const hospital = await Hospital.findById(hospitalId).populate('nurses');
        
        if (!hospital) {
            return res.status(404).send('Hospital Not Found');
        }

        const nurses = hospital.nurses;  

        res.render('hospitals/nurses/index', { hospital, nurses });
    } catch (err) {
        console.error('Error fetching nurses:', err);
        res.status(500).send('Internal Server Error');
    }
});


//Add Doctor to Hospital
router.get('/:id/doctors/add', async (req, res) => {
    try {
        const hospitalId = req.params.id;
        const hospital = await Hospital.findById(hospitalId);
        if (!hospital) {
            return res.status(404).send('Hospital Not Found');
        }
        res.render('doctors/new', { hospital });
    } catch (err) {
        console.error('Error fetching hospital for adding doctor:', err);
        res.status(500).send('Internal Server Error');
    }
});

router.post('/:id/doctors', async (req, res) => {
    try {
        const hospitalId = req.params.id;
        const { name, specialization, experience, availableAppointments, contactInfo,image,fees } = req.body;

        const appointmentDates = availableAppointments.split(',').map(dateStr => {
            const date = new Date(dateStr.trim());
            return isNaN(date.getTime()) ? null : date; 
        }).filter(date => date !== null);

        const doctor = new Doctor({
            name,
            specialization,
            experience,
            availableAppointments: appointmentDates,
            hospital: hospitalId,
            contactInfo,
            image,
            fees,
        });

        await doctor.save();

        await Hospital.findByIdAndUpdate(hospitalId, {
            $push: { doctors: doctor._id },
        });

        res.redirect(`/hospitals/${hospitalId}/doctors`);
    } catch (err) {
        console.error('Error adding doctor:', err);
        res.status(500).send('Internal Server Error');
    }
});

router.get('/:id/doctors', async (req, res) => {
    try {
        const hospitalId = req.params.id;
        const hospital = await Hospital.findById(hospitalId).populate('doctors');
        
        if (!hospital) {
            return res.status(404).send('Hospital Not Found');
        }

        const doctors = hospital.doctors;  

        res.render('doctors/index', { hospital, doctors });
    } catch (err) {
        console.error('Error fetching doctors:', err);
        res.status(500).send('Internal Server Error');
    }
});


router.get('/:id/doctors/:doctorId/edit', async (req, res) => {
    const { id: hospitalId, doctorId } = req.params;
    try {
        const doctor = await Doctor.findById(doctorId);

        if (!doctor) {
            return res.status(404).send('Doctor Not Found');
        }
        res.render('doctors/edit', { hospitalId, doctor });
    } catch (err) {
        console.error('Error fetching doctor details:', err);
        res.status(500).send('Internal Server Error');
    }
});

router.delete('/:id/doctors/:doctorId/delete', async (req, res) => {
    const { id: hospitalId, doctorId } = req.params;
    try {
        await Hospital.findByIdAndUpdate(hospitalId, {
            $pull: { doctors: doctorId }, 
        });
        await Doctor.findByIdAndDelete(doctorId);
        res.redirect(`/hospitals/${hospitalId}/doctors`);
    } catch (err) {
        console.error('Error deleting doctor:', err);
        res.status(500).send('Internal Server Error');
    }
});

router.put('/:id/doctors/:doctorId', async (req, res) => {
    const { id: hospitalId, doctorId } = req.params;
    const { name, specialization, experience, availableAppointments, contactInfo, image, fees } = req.body;

    try {
        const appointmentDates = availableAppointments.split(',').map(dateStr => {
            const date = new Date(dateStr.trim());
            return isNaN(date.getTime()) ? null : date; 
        }).filter(date => date !== null);

        await Doctor.findByIdAndUpdate(doctorId, {
            name,
            specialization,
            experience,
            availableAppointments: appointmentDates,
            contactInfo,
            image,
            fees,
        });
        res.redirect(`/hospitals/${hospitalId}/doctors`);
    } catch (err) {
        console.error('Error updating doctor:', err);
        res.status(500).send('Internal Server Error');
    }
});

router.get('/:hospitalId/patients', async (req, res) => {
    const { hospitalId } = req.params;
  
    try {
      const hospital = await Hospital.findById(hospitalId);
      const patients = await Patient.find({ admittedAt: hospitalId });
  
      res.render('hospitals/patients/index', { patients, hospital });
    } catch (error) {
      console.error(error);
      res.status(500).send("Error loading patients");
    }
  });


router.get('/:hospitalId/patients/:patientId', async (req, res) => {
    const { hospitalId, patientId } = req.params;

    try {
        const hospital = await Hospital.findById(hospitalId);
        const patient = await Patient.findById(patientId).populate('bed');

        if (!patient) {
            return res.status(404).send("Patient not found");
        }

        res.render('hospitals/patients/show', { hospital, patient });
    } catch (error) {
        console.error(error);
        res.status(500).send("Error loading patient details");
    }
});


  router.post('/:hospitalId/admit/:patientId', async (req, res) => {
    const { hospitalId, patientId } = req.params;

    try {
        const hospital = await Hospital.findById(hospitalId);
        const patient = await Patient.findById(patientId);
        
        if (!hospital) return res.status(404).send('Hospital not found');
        if (!patient) return res.status(404).send('Patient not found');
        const availableBed = await Bed.findOne({ hospital: hospitalId, isOccupied: false });
        if (!availableBed) return res.status(404).send('No available beds');
        availableBed.isOccupied = true;
        await availableBed.save();
        patient.bed = availableBed._id;
        patient.admittedAt = hospitalId;
        await patient.save();
        hospital.availableBeds -= 1;
        await hospital.save();
        res.redirect(`/patients/${patient._id}`);
    } catch (error) {
        res.status(500).send('Error admitting patient');
    }
});

router.post('/:hospitalId/reviews', async (req, res) => {
    const { hospitalId } = req.params;
    const { reviewerName, rating, comment } = req.body;
    
    try {
      const hospital = await Hospital.findById(hospitalId);
      const newReview = new Review({
        hospital: hospitalId,
        reviewerName,
        rating,
        comment
      });
      
      await newReview.save();
      res.redirect(`/hospitals/${hospitalId}`);
    } catch (err) {
      console.error(err);
      res.status(500).send('Error adding review');
    }
  });

  router.delete('/:hospitalId/reviews/:reviewId', async (req, res) => {
    const { hospitalId, reviewId } = req.params;
  
    try {
      await Review.findByIdAndDelete(reviewId);
      res.redirect(`/hospitals/${hospitalId}`);
    } catch (err) {
      console.error(err);
      res.status(500).send('Error deleting review');
    }
  });

  router.get('/:hospitalId/patients/:patientId/bill', async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.patientId).populate('admittedAt');
        const hospital = await Hospital.findById(req.params.hospitalId); 

        res.render('hospitals/nurses/bill', { patient, hospital });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
});

router.post('/:hospitalId/patients/:patientId/bill', async (req, res) => {
    try {
        const { services, servicesCost, roomCharge } = req.body;

        const totalBill = servicesCost.reduce((total, cost) => total + Number(cost), 0) + Number(roomCharge);
        const patient = await Patient.findById(req.params.patientId);
        if (!patient) {
            return res.status(404).send('Patient not found.');
        }
        patient.bill = {
            services,
            servicesCost,
            roomCharge,
            totalBill,
        };

        await patient.save();
        res.redirect(`/hospitals/${req.params.hospitalId}/patients/${req.params.patientId}/bill`);
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
});

router.get('/:hospitalId/patients/:patientId/bill/download', async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.patientId);
        
        if (!patient.bill) {
            return res.status(404).send('No bill found for this patient.');
        }
        const doc = new PDFDocument();
        res.setHeader('Content-Disposition', 'attachment; filename=bill.pdf');
        res.setHeader('Content-Type', 'application/pdf');
        doc.text(`Bill for Patient: ${patient.name}`);
        doc.text(`Total Bill: ${patient.bill.totalBill}`);
        doc.text('Services:');
        patient.bill.services.forEach((service, index) => {
            doc.text(`${service}: $${patient.bill.servicesCost[index]}`);
        });
        doc.text(`Room Charge: $${patient.bill.roomCharge}`);
        doc.end();
        doc.pipe(res);
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
});


module.exports = router;

