const express = require("express")
const bodyParser = require("body-parser")
const app = express();
const MongoClient = require('mongodb').MongoClient;
require("dotenv").config();
var sessionstorage = require('sessionstorage');
var md5 = require('md5');

const url = process.env.MONGO_URL;
const password = process.env.MAILPASSWORD;

var nodemailer = require('nodemailer'); 
var randomstring = require("randomstring");



// MongoClient.connect(url, function(err, db) {
//   if (err) throw err;
//   var dbo = db.db("trail");
//   var myobj = { email: "raju097@gmail.com" };
//   dbo.collection("AllData").insertOne(myobj, function(err, res) {
//     if (err) throw err;
//     console.log("document inserted");
//     db.close();
//   });
// }); 

app

.use(express.static(__dirname + '/public'))
.use(bodyParser.urlencoded({extended: true}))
.get("/", (req, res)=>{
    res.sendFile(__dirname +"/index.html")  
})
.post("/reset",(req, res)=>{
    let random = randomstring.generate();
    MongoClient.connect(url || process.env.MONGODB_URI, { useUnifiedTopology: true }, function(err, db) {
    if (err) throw err;
    let dbo = db.db("trail");
    let query = { email: req.body.email };
    dbo.collection("AllData").find(query).toArray(function(err, result) {
        if (err) throw err;
        if(result.length===0){
            res.sendFile(__dirname+"/public/Failed.html")
        }
        else{
            res.sendFile(__dirname+"/public/success.html")
            var transporter = nodemailer.createTransport({
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
            text: "Please enter this string to procceed with resetting of passowrd: "+ random
            };
        }
        // transporter.sendMail(mailOptions, function(error, info){
        // if (error) console.log(error);}); 
        db.close();
    });
    });

    sessionstorage.setItem("randomStr", random)

    MongoClient.connect(url || process.env.MONGODB_URI, { useUnifiedTopology: true }, function(err, db) {
            if (err) throw err;
            var dbo = db.db("trail");
            var myquery = { email: req.body.email };
            var newvalues = { $set: {tempString : random } };
            dbo.collection("AllData").updateOne(myquery, newvalues, function(err, res) {
                if (err) throw err;
                db.close();
            });
        });
})

.post("/verify",(req, res)=>{
   MongoClient.connect(url || process.env.MONGODB_URI, { useUnifiedTopology: true }, function(err, db) {
            if (err) throw err;
            var dbo = db.db("trail");
            var query = { tempString : req.body.randomString };
            dbo.collection("AllData").find(query).toArray(function(err, result) {
                if(result.length > 0){
                    res.sendFile(__dirname+"/public/reset.html")
                }else{
                    res.end("Incorrect")
                }
                db.close();
            });
        });
})

.post("/changepassword",(req, res)=>{
   if(req.body.Password === req.body.ConfirmPassword){
        MongoClient.connect(url || process.env.MONGODB_URI, { useUnifiedTopology: true }, function(err, db) {
            if (err) throw err;
            var dbo = db.db("trail");
            var myquery = { tempString: sessionstorage.getItem("randomStr") };
            var newvalues = { $set: {password : md5(req.body.Password) } };
            dbo.collection("AllData").updateOne(myquery, newvalues, function(err, res) {
                if (err) throw err;
            });
        });
        MongoClient.connect(url || process.env.MONGODB_URI, { useUnifiedTopology: true }, function(err, db) {
            if (err) throw err;
            var dbo = db.db("trail");
            var myquery = { tempString: sessionstorage.getItem("randomStr") };
            var newvalues = { $set: {tempString : "" } };
            dbo.collection("AllData").updateOne(myquery, newvalues, function(err, res) {
                if (err) throw err;
                db.close();
            });
        });
   }else{
       console.log("Password not matched")
   }
   
})



.listen(8000);

