const express = require("express")
const bodyParser = require("body-parser")
const app = express();
const MongoClient = require('mongodb').MongoClient;
require("dotenv").config();
var md5 = require('md5');
const nodemailer = require('nodemailer'); 
let randomstring = require("randomstring");


const url = process.env.MONGO_URL;
const password = process.env.MAILPASSWORD;


let random = "";
let activationString = "";

app
.use(express.static(__dirname + '/public'))
.use(bodyParser.urlencoded({extended: true}))
.get("/", (req, res)=>{                                                     
    res.sendFile(__dirname +"/index.html")
    MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    var dbo = db.db("newDB");
    var query = { activationTimer : { $lt: Date.now() }, activationString: { $ne: "Activated" } };
    dbo.collection("Userdata").deleteMany(query, function(err, obj) {
        if (err) throw err;
        db.close();
        console.log("Rows Deleted!")
        });
    });
})
.post("/home", (req, res)=>{                                                    
    MongoClient.connect(url || process.env.MONGODB_URI, { useUnifiedTopology: true }, function(err, db) {
            if (err) throw err;
            var dbo = db.db("newDB");
            var myquery = { email: req.body.email, password: md5(req.body.password) };
            dbo.collection("Userdata").find(myquery).toArray(function(err, result) {
                if (err) throw err;
                if(result.length === 0 ){
                    res.send("Sorry not registered")
                }else{
                    res.send("Logged In")
                }
                db.close();
            });
    });
})
.post("/newuser", (req, res)=>{   
    activationString = randomstring.generate();                                                  
    MongoClient.connect(url || process.env.MONGODB_URI, { useUnifiedTopology: true }, function(err, db) {
        if (err) throw err;
        var dbo = db.db("newDB");
        var myobj = { FName: req.body.firstname, LName: req.body.lastname, email: req.body.email, password:md5(req.body.password), activationTimer:Date.now() + 600000, activationString: activationString};
        var query = { email: req.body.email }
        dbo.collection("Userdata").find(query).toArray(function(err, result){
            if(result.length===0){
                dbo.collection("Userdata").insertOne(myobj, function(err, res) {
                    if (err) throw err;
                    db.close();
            });
            res.sendFile(__dirname+"/public/signupSuccess.html")
            var transporter = nodemailer.createTransport({              // Send mail with the reset password link
            service: 'gmail',
            auth: {
                user: 'mangeshvalanju13@gmail.com',
                pass:  password
            }
            });
            var mailOptions = {
            from: 'mangeshvalanju13@gmail.com',
            to: req.body.email,
            subject: 'Active your accont',
            text: 'Hello, '+ req.body.email + '\n\n'+
                    'You are receiving this because you (or someone else) have requested sign up for URL_Shortner Service.\n\n' +
                    'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
                    'http://' + req.headers.host + '/activate/' + activationString + '\n\n' +
                    'If you did not request this, please ignore this email and your password will remain unchanged.\n'
             
            };

            transporter.sendMail(mailOptions, function(error, info){
            if (error) console.log(error);}); 

            }else{
                res.sendFile(__dirname+"/public/signupError.html")
            }
        }); 
    });
})

.get('/activate/:token', function(req, res) {
    MongoClient.connect(url || process.env.MONGODB_URI, { useUnifiedTopology: true }, function(err, db) {
            if (err) throw err;
            var dbo = db.db("newDB");
            var query = { activationString : req.params.token, activationTimer: { $gt: Date.now() } };
            var myquery = { $set: {activationString: "Activated"} };
            dbo.collection("Userdata").find(query).toArray(function(err, result) {
                if(result.length > 0){
                    dbo.collection("Userdata").updateOne(query, myquery, function(err, res) {
                        if (err) throw err;
                        console.log("1 document updated");
                        db.close();
                    });
                    res.sendFile(__dirname+"/public/reset.html");
                }else{
                    res.sendFile(__dirname+"/public/invalid.html")
                }
            });
        });
})


.post("/reset",(req, res)=>{
    random = randomstring.generate();
    MongoClient.connect(url || process.env.MONGODB_URI, { useUnifiedTopology: true }, function(err, db) {
    if (err) throw err;
    let dbo = db.db("newDB");
    let query = { email: req.body.email };
    dbo.collection("AllData").find(query).toArray(function(err, result) {
        if (err) throw err;
        if(result.length === 0 ){
            res.sendFile(__dirname+"/public/Failed.html")
        }
        else{
            res.sendFile(__dirname+"/public/success.html")
            var transporter = nodemailer.createTransport({              // Send mail with the reset password link
            service: 'gmail',
            auth: {
                user: 'mangeshvalanju13@gmail.com',
                pass:  password
            }
            });
            var mailOptions = {
            from: 'mangeshvalanju13@gmail.com',
            to: req.body.email,
            subject: 'Reset Password for your account',
            text: 'Hello, '+ req.body.email + '\n\n'+
                    'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
                    'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
                    'http://' + req.headers.host + '/reset/' + random + '\n\n' +
                    'If you did not request this, please ignore this email and your password will remain unchanged.\n'
             
            };

            transporter.sendMail(mailOptions, function(error, info){
            if (error) console.log(error);}); 
            db.close();
        }
        
    });
    });
    MongoClient.connect(url || process.env.MONGODB_URI, { useUnifiedTopology: true }, function(err, db) {
            if (err) throw err;
            var dbo = db.db("newDB");
            var myquery = { email: req.body.email };
            var newvalues = { $set: {tempString : random , resetPasswordExpires : Date.now() + 600000 } }; // Set the expiration time to 10 mins
            dbo.collection("AllData").updateOne(myquery, newvalues, function(err, res) {
                if (err) throw err;
                db.close();
            });
        });
})
.get('/reset/:token', function(req, res) {
    MongoClient.connect(url || process.env.MONGODB_URI, { useUnifiedTopology: true }, function(err, db) {
            if (err) throw err;
            var dbo = db.db("newDB");
            var query = { tempString : req.params.token, resetPasswordExpires: { $gt: Date.now() } };
            dbo.collection("AllData").find(query).toArray(function(err, result) {
                if(result.length > 0){
                    res.sendFile(__dirname+"/public/reset.html")
                }else{
                    res.sendFile(__dirname+"/public/invalid.html")
                }
                db.close();
            });
        });
})


.post("/changepassword",(req, res)=>{                         // Change Password form                        
   if(req.body.Password === req.body.ConfirmPassword){
        MongoClient.connect(url || process.env.MONGODB_URI, { useUnifiedTopology: true }, function(err, db) {
            if (err) throw err;
            var dbo = db.db("newDB");                           // Change Password for the specified user
            var myquery = { tempString: random };
            var newvalues = { $set: {password : md5(req.body.Password) } };
            dbo.collection("AllData").updateOne(myquery, newvalues, function(err, res) {
                if (err) throw err;
                MongoClient.connect(url || process.env.MONGODB_URI, { useUnifiedTopology: true }, function(err, db) {
                if (err) throw err;                                    
                var dbo = db.db("newDB");           
                var myquery = { tempString: random };
                var newvalues = { $set: {tempString : "" } };                           // removing the random string
                dbo.collection("AllData").updateOne(myquery, newvalues, function(err, res) {
                    if (err) throw err;
                    db.close();
                });
            });
            });
        });
    res.sendFile(__dirname+"/public/passwordChanged.html")
   }else{
       res.sendFile(__dirname+"/public/mismatch.html")
   }
   
})


.get("*", (req, res)=>{                                             // Default route                    
    res.sendFile(__dirname+"/public/notFound.html")
})

.listen(8000);

