const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = mongoose.model('User');
const jwt = require('jsonwebtoken');
//
require('dotenv').config();
//


router.post('/signup', async(req, res) => {
    // res.send('This is signup page');
    console.log('Sent by Client - ', req.body);
    const { name, email, deviceID, password } = req.body;
    if (!email || !password || !name || !deviceID) {
        return res.status(422).json({ error: "Please add all the fields" });
    }
    User.findOne({ $or:[{email: email},{deviceID: deviceID }]})
    .then(
        async (savedUser) => {
            if (savedUser) {
                return res.status(422).json({ error: "Invalid Credentials" });
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

module.exports = router;