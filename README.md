# health-checker

This project is a service that will poll url's and perform system health checks on them for a provided schedule.

## Requirements

- [Node](https://nodejs.org/en/)
- [Mongo](https://docs.mongodb.com/manual/installation/)

NOTE: you will need a running instance of Mongo, update your .env file with connection options if you have changed mongo's default settings

## Running the application

Now that you have Node installed and  Mongo running, the next step is to install the service dependancies, to do this, run the following from within project root directory:

```bash
npm install
```

Next, you need to configure the app with environmental variables. To do this rename the `.env.example` file to `.env` and fill in the required fields (You can leave twilio blank if you don't want to make use of the notification services)

Finally, you can start the running service by simply running:

```bash
npm start
```
