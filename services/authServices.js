const bcrypt = require("bcrypt");
const saltRounds = 10;

exports.generateHash = ((planText)=>{
    return new Promise((resolve, reject)=>{
        bcrypt
            .hash(planText, saltRounds)
            .then(function(hash){
                resolve(hash)
            })
            .catch(reject)
    })
});

exports.validateHash = ((plainText, passwordHash) =>{
    return new Promise((resolve, reject)=>{
        bcrypt
            .compare(plainText, passwordHash)
            .then(function(result){
                resolve(result);
            })
            .catch(reject)
    })
});
