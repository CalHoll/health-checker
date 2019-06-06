const cron = require('node-cron');
const axios = require('axios');
const chalk = require('chalk');
const models = require('../models');

// create a cache to store the previous result for each endpoint
// so that we know when a status change has occurred
let lastResult = {}

// TODO: move status changes to permanent storage
let statusChanges = {
    // <some endpoint id>: [
    //     {
    //         timestamp: 1393903983
    //         status: "up"   / or "down"
    //     }
    // ]
}

let metrics = {
    // <some endpoint id>: {
    //     uptimeDuration: null,
    //     downtimeDuration: null,
    //     uptimePercent: null,
    // }
}

let timeUp = 0
let timeDown = 0

const scheduleHealthCheck = (endpoint) => {
    // TODO: this check should check if the format is correct, not just that it exists.
    if (!endpoint.schedule) {
        console.error(`No schedule provided for endpoint: ${endpoint.url}`);
        return
    }

    cron.schedule(endpoint.schedule, () => {
        // Make call to endpoint
        // TODO: could build in functionality to specify http protocol/params
        makeGetRequestCheck(endpoint)
    });
}

const makeGetRequestCheck = (endpoint) => {
    const startTime = Date.now()
    axios({
            method: 'get',
            url: endpoint.url,
            timeout: 1000 // TODO: make timeout configurable per endpoint
        })
        .then(function (response) {
            const resultParams = {
                endpointId: endpoint.id,
                url: endpoint.url,
                timestamp: startTime,
                totalTime: Date.now() - startTime,
                statusCode: response.status
            }
            // handle success for 200 status code, treat all others as fail
            if (response.status === 200) {
                handleSuccess({
                    status: "up",
                    ...resultParams
                })
            } else {
                const newErr = new Error(`${chalk.red('✘')} Failure getting 200 status code from ${endpoint.url} at ${Date.now()}`)
                handleFail(resultParams, newErr)
            }
        })
        .catch(handleFail.bind(null, {
            endpointId: endpoint.id,
            url: endpoint.url,
            timestamp: startTime,
            totalTime: Date.now() - startTime,
        }))
}

const handleSuccess = async (upParams) => {
    console.log(`${chalk.green('✓')} Endpoint ${upParams.url} succeeded at time ${Date.now()}, request took ${upParams.totalTime}ms`);

    // check status changes, update metrics, cache current event as prev
    checkStatusChange(upParams)

    updateMetrics(upParams)

    updatePrevEvent(upParams)

    // TODO: The below shows how results could be saved to persistent storage, the same should be could be done for status's.
    // Build success result and save to database
    const result = new models.Result({
        url: upParams.url,
        timestamp: upParams.timestamp,
        statusCode: upParams.statusCode,
        resTime: upParams.totalTime,
    });
    await result.save()
}

const handleFail = async (params, error) => {
    const errParams = {
        status: "down",
        ...params
    }
    checkStatusChange(errParams)

    checkDowntimeAndNotify(errParams)

    updateMetrics(errParams)

    updatePrevEvent(errParams)
}

const checkStatusChange = (event) => {
    const prevResult = lastResult[event.endpointId]
    if (prevResult) {
        // determine if there has been a status change
        if (prevResult.status !== event.status) {
            // page has come back online or gone down
            statusChanges[event.endpointId].push({
                status: event.status,
                timestamp: event.timestamp
            })
        }
    } else {
        // this is the first time the function ran, create first status
        statusChanges[event.endpointId] = [{
            status: event.status,
            timestamp: event.timestamp
        }]
    }

}

const updatePrevEvent = (event) => {
    lastResult[event.endpointId] = {
        status: event.status,
        timestamp: event.timestamp
    }
}

// This function will check to see if the current downtime warrants notification
// TODO: can add more sophisticated checks and move hard-coded 5 mins to config
const checkDowntimeAndNotify = (errParams) => {
    // TODO: This is currently a memory leak, need to store on db or cap array size

    // first determine time since last status change
    const statusArr = statusChanges[errParams.endpointId];

    // skip if first time run
    const previousEvent = statusArr[statusArr.length - 1];
    if (previousEvent) {
        const lastChange = previousEvent.timestamp;

        const timeSinceChange = (Date.now() - lastChange) / 1000; // converted to sec

        console.log(`${chalk.red('✘')} ALERT: ${errParams.url} has been down for ${timeSinceChange}s!`)

        // TODO: Here is where I would check if it's been down for more then ~30 seconds? And then trigger the SMS
    }
}

// updateMetrics will re-compute uptime percent and time since status change
const updateMetrics = (event) => {
    const endpointId = event.endpointId

    // add current timespan to up or downtime total durations

    // skip on first call
    if (lastResult[endpointId]) {
        const timeSinceLastEvent = (Date.now() - lastResult[endpointId].timestamp) / 1000
        if (event.status === "up") {
            timeUp += timeSinceLastEvent
        } else {
            timeDown += timeSinceLastEvent
        }

        // calculate current performance and log to console
        upPercent = (timeUp / (timeUp + timeDown)) * 100
        if (metrics[endpointId]) {
            metrics[endpointId].uptimePercent = upPercent
        } else {
            metrics[endpointId] = {
                uptimePercent: upPercent
            }
        }
        const upPercentNice = upPercent.toFixed(2) + "%";
        console.log(`  Since service began, endpoint has been up for ${timeUp}s and was down for ${timeDown}s, for an uptime percent of ${upPercentNice}`)
    }
}

module.exports = {
    scheduleHealthCheck
};