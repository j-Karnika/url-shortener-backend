// const { createClient } = require('redis');
// require('dotenv').config();
// // const client = createClient({
// //   host: 'localhost',
// //   port: 6379
// // });

// const client = createClient({
//   url: process.env.REDIS_URL || `redis://localhost:${process.env.REDIS_PORT || 6379}`
// });

// client.on('error', (err) => console.log('Redis Client Error:', err));

// client.connect().then(() => {
//   console.log('Redis connected');
// });

// module.exports = client;

const { createClient } = require('redis');
require('dotenv').config();

const client = createClient({
  url: process.env.REDIS_URL || `redis://localhost:${process.env.REDIS_PORT || 6379}`,
  socket: {
    keepAlive: 5000,           // send TCP keep-alive pings every 5s to prevent idle disconnects
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        console.error('Redis: too many reconnect attempts, giving up');
        return new Error('Redis reconnect failed');
      }
      return Math.min(retries * 100, 3000); // exponential-ish backoff, capped at 3s
    }
  }
});

client.on('error', (err) => console.log('Redis Client Error:', err));
client.on('reconnecting', () => console.log('Redis reconnecting...'));
client.on('ready', () => console.log('Redis ready'));

client.connect().then(() => {
  console.log('Redis connected');
});

module.exports = client;