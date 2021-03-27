// Setting up our mongoose database;


const mongoose = require("mongoose");

mongoose.connect('mongodb://localhost:27017/theSocialHelperDB', {
    useNewUrlParser: true, 
    useUnifiedTopology: true,
    useCreateIndex: true
});

const db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log("Database connected");
});

module.exports = db;