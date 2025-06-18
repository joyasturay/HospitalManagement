require('dotenv').config();
const express = require('express');
const app = express();
const mongoose = require('mongoose');
const path = require('path');
const methodOverride = require('method-override');
const ejsMate = require('ejs-mate');
const wrapAsync = require('./utils/wrapAsync');
const ExpressError= require('./utils/ExpressError');
const hospitals=require('./routes/Hospitals');
const { createClient } = require('@supabase/supabase-js');
const session = require('express-session');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);


// Models
const Hospital = require('./models/Hospital');
const Nurse = require('./models/Nurse');
const Doctor = require('./models/Doctor');
const Staff = require('./models/Staff');
const Bed = require('./models/Bed');
const Review = require('./models/review'); 
const Patient = require('./models/Patient');

const MONGO_URL = process.env.MONGO_URL;
async function connect() {
    try {
        await mongoose.connect(MONGO_URL, {});
        console.log('MongoDB Connected');
    } catch (err) {
        console.error('Error connecting to MongoDB:', err);
    }
}
connect();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use("/hospitals", hospitals);
app.engine('ejs', ejsMate);
const sessionOptions = {
    secret: process.env.SESSION_SECRET, 
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7, 
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
};
app.use(session(sessionOptions));

app.get('/', (req, res) => {
    res.send('Hello World');
});
app.get("/signupPage", (req, res) => {
    res.render('signup');
});
app.post('/signup', async (req, res) => {
  const { email, password } = req.body;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    console.log(error);
    return res.send('Error signing up.');
  }

  res.redirect('/loginPage');
});

app.get("/loginPage",(req,res)=>{
    res.render('login');
})
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.log(error);
    return res.send('Login failed');
  }
  req.session.user = data.user;
  res.redirect('/hospitals');
});
app.get('/logout', async (req, res) => {
  await supabase.auth.signOut();
  req.session.destroy(); 
  res.redirect('/loginPage');
});


app.get('/profile', (req, res) => {
    res.render('dev');
});

// Enquire
app.get('/enquire', (req, res) => {
    res.render('enquiry/index');
});
app.post('/enquire', async (req, res) => {
    const { location, specialty } = req.body;

    try {
        const hospitals = await Hospital.find({
            location: location,
            departments: { $in: [specialty] }
        });

        hospitals.forEach(hospital => {
            let status = 'gray';
            if (hospital.availableBeds >= (hospital.totalBeds / 2)) {
                status = 'green';
            } else if (hospital.availableBeds > 10) {
                status = 'yellow';
            } else if (hospital.availableBeds <= 10) {
                status = 'red';
            }
            hospital.status = status;
        });

        hospitals.sort((a, b) => {
            const priority = { 'green': 1, 'yellow': 2, 'red': 3, 'gray': 4 };
            return priority[a.status] - priority[b.status] || b.availableBeds - a.availableBeds;
        });

        res.render('enquiry/show', { hospitals });
    } catch (err) {
        console.error('Error searching hospitals:', err);
        res.status(500).send('Internal Server Error');
    }
});


app.get('/book/:hospitalId', (req, res) => {
    const hospitalId = req.params.hospitalId;
    res.render('hospitals/book', { hospitalId });
});

  
app.post('/book-bed/:hospitalId', async (req, res) => {
    const { hospitalId } = req.params;
    const { name, age, contactInfo, date, ward, notes } = req.body;
  
    try {
        console.log('Hospital ID:', hospitalId);
        console.log('Requested Ward:', ward);
        const availableBed = await Bed.findOne({ hospital: hospitalId, isOccupied: false, ward: ward });
        console.log('Available Bed:', availableBed);
  
        if (!availableBed) {
            throw new ExpressError('No available bed found', 404);
        }
        const newPatient = new Patient({
            name,
            age,
            contactInfo,
            admittedAt: hospitalId,
            bed: availableBed._id,
            admissionDate: new Date(date),
            prescription: [],
        });
        const savedPatient = await newPatient.save();
        availableBed.isOccupied = true;
        await availableBed.save();
        const hospital = await Hospital.findById(hospitalId);
        if (!hospital) throw new Error('Hospital not found');
        if (hospital.availableBeds > 0) {
            hospital.availableBeds -= 1;
        } else {
            console.log('No available beds to decrement');
        }
        await hospital.save();
        res.render('hospitals/bookingsuccess', {
            message: 'Bed booking successful!',
            patient: newPatient,
            bed: availableBed,
            hospital: hospital,
            bookingDate: new Date().toLocaleDateString(),
        });
  
    } catch (error) {
        console.error('Error booking the bed:', error);
        res.status(500).send('Something went wrong. Please try again later.');
    }
});

  

  app.get('/patients/:patientId', async (req, res) => {
    const { patientId } = req.params;

    try {
        const patient = await Patient.findById(patientId)
            .populate('bed')
            .populate('admittedAt');

        if (!patient) return res.status(404).send('Patient not found');

        res.render('hospitals/patients/patientdetails', { patient });
    } catch (error) {
        res.status(500).send('Error fetching patient details');
    }
});

app.get('/doctors/:id', async (req, res) => {
    try {
        const doctor = await Doctor.findById(req.params.id).populate('hospital').populate('reviews');
        if (!doctor) {
            return res.status(404).send('Doctor not found');
        }
        res.render('doctors/doctorDetails', { doctor });
    } catch (error) {
        res.status(500).send('Server error');
    }
});

app.post('/doctors/:id/reviews', async (req, res) => {
    try {
        const { reviewerName, rating, comment } = req.body;
        const review = new Review({
            doctor: req.params.id,
            reviewerName,
            rating,
            comment
        });
        await review.save();

        await Doctor.findByIdAndUpdate(req.params.id, { $push: { reviews: review._id } });

        res.redirect(`/doctors/${req.params.id}`);
    } catch (error) {
        res.status(500).send('Server error');
    }
});

app.all('*', (req, res) => {
    throw(new ExpressError("Page Not Found", 404));
});


app.use((err,req, res, next) => {
    let { status = 500, message = 'Internal Server Error' } = err;
    res.render('error', { err: { status, message } });
});
  
app.listen(8080, () => {
    console.log('Server started on port 8080');
});

