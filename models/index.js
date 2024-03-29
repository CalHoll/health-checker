const mongoose = require('mongoose');

const Endpoint = require('./Endpoint');
const Result = require('./Result');

const connectDb = () => {
    return mongoose.connect(process.env.DATABASE_URL, {
        useNewUrlParser: true
    });
};

// setUpDb is a helper function to pre-populate database during developement
const setUpDb = async () => {
    // TODO: remove hard coded endpoint in code, ideally users add these themselves
    const endpoint = new Endpoint({
        url: 'http://localhost:12345',
        schedule: '*/1 * * * * *', // every 1 seconds
        retention: 1,
    });

    await endpoint.save()
};

module.exports = {
    connectDb,
    setUpDb,
    Endpoint,
    Result
};