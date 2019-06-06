const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
    endpointId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Endpoint'
    },
    uptimeStart: { // Format will be Unix Time
        type: Number,
        required: true,
    },
    downtimeStart: {
        type: Number,
        required: true,
    },
    resTime: { // duration in ms
        type: Number,
        required: true,
    },
});

// helper method to return user
resultSchema.statics.findByEndpointId = async (endpointId) => {
    const results = await this.find({
        endpoint: endpointId
    });

    return results;
};

const Result = mongoose.model('Result', resultSchema);

module.exports = Result;

// current uptime % since start