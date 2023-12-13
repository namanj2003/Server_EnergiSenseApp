const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const User = mongoose.model("User");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

//
require("dotenv").config();
//
const bcrypt = require("bcrypt");
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
    text: `Your Verification Code is\n\n ${code}`, // plain text body
    html: `<b>Your Verification Code is<br><br>${code}</b>`, // html body
  });
var currentdate = new Date();
  console.log("Message sent: %s", info.messageId);
  console.log("Time: %s", currentdate.getHours() + ":" + currentdate.getMinutes() + ":" + currentdate.getSeconds());
}

mailer().catch(console.error);
//

async function forget(receiverEmail, code) {
  // send mail with defined transport object
  if (!receiverEmail) {
    console.error("No receiver email defined");
    return;
  }
  let info = await transporter.sendMail({
    from: '"EnergiSense Support" <energisenseapp@gmail.com>', // sender address
    to: `${receiverEmail}`, // list of receivers
    subject: "Reset Password", // Subject line
    text: `Use the following verification code to reset your password\n\n ${code}`, // plain text body
    html: `<b>Use the following verification code to reset your password<br><br>${code}</b>`, // html body
  });
var currentdate = new Date();
  console.log("Message sent: %s", info.messageId);
  console.log("Time: %s", currentdate.getHours() + ":" + currentdate.getMinutes() + ":" + currentdate.getSeconds());
}

forget().catch(console.error);
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
    bcrypt.compare(password, savedUser.password, (err, result) => {
      if (result) {
       let userData = {
          email: savedUser.email,
          name: savedUser.name,
          deviceID: savedUser.deviceID,
        };
        

        // console.log("Password matched");
        const token = jwt.sign({ _id: savedUser._id }, process.env.jwt_secret);
        res.send({ token, apikey: userData});

      } else {
        // console.log("Password not matched");
        return res.status(422).json({ error: "Invalid Credentials" });
      }
    });
  } catch (err) {
    console.log(err);
  }
});
//
router.post("/forgot-password-check", async (req, res) => {
  const {email} = req.body;
  if (!email) {
    return res.status(422).json({ error: "Please add email" });
  }
  User.findOne({ email: email }).then(async (savedUser) => {
    if (!savedUser) {
      return res.status(422).json({ error: "User Not Found" });
    }
    try {
      let VerificationCode = Math.floor(100000 + Math.random() * 900000);
      let user = {
          email,VerificationCode
      }
      await forget(email, VerificationCode);
      res.send({message: "Verification Code sent to your email to reset your password",resetData:user });
    }
    catch(err){
      console.log(err);
    }
  });

  router.post("/forgot-password-change", async (req, res) => {
    const {email, password} = req.body;
    if (!password) {
      return res.status(422).json({ error: "Please add password" });
    }
    const hashedPassword = await bcrypt.hash(password, 12);
    User.updateOne({ email: email }, { $set: { password: hashedPassword } }).then(async (result) => {
      // console.log(result);
      if (result?.modifiedCount > 0) {
        try {
          const user = await User.findOne({ email: email });
          const token = jwt.sign({ _id: user._id }, process.env.jwt_secret);
          console.log("Password changed successfully");
          console.log({ token });
          res.send({message: "Password changed successfully", token: token});
        }
        catch(err){
          console.log(err);
        }
      }
    });
  });

router.post("/save-profile", async (req, res) => {
  const { email, name, deviceID } = req.body;
  if (!email || !name || !deviceID) {
    return res.status(422).json({ error: "Please add all the fields" });
  }
  try {
    let existingUser = await User.findOne({ deviceID: deviceID });
    if (existingUser) {
      if (existingUser.email === email) {
        existingUser.name = name;
      } else {
        existingUser.email = email;
        existingUser.name = name;
      }
    } else {
      return res.status(404).json({ error: "No user found with the provided device ID" });
    }
    await existingUser.save();
    const token = jwt.sign({ _id: existingUser._id }, process.env.jwt_secret);
    const message = "Profile updated successfully";
    res.send({ message, token: token });
  } catch (err) {
    console.log(err);
  }
});
});
module.exports = router;
