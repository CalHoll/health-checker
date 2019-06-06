// First populate environmental variables
require('dotenv').config();

// Import dependancies
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const chalk = require('chalk');

// Import database models and controllers
const models = require('./models');
const controllers = require('./controllers');

// Gather environmental variables
const env = process.env.ENV || "development";
const host = process.env.HOST || "http://localhost";
const port = process.env.PORT || 1337;
let clearDatabaseOnStart = process.env.CLEAR_DB_ON_START;
if (clearDatabaseOnStart === undefined) {
    clearDatabaseOnStart = true;
}

// Create Express server and apply middleware
const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

// Connect to db and start service
models.connectDb().then(async () => {
    // For development, on each restart clear and add some dummy data
    if (clearDatabaseOnStart) {
        await Promise.all([
            models.Endpoint.deleteMany({}),
            models.Result.deleteMany({}),
        ]).catch(
            console.error(`${chalk.red('x')} Could not clear existing collections`)
        );;

        await models.setUpDb();
    }

    app.listen(port, () => {
        console.log(`${chalk.green('✓')} Service started in ${env} mode`);
        console.log(`  Interact using API through ${host}:${port}`);
        console.log('  Press CTRL-C to stop\n');

        // Run scheduler on each endpoint in the database
        models.Endpoint.find({}).then((endpoints) => {
            endpoints.forEach((url) => {
                controllers.poller.scheduleHealthCheck(url);
            })
        })
    });
}).catch(
    console.error(`${chalk.red('✘')} There was a problem starting the server`)
);

module.exports = app;