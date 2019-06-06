const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
    endpointId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Endpoint'
    },
    timestamp: { // Format will be Unix Time
        type: Number,
        required: true,
    },
    statusCode: {
        type: Number,
        required: true,
    },
    resTime: { // duration in ms
        type: Number,
        required: true,
    },
});

// helper method to return all results for an endpoint
resultSchema.statics.findByEndpointId = async (endpointId) => {
    const results = await this.find({
        endpointId: endpointId
    });

    return results;
};

const Result = mongoose.model('Result', resultSchema);

module.exports = Result;