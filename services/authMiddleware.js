const {validateToken} = require("../services/authServices");

const authMiddleware = (req, res, next)=>{
    if(validateToken(req.cookies.jwt)){
        next();
    }else{
        res.status(401).sendFile("unauthorised.html")
    }
};

module.exports = authMiddleware