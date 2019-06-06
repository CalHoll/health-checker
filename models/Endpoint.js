const mongoose = require('mongoose');

const endpointSchema = new mongoose.Schema({
    url: {
        type: String,
        required: true,
    },
    schedule: { // format here: (https://www.npmjs.com/package/node-cron)
        type: String,
        required: true,
    },
    retention: { // duration in days
        type: Number,
        required: false,
    },
});

const Endpoint = mongoose.model('Endpoint', endpointSchema);

module.exports = Endpoint;