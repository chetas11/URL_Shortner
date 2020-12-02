const express = require("express")
const bodyParser = require("body-parser")
const app = express();
const MongoClient = require('mongodb').MongoClient;
require("dotenv").config();
var md5 = require('md5');

const url = process.env.MONGO_URL;
const password = process.env.MAILPASSWORD;

var nodemailer = require('nodemailer'); 
var randomstring = require("randomstring");
let random = "";

// MongoClient.connect(url, function(err, db) {                                     
//   if (err) throw err;
//   var dbo = db.db("trail");
//   var myobj = { email: "m.banuprakashmib@gmail.com" };
//   dbo.collection("AllData").insertOne(myobj, function(err, res) {
//     if (err) throw err;
//     console.log("document inserted");
//     db.close();
//   });
// }); 

app
.use(express.static(__dirname + '/public'))
.use(bodyParser.urlencoded({extended: true}))
.get("/", (req, res)=>{                                                     // Home page
    res.sendFile(__dirname +"/index.html")  
})
.post("/reset",(req, res)=>{
    random = randomstring.generate();
    MongoClient.connect(url || process.env.MONGODB_URI, { useUnifiedTopology: true }, function(err, db) {
    if (err) throw err;
    let dbo = db.db("trail");
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
            var dbo = db.db("trail");
            var myquery = { email: req.body.email };
            var newvalues = { $set: {tempString : random , resetPasswordExpires : Date.now() + 600000 } }; // Set the expiration time to 10 mins
            dbo.collection("AllData").updateOne(myquery, newvalues, function(err, res) {
                if (err) throw err;
                db.close();
            });
        });
})



app.get('/reset/:token', function(req, res) {
    MongoClient.connect(url || process.env.MONGODB_URI, { useUnifiedTopology: true }, function(err, db) {
            if (err) throw err;
            var dbo = db.db("trail");
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
            var dbo = db.db("trail");                           // Change Password for the specified user
            var myquery = { tempString: random };
            var newvalues = { $set: {password : md5(req.body.Password) } };
            dbo.collection("AllData").updateOne(myquery, newvalues, function(err, res) {
                if (err) throw err;
                MongoClient.connect(url || process.env.MONGODB_URI, { useUnifiedTopology: true }, function(err, db) {
                if (err) throw err;                                    
                var dbo = db.db("trail");           
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


.listen(process.env.PORT);

