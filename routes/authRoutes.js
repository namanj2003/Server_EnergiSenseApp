const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = mongoose.model('User');
const jwt = require('jsonwebtoken');

//
require('dotenv').config();
//
const bcrpt = require('bcrypt');

router.post('/signup', async(req, res) => {
    // res.send('This is signup page');
    // console.log('Sent by Client - ', req.body);
    const { name, email, deviceID, password } = req.body;
    if (!email || !password || !name || !deviceID) {
        return res.status(422).json({ error: "Please add all the fields" });
    }
    User.findOne({ $or:[{email: email},{deviceID: deviceID }]})
    .then(
        async (savedUser) => {
            if (savedUser) {
                return res.status(422).json({ error: "Email or Device ID already sed" });
            }
            const user = new User({
                name,
                email,
                deviceID,
                password
            });
            try{
            await user.save();
            const token = jwt.sign({ _id: user._id }, process.env.jwt_secret);
            res.send({ token });
            }
            catch(err){
                return res.status(500).json({ error: "server error" });
            }
        }
    )
}
);

router.post('/login', async(req, res) => {
    const { email, password } = req.body;
    if (!email || !password ) {
        return res.status(422).json({ error: "Please add email or password" });
    }
    const savedUser = await User.findOne({ email: email })

    if (!savedUser) {
        return res.status(422).json({ error: "User Not Found" });
    }
    try{
        bcrpt.compare(password, savedUser.password, (err, result) => {
            if(result){
                console.log("Password matched");
                const token = jwt.sign({ _id: savedUser._id }, process.env.jwt_secret);
                res.send({ token });
            }
            else{
                console.log("Password not matched");
                return res.status(422).json({ error: "Invalid Credentials" });
            }
        });
    }
    catch(err){
       console.log(err);
    }
});

module.exports = router;