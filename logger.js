const winston = require('winston');
const path = require('path');
const __base = path.resolve(__dirname, '..');
require('winston-daily-rotate-file');


const logger = winston.createLogger({
    transports: [
        new winston.transports.DailyRotateFile({
            level: 'info',
            filename: `${__base}/logs/info`,
            json: true,
            colorize: true,
            datePattern: 'DD-MM-YYYY',
            format: winston.format.combine(winston.format.timestamp(), winston.format.json())
        }),
        new winston.transports.DailyRotateFile({
            level: 'error',
            filename: `${__base}/logs/error`,
            json: true,
            colorize: true,
            datePattern: 'DD-MM-YYYY',
            format: winston.format.combine(winston.format.timestamp(), winston.format.json())
        })
    ]
});


module.exports = logger;