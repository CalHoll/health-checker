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
    /* 
     * TODO: url validator disabled because it was failing for url's with ports
     */
    // Verify that the endpoint url is valid and that the format is correct.
    // if (!is_url(endpoint.url)) {
    //     console.error(`Endpoint: ${endpoint.url} was not a valid url`);
    //     return
    // }

    // TODO: this check should check if the format is correct, not just that it exists.
    if (!endpoint.schedule) {
        console.error(`No schedule provided for endpoint: ${endpoint.url}`);
        return
    }

    cron.schedule(endpoint.schedule, () => {
        // Make call to endpoint
        // TODO: build in functionality to specify http protocol
        makeGetRequest(endpoint)

        // Build Result

        // Log to console / write to result database

        // TODO: Check to see if result meets warning or fail conditions

        // if fail condition send error alert notification

        // if warning condition send warning
    });
}

const makeGetRequest = (endpoint) => {
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
                handleSuccess(resultParams)
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

const handleSuccess = async (params) => {
    console.log(`${chalk.green('✓')} Endpoint ${params.url} succeeded at time ${Date.now()}, request took ${params.totalTime}ms`);

    // check to see if status has changed for this endpoint
    checkStatusChange({
        endpointId: params.endpointId,
        timestamp: params.timestamp,
        status: "up"
    })

    updateMetrics({
        status: "up",
        ...params
    })

    // Build success result and save to database
    const result = new models.Result({
        url: params.url,
        timestamp: params.timestamp,
        statusCode: params.statusCode,
        resTime: params.totalTime,
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
    updatePrevEvent(event)
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
    const lastChange = statusArr[statusArr.length - 1].timestamp;
    const timeSinceChange = Date.now() - lastChange;

    console.log(`${chalk.red('✘')} ALERT: ${errParams.url} has been down for ${timeSinceChange}s!`)
}

// updateMetrics will re-compute uptime percent and time since status change
const updateMetrics = (event) => {
    const endpointId = event.endpointId

    // add current timespan to up or downtime total durations
    const timeSinceLastEvent = Date.now() - lastResult[endpointId].timestamp
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

module.exports = {
    scheduleHealthCheck
};