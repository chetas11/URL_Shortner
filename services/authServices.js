require("dotenv").config();

const jwt = require("jsonwebtoken");
const secret = process.env.Secret;

exports.createToken = (username) => {
    return jwt.sign({
        username
    },
    secret,
    {expiresIn: "5 days"}
    );
}

exports.validateToken = (token) => {
    try{
        const decoded = jwt.verify(token, secret)
        return decoded;
    }catch(err){
        console.log(err);
        return false
    }
}