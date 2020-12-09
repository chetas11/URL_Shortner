require("dotenv").config();

const jwt = require("jsonwebtoken");
const secret = process.env.Secret;

exports.createToken = (username) => {               // function to create Jwt token  
    return jwt.sign({
        username
    },
    secret,
    {expiresIn: "2 days"}
    );
}

exports.validateToken = (token) => {                // function to verify token 
    try{
        const decoded = jwt.verify(token, secret)
        return decoded;
    }catch(err){
        console.log(err);
        return false
    }
}