//initialize cache
const REDIS_PORT = process.env.PORT || 6379;
const redis = require('redis');
const client = redis.createClient(REDIS_PORT);
client.on('error', err => console.error(err));

module.exports = client;