const express = require("express");
const app = express();
var path = require('path');
const multer = require('multer');
const ejs = require("ejs");
const bodyParser= require("body-parser");
const bcrypt = require("bcryptjs");
// used for session cookie
const flash = require("connect-flash");
const session = require("express-session");
const passport= require("passport");
const LocalStrategy = require('passport-local').Strategy;
const socket = require("socket.io");
// Setting up the admin
const adminRouter = require('./routers/admin-router');
app.use('/admin', adminRouter);
const mongoose = require("mongoose");
// Setting the view engine
app.set('view engine', 'ejs');
// Setting the body parser
app.use(bodyParser.urlencoded({
    extended: true
}));
// Setting the static directory
app.use(express.static(__dirname + "/public"));

// Set storage engine
const storage = multer.diskStorage({
    destination: __dirname + "/public/uploads/",
    filename: function(req,file,callback){
        callback(null,file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

function checkFileType(file, cb){
    //  checking the file extensions
    //  allowed extensions
    const filetypes = /png|jpeg/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if(extname){
        return cb(null,true);
    }
    else{
        cb("Error: please upload images only ");
    }
}

// Initialse Upload
const upload = multer({
    storage: storage,
    fileFilter: function(req,file,cb) {
        checkFileType(file,cb);
    }
}).single('myFile');


// Setting up database
const database = require('./config/database');


// requiring the models - schemas
let User = require("./models/user");

app.use(session({
    secret: 'Our little secret.',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 365 * 24 * 60 * 60 * 1000 }
}));


// Passport middleware
app.use(passport.initialize());
app.use(passport.session());


// Connecting flash
app.use(flash());

// Global vars
app.use(function(req,res,next){
    res.locals.success_msg = req.flash("success_msg");
    res.locals.error_msg = req.flash("error_msg");
    res.locals.error = req.flash('error');
    next();
});


passport.use(
    new LocalStrategy({usernameField: 'phoneNumber'}, function(phoneNumber,password,done){
        User.findOne({phoneNumber: phoneNumber})
        .then(user => {
            if(!user){
                return done(null,false, {message: "That phone number is not registered"});
            }
            bcrypt.compare(password, user.password, function(err, isMatch){
                if(err)
                {
                    console.log(err);
                }
                if(isMatch){
                    return done(null,user);
                }
                else{
                    return done(null, false, {message: "Password incorrect"});
                }
            })
        })
        .catch(err => console.log(err));
    })
);

// serialising the user to decide which key is to be kept in the cookie
passport.serializeUser(function(user,done){
    done(null,user.id);
});
// deserialising the user from the key in the cookie at server
passport.deserializeUser(function(id,done){
    User.findById(id,function(err,user){
    if(err){
        console.log("Error in finding user");
        return done(err);
    }
    return done(null, user);
});
});








app.get('/', function(req,res){
    res.render('landing-page');
});

app.get('/elderly_login', function(req,res){
    res.render('elderly_login');
});

app.get('/elderly_signup', function(req,res){
    res.render('elderly_signup');
});

app.get('/volunteer_signup', function(req,res){
    res.render('volunteer_signup');
});

app.get('/volunteer_login', function(req,res){
    res.render('volunteer_login');
});




// Not visible unless authorized
app.get('/feed', function(req,res){
    if(req.isAuthenticated()){
        res.render("feed",{name: req.user.fullName});
    }
    else{
        res.redirect("/");
    }
});

// For logout of the user
app.get('/logout', function(req,res){
    req.logout();
    req.flash("succes_msg", "You are successfully logged out");
    res.redirect("/");
    console.log("logged out");
})

// For loggin in the old user in the databse
app.post('/elderly_login', function(req,res, next){
    passport.authenticate('local', {
        successRedirect: '/feed',
        failureRedirect: '/elderly_login',
        failureFlash: true
      })(req, res, next);
    console.log(req.body.userType);
});
    


// For registering the Old user in database
app.post('/elderly_signup', function(req,res){
    let errors = [];
    // Check required fields
    if(!req.body.fullName || !req.body.age || !req.body.password || !req.body.confirmPassword || !req.body.phoneNumber){
        errors.push({msg: 'Please fill in all the fields'});
    }
    // Checking if passwords match
    if(req.body.password!== req.body.confirmPassword){
        errors.push({msg: 'Passwords do not match'});
    }

    if (errors.length > 0) {
        console.log(errors);
        res.render('elderly_signup', {
          errors: errors
        });
      } 
    // USER passed the validation
    else{
            User.findOne({phoneNumber: req.body.phoneNumber}).then(user => {
                if(user){
                    // User already exists
                    errors.push({msg: "Phone Number is already registered "});
                    res.render('elderly_signup', {
                        errors: errors
                    });
                }
                else{
                    console.log("In app.js longi, lati", req.body.longitude, req.body.latitude);
                    // Using bcrypt to hash the password
                    const newUser = new User({
                        fullName: req.body.fullName,
                        phoneNumber: req.body.phoneNumber,
                        password: req.body.password,
                        gender: req.body.gender,
                        age: req.body.age,
                        location: {type: "Point", coordinates: [req.body.longitude, req.body.latitude]},
                        userType: "Elderly"
                    });
                    bcrypt.genSalt(10, function(err, salt) {
                        bcrypt.hash(newUser.password, salt, function(err, hash) {
                            // Storing hash in password DB.
                            if(err){
                                console.log(err);
                            }
                            else{
                                newUser.password= hash;
                                newUser.save()
                                .then(user => {
                                    req.flash("success_msg", "User registered!");
                                    res.redirect("/volunteer_login");
                                })
                                .catch(err => console.log(err));
                            }
                        });
                    });
                    console.log(newUser);
                }
            });
        }
});

const fs = require("fs");


app.post("/volunteer_signup", upload, function(req,res){
    let errors = [];
    // Check required fields
    if(!req.body.fullName || !req.body.age || !req.body.password || !req.body.confirmPassword || !req.body.phoneNumber){
        errors.push({msg: 'Please fill in all the fields'});
    }
    // Checking if passwords match
    if(req.body.password!== req.body.confirmPassword){
        errors.push({msg: 'Passwords do not match'});
    }

    if (errors.length > 0) {
        console.log(errors);
        res.render('volunteer_signup', {
          errors: errors
        });
      } 
    // USER passed the validation
    else{
            User.findOne({phoneNumber: req.body.phoneNumber}).then(user => {
                if(user){
                    // User already exists
                    errors.push({msg: "Phone Number is already registered "});
                    res.render('volunteer_signup', {
                        errors: errors
                    });
                }
                else{
                    console.log("In app.js longi, lati", req.body.longitude, req.body.latitude);
                    // Using bcrypt to hash the password
                    const newUser = new User({
                        fullName: req.body.fullName,
                        phoneNumber: req.body.phoneNumber,
                        password: req.body.password,
                        gender: req.body.gender,
                        age: req.body.age,
                        location: {type: "Point", coordinates: [req.body.longitude, req.body.latitude]},
                        img: {
                            data: fs.readFileSync(path.join(__dirname+ "/public/uploads/" + req.file.filename)),
                            contentType: 'image/png'
                        },
                        userType: "Volunteer",
                        imgName: "/uploads/" + req.file.filename
                    });
                    bcrypt.genSalt(10, function(err, salt) {
                        bcrypt.hash(newUser.password, salt, function(err, hash) {
                            // Storing hash in password DB.
                            if(err){
                                console.log(err);
                            }
                            else{
                                newUser.password= hash;
                                newUser.save()
                                .then(user => {
                                    req.flash("success_msg", "User registered!");
                                    res.redirect("/volunteer_login");
                                })
                                .catch(err => console.log(err));
                            }
                        });
                    });
                    console.log(newUser);
                }
            });
        }


});


app.post("/volunteer_login", function(req,res,next){
    passport.authenticate('local', {
        successRedirect: '/feed',
        failureRedirect: '/volunteer_login',
        failureFlash: true
    })(req, res, next);
    console.log(req.body.userType);
});



// Setting up the port
const PORT = process.env.PORT || 3000;
let server = app.listen(PORT, function(err){
    if(err){
        console.log("Error", err);
    }
    console.log("Server is up and running on port 3000");
});

// Chat section
let io = socket(server);

io.on("connection", async function(socket){
    console.log("made socket connection",socket.id);
    
    socket.on("chat",function(data){
        console.log(data);
        io.sockets.emit("chat",data);

    });

    socket.on("typing", function(data){
        socket.broadcast.emit("typeing", data);
    })
})
