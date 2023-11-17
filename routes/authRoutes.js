const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const User = mongoose.model("User");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

//
require("dotenv").config();
//
const bcrpt = require("bcrypt");
//
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // use SSL
  requireTLS: true,
  auth: {
    user: "energisenseapp@gmail.com",
    pass: "phheekefvoembptp",
  },
});

// async..await is not allowed in global scope, must use a wrapper
async function mailer(receiverEmail, code) {
  // send mail with defined transport object
  if (!receiverEmail) {
    console.error("No receiver email defined");
    return;
  }
  let info = await transporter.sendMail({
    from: '"EnergiSense Support" <energisenseapp@gmail.com>', // sender address
    to: `${receiverEmail}`, // list of receivers
    subject: "Signup Verification", // Subject line
    text: `Your Verification Code is ${code}`, // plain text body
    html: `<b>Your Verification Code is ${code}</b>`, // html body
  });
var currentdate = new Date();
  console.log("Message sent: %s", info.messageId);
  console.log("Time: %s", currentdate.getHours() + ":" + currentdate.getMinutes() + ":" + currentdate.getSeconds());
}

mailer().catch(console.error);

//
router.post("/signup", async (req, res) => {
  // res.send('This is signup page');
  // console.log('Sent by Client - ', req.body);
  const { name, email, deviceID, password } = req.body;
        const user = new User({
        name,
        email,
        deviceID,
        password,
      });
      try {
        await user.save();
        const token = jwt.sign({ _id: user._id }, process.env.jwt_secret);
        res.send({ message:"User Registered Successfully", token});
      } catch (err) {
        return res.status(500).json({ error: "server error" });
      }
    }
  );
//
router.post("/verify", async (req, res) => {
//   console.log("Sent by Client - ", req.body);
  const { name, email, deviceID, password } = req.body;
  if (!email || !password || !name || !deviceID) {
    return res.status(422).json({ error: "Please add all the fields" });
  }
  User.findOne({ $or: [{ email: email }, { deviceID: deviceID }] })
  .then(async (savedUser) => {
      if (savedUser) {
        return res.status(422).json({error: "Email or Device ID already used"});
      }
      try{
        let VerificationCode = Math.floor(100000 + Math.random() * 900000);
        let user = {
            name,email,deviceID,password,VerificationCode
        }
        await mailer(email, VerificationCode);
        res.send({message: "Verification Code sent to your email",udata:user });
      }
      catch(err){
        console.log(err);
      }
    });
  
});

//
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(422).json({ error: "Please add email or password" });
  }
  const savedUser = await User.findOne({ email: email });

  if (!savedUser) {
    return res.status(422).json({ error: "User Not Found" });
  }
  try {
    bcrpt.compare(password, savedUser.password, (err, result) => {
      if (result) {
        // console.log("Password matched");
        const token = jwt.sign({ _id: savedUser._id }, process.env.jwt_secret);
        res.send({ token });
      } else {
        // console.log("Password not matched");
        return res.status(422).json({ error: "Invalid Credentials" });
      }
    });
  } catch (err) {
    console.log(err);
  }
});

module.exports = router;
