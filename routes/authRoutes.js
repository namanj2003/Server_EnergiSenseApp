const express = require("express");
const path = require('path');
const router = express.Router();
const mongoose = require("mongoose");
const User = mongoose.model("User");
const DeviceData = mongoose.model("DeviceData ");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

//
require("dotenv").config();
//
const bcrypt = require("bcrypt");
const AuthTokenRequired = require("../Middleware/AuthTokenRequired");
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
    res.send({ message: "User Registered Successfully", token });
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
        return res.status(422).json({ error: "Email or Device ID already used" });
      }
      try {
        let VerificationCode = Math.floor(100000 + Math.random() * 900000);
        let user = {
          name, email, deviceID, password, VerificationCode
        }
        await mailer(email, VerificationCode);
        res.send({ message: "Verification Code sent to your email", udata: user });
      }
      catch (err) {
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
    return res.status(422).send({ message: "User Not Found" });
  }
  try {
    bcrypt.compare(password, savedUser.password, (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).send({ error: "Server error" });
      }
      if (result) {
        let userData = {
          email: savedUser.email,
          name: JSON.parse(savedUser.name),
          deviceID: savedUser.deviceID,
        };
        // console.log("Password matched");
        const token = jwt.sign({ _id: savedUser._id }, process.env.jwt_secret);
        res.send({ token, apikey: userData, message: "Password matched" });
      } else {
        // console.log("Password not matched");
        return res.status(422).send({ message: "Invalid Credentials" });
      }
    });
  } catch (err) {
    console.log(err);
  }
});
//
router.post("/forgot-password-check", async (req, res) => {
  const { email } = req.body;
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
        email, VerificationCode
      }
      await forget(email, VerificationCode);
      res.send({ message: "Verification Code sent to your email to reset your password", resetData: user });
    }
    catch (err) {
      console.log(err);
    }
  });
});
//
router.post("/forgot-password-change", async (req, res) => {
  const { email, password } = req.body;
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
        // console.log("Password changed successfully");
        console.log({ token });
        res.send({ message: "Password changed successfully", token: token });
      }
      catch (err) {
        console.log(err);
      }
    }
  });
});
//
router.post("/change-password", async (req, res) => {
  const { email, currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(422).json({ error: "Please add all the fields" });
  }
  if (newPassword.length < 8) {
    return res.status(422).json({ error: "Password must be at least 8 characters long" });
  }
  const savedUser = await User.findOne({ email: email });
  if (!savedUser) {
    return res.status(422).json({ error: "User Not Found" });
  }
  try {
    bcrypt.compare(currentPassword, savedUser.password, async (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).send({ error: "Server error" });
      }
      if (result) {
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        User.updateOne({ email: email }, { $set: { password: hashedPassword } }).then(async (result) => {
          if (result?.modifiedCount > 0) {
            try {
              const user = await User.findOne({ email: email });
              const token = jwt.sign({ _id: user._id }, process.env.jwt_secret);
              // console.log("Password changed successfully");
              console.log({ token });
              res.send({ message: "Password changed successfully", token: token });
            }
            catch (err) {
              console.log(err);
            }
          }
        });
      } else {
        return res.status(401).send({ message: "Current Password is Incorrect" });
      }
    });
  } catch (err) {
    console.log(err);
  }
});



//
router.post("/save-profile", async (req, res) => {
  const { name, email, deviceID } = req.body;
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
    // console.log(existingUser)
    res.send({ message, token: token });
  } catch (err) {
    console.log(err);
  }
});
//
router.post("/historydata-send", async (req, res) => {
  const { v0, v1, v2, v3, timeStamp, deviceID } = req.body;
  if (v0 === null || v0 === "" || v1 === null || v1 === "" || v2 === null || v2 === "" || v3 === null || v3 === "" || timeStamp === null || timeStamp === "" || deviceID === null || deviceID === "") {
    return res.status(422).json({ error: "Some Data Missing" });
  }
  const formattedData = {
    v0: String(v0),
    v1: String(v1),
    v2: String(v2),
    v3: String(v3),
    timeStamp: String(timeStamp),
    deviceID: String(deviceID)
  };
  try {
    const deviceData = new DeviceData(formattedData);
    await deviceData.save();
    const message = "Data saved successfully";
    res.send({ message });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
//
router.get("/historydata-get", AuthTokenRequired, async (req, res) => {
  const { deviceID } = req.query;
  if (!deviceID) {
    return res.status(422).send({ error: "You must provide a device id" });
  }
  try {
    const deviceData = await DeviceData.find({ deviceID: deviceID });
    if (!deviceData || deviceData.length === 0) {
      return res.status(404).send({ error: "No documents found for this device ID" });
    }
    res.send(deviceData);
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: "Server error" });
  }
});
//
router.get('/avatar/:imageName', (req, res) => {
  const imageName = req.params.imageName;
  const imagePath = path.join(__dirname, '..', 'Avatars', imageName);

  res.sendFile(imagePath, err => {
    if (err) {
      console.error(err);
      res.status(500).send({ error: "Server error" });
    }
  });
});
//
router.get("/test", async (req, res) => {
  res.send("This is test page");
});


module.exports = router;
