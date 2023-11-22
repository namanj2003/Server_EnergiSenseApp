const express = require('express');
// const os = require('os');
const port = 5000;
// const appip =os.networkInterfaces().en0[2].address;
// const appaddress = `http://${appip}:${port}+'/'`;

const app = express();
const bodyParser = require('body-parser');
//
require('./db');
require('./models/User');
//
const authRoutes = require('./routes/authRoutes');
const requireToken = require('./Middleware/AuthTokenRequired');
//
app.use(bodyParser.json());
app.use(authRoutes);
//

app.get('/',requireToken, (req, res) => {
    console.log('User - ', req.user);
    res.send(req.user);
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});