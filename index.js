const express = require("express")
const bodyParser = require("body-parser")
const MongoClient = require('mongodb');
const nodemailer = require('nodemailer'); 
let randomstring = require("randomstring");
const ShortURL = require("./shortURL");
const {createToken} = require("./services/authServices")
const cookieParser = require('cookie-parser')
const authMiddleWare = require("./services/authMiddleware")
const mongoose = require("mongoose");
const md5 = require('md5');
require("dotenv").config();

const app = express();
const url = process.env.MONGO_URL;
const url1 = process.env.MONGO_URL1;
const password = process.env.MAILPASSWORD;
let random = "";
let activationString = "";

mongoose.connect(url1 || process.env.MONGODB_URI1, { useUnifiedTopology: true }, { useNewUrlParser: true })


// Deletes the inactive user from DB after Activation String Expires

MongoClient.connect(url || process.env.MONGODB_URI, { useUnifiedTopology: true }, function(err, db) {
    if (err) throw err;
    var dbo = db.db("newDB");
    var query = { activationTimer: { $lt: Date.now() }, activationString: { $ne: "Activated" } };
    dbo.collection("Userdata").deleteMany(query)
});

app.set('view engine', 'ejs')
app.use(cookieParser())
app
.use(express.static(__dirname + '/public'))
.use(bodyParser.urlencoded({extended: true}))


.get("/", (req, res)=>{                                       //Login page                                                                          
    res.sendFile(__dirname +"/index.html")
})
.get('/home',authMiddleWare, async (req, res)=>{              //Url Shortener Main
    const shortUrls = await ShortURL.find()
    res.render('index', {shortUrls: shortUrls}) 
})
.post('/shorturl',authMiddleWare,  async (req, res)=>{        //Adding new url and refreshing the page
    await ShortURL.create({full: req.body.url})
    res.redirect("/home")
})
.get('/AllUrls',authMiddleWare, async (req, res)=>{           //Display all the available urls
    const ALLUrls = await ShortURL.find()
    res.render('AllUrls', {shortUrls: ALLUrls})  
})
.get('/:shorturls',authMiddleWare, async (req, res)=>{        //redirect to actual url using short url                              
    const shortUrl = await ShortURL.findOne({ short: req.params.shorturls})
    if(shortUrl === null) return res.sendFile(__dirname+"/public/notFound.html")
    shortUrl.clicks++     // incrementing clicks every time someone visit the page  
    shortUrl.save()
    res.redirect(shortUrl.full)
})
.post("/home", (req, res)=>{                    // match the username and password
    MongoClient.connect(url || process.env.MONGODB_URI, { useUnifiedTopology: true }, function(err, db) {
            if (err) throw err;
            var dbo = db.db("newDB");
            var myquery = { email: req.body.email, password: md5(req.body.password), activationString:"Activated" };
            dbo.collection("Userdata").find(myquery).toArray(function(err, result) {
                if (err) throw err;
                if(result.length === 0 ){
                    res.sendFile(__dirname+"/public/unauthorised.html")
                }else{ 
                    const token =  createToken(req.body.email)  // creating a jwt token for logged in session
                    res.cookie("jwt", token,{      //creating cookie to store the token         
                        maxAge: 100000000000,
                        httpOnly: false,
                        secure: false
                    });
                    res.redirect("/home")
                }
                db.close();
            });
    });
})
.post("/newuser", (req, res)=>{                             //create a new account
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
            res.sendFile(__dirname+"/public/signupSuccess.html")    // Send mail with the Activation link
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
            subject: 'Active your accont',
            text: 'Hello, '+ req.body.email + '\n\n'+
                    'You are receiving this because you (or someone else) have requested sign up for URL_Shortner Service.\n\n' +
                    'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
                    'http://' + req.headers.host + '/activate/' + activationString + '\n\n' +
                    'If you did not request this, please ignore this email and your password will remain unchanged.\n'
                    // message body with headers and activation string
            };

            transporter.sendMail(mailOptions, function(error, info){
            if (error) console.log(error);});   // send mail to requested email address

            }else{
                res.sendFile(__dirname+"/public/signupError.html")
            }
        }); 
    });
})

.get('/activate/:token', function(req, res) {               //verifying the user with activation string
    MongoClient.connect(url || process.env.MONGODB_URI, { useUnifiedTopology: true }, function(err, db) {
            if (err) throw err;
            var dbo = db.db("newDB");
            var query = { activationString : req.params.token, activationTimer: { $gt: Date.now() } };
            var myquery = { $set: {activationString: "Activated"} };
            dbo.collection("Userdata").find(query).toArray(function(err, result) {
                if(result.length > 0){
                    dbo.collection("Userdata").updateOne(query, myquery, function(err, res) {
                        if (err) throw err;
                        db.close();
                    });
                    res.sendFile(__dirname+"/public/activated.html"); 
                }else{
                    res.sendFile(__dirname+"/public/invalid.html")
                }
            });
        });
})
.post("/reset",(req, res)=>{                    // to reset the password
    random = randomstring.generate();
    MongoClient.connect(url || process.env.MONGODB_URI, { useUnifiedTopology: true }, function(err, db) {
    if (err) throw err;
    let dbo = db.db("newDB");
    let query = { email: req.body.email };
    dbo.collection("Userdata").find(query).toArray(function(err, result) {
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
                    //sending mail headers and resert string
            };

            transporter.sendMail(mailOptions, function(error, info){
            if (error) console.log(error);}); // send mail to requested email address
            db.close();
        }
        
    });
    });
    MongoClient.connect(url || process.env.MONGODB_URI, { useUnifiedTopology: true }, function(err, db) {
            if (err) throw err;
            var dbo = db.db("newDB");
            var myquery = { email: req.body.email };
            var newvalues = { $set: {tempString : random , resetPasswordExpires : Date.now() + 600000 } }; // Set the expiration time to 10 mins
            dbo.collection("Userdata").updateOne(myquery, newvalues, function(err, res) {
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
            dbo.collection("Userdata").find(query).toArray(function(err, result) {
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
            dbo.collection("Userdata").updateOne(myquery, newvalues, function(err, res) {
                if (err) throw err;
                MongoClient.connect(url || process.env.MONGODB_URI, { useUnifiedTopology: true }, function(err, db) {
                if (err) throw err;                                    
                var dbo = db.db("newDB");           
                var myquery = { tempString: random };
                var newvalues = { $set: {tempString : "" } };                           // removing the random string
                dbo.collection("Userdata").updateOne(myquery, newvalues, function(err, res) {
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
.get("/user/logout", (req, res)=>{           //logout the user and clears the jwt cookie
    res.clearCookie("jwt")                                                                
    res.redirect("/")
})

.get("*", (req, res)=>{                                             // Default route                    
    res.sendFile(__dirname+"/public/notFound.html")
})

.listen(8000 || process.env.PORT);

