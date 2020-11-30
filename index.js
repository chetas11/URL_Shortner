const express = require("express")
const bodyParser = require("body-parser")
const app = express();
const MongoClient = require('mongodb').MongoClient;
require("dotenv").config();

const url = process.env.MONGO_URL;


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
    res.sendFile(__dirname+"/public/Failed.html")
    MongoClient.connect(url || process.env.MONGODB_URI, function(err, db) {
    if (err) throw err;
    let dbo = db.db("trail");
    let query = { email: req.body.email };
    dbo.collection("AllData").find(query).toArray(function(err, result) {
        if (err) throw err;
        if(result.length>0){
            console.log("User Found") 
        }
        if(result.length===0){
            console.log("User Not Found")
        }
        db.close();
    });
    });
})

.listen(8000);

