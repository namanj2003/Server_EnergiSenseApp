const nodemailer = require('nodemailer');
require("dotenv").config();

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // use SSL
  requireTLS: true,
  auth: {
    user: "energisenseapp@gmail.com",
    pass: "tgfuqdgotbutduqb",
  },
});

module.exports = transporter;