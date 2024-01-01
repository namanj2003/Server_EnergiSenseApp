const mongoose = require('mongoose');
const deviceData = mongoose.Schema({
    v0: {
        type: String,
        required: true,
    },
    v1: {
        type: String,
        required: true,
    },
    v2: {
        type: String,
        required: true,
    },
    v3: {
        type: String,
        required: true,
    }, 
    timeStamp: {
        type: String,
        required: true,
    },
    deviceID: {
        type: String,
        required: true,
    },


});
deviceData.pre('save', async function (next) {
    next();
})
mongoose.model('DeviceData ', deviceData);