const redis = require('./redis');

// Use it anywhere
async function urls() {
    await redis.set('short_url:abc', 'https://www.example.com');
    await redis.set('short_url:xyz', 'https://www.google.com');
    await redis.setEx('short_url:temp', 1, 'https://www.temporary.com');

    const url_val = await redis.get('short_url:abc');
    const url_val2 = await redis.get('short_url:xyz');
    let url_val3 = await redis.get('short_url:temp');
    console.log(url_val);
    console.log(url_val2);
    console.log(url_val3);
    await redis.del('short_url:xyz')
    url_val3 = await redis.get('short_url:temp');
    console.log('after del',url_val3)

}
urls()

