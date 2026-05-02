const { createClient } = require('redis');

// const client = createClient({
//   host: 'localhost',
//   port: 6379
// });

const client = createClient({
  url: process.env.REDIS_URL || `redis://localhost:${process.env.REDIS_PORT || 6379}`
});

client.on('error', (err) => console.log('Redis Client Error:', err));

client.connect().then(() => {
  console.log('Redis connected');
});

module.exports = client;