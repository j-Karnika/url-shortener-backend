// Import required modules:
// - express → web server
// - pool → PostgreSQL connection
// - redis → Redis client
// - encodeBase62 → converts DB id to short code
// - dotenv → environment variables
const express = require('express');
const pool = require('./db');
const redis = require('./redis');
const { encodeBase62 } = require('./utils');
const cors = require('cors');
const { nanoid } = require('nanoid');
require('dotenv').config();


// Create express app instance
const app = express()
app.use(cors());

// Middleware to parse JSON request body
app.use(express.json())

const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
// ===============================

// Below is the Random id approch.

// app.post('/shorten', async (req, res) => {
//   try {
//     const { original_url } = req.body;

//     if (!original_url) {
//       return res.status(400).json({ error: 'original_url is required' });
//     }

//     // Generate unique random code
//     let short_code;
//     let isUnique = false;

//     while (!isUnique) {
//       short_code = Math.random().toString(36).substring(2, 8);
//       const existing = await pool.query(
//         'SELECT id FROM short_urls WHERE short_code = $1',
//         [short_code]
//       );
//       if (existing.rows.length === 0) {
//         isUnique = true;
//       }
//     }

//     // Insert
//     const result = await pool.query(
//       'INSERT INTO short_urls (original_url, short_code) VALUES ($1, $2) RETURNING id',
//       [original_url, short_code]
//     );

//     // Cache in Redis
//     await redis.setEx(`short_url:${short_code}`, 3600, original_url);

//     res.json({
//       original_url,
//       short_code,
//       short_url: `http://localhost:3000/${short_code}`
//     });

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: 'Failed to shorten URL' });
//   }
// });

// // GET /:code - same as before
// app.get('/:code', async (req, res) => {
//   try {
//     const { code } = req.params;

//     let original_url = await redis.get(`short_url:${code}`);

//     if (!original_url) {
//       const result = await pool.query(
//         'SELECT original_url FROM short_urls WHERE short_code = $1',
//         [code]
//       );

//       if (result.rows.length === 0) {
//         return res.status(404).json({ error: 'Short URL not found' });
//       }

//       original_url = result.rows[0].original_url;
//       await redis.setEx(`short_url:${code}`, 3600, original_url);
//     }

//     res.redirect(original_url);

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: 'Failed to retrieve URL' });
//   }
// });
// ===============================
// Above is the Random id approch.
// ==============================

// ===============================
// Below is the Encode-Decode Approach.

// app.post('/shorten', async (req, res) => {
//   try {
//     const { original_url } = req.body;

//     if (!original_url) {
//       return res.status(400).json({ error: 'original_url is required' });
//     }

//     // Step 1: Insert WITHOUT generating short_code yet (use default or placeholder)
//     const insertResult = await pool.query(
//       'INSERT INTO short_urls (original_url, short_code) VALUES ($1, $2) RETURNING id',
//       [original_url, null]
//     );

//     const id = insertResult.rows[0].id;

//     // Step 2: Encode the ID to get short_code
//     const short_code = encodeBase62(id);

//     // Step 3: Update the record with the actual short_code
//     await pool.query(
//       'UPDATE short_urls SET short_code = $1 WHERE id = $2',
//       [short_code, id]
//     );

//     // Step 4: Cache in Redis
//     await redis.setEx(`short_url:${short_code}`, 3600, original_url);

//     res.json({
//       original_url,
//       short_code,
//       short_url: `${BASE_URL}/${short_code}`
//     });

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: 'Failed to shorten URL' });
//   }
// });

// Below is the shorten code generated from claude.

 // npm install nanoid

app.post('/shorten', async (req, res) => {
  try {
    const { original_url } = req.body;
    if (!original_url) {
      return res.status(400).json({ error: 'original_url is required' });
    }

    // Step 1: check if this URL was already shortened — reuse existing code
    const existing = await pool.query(
      'SELECT short_code FROM short_urls WHERE original_url = $1',
      [original_url]
    );
    if (existing.rows.length > 0) {
      const short_code = existing.rows[0].short_code;
      await redis.setEx(`short_url:${short_code}`, 3600, original_url);
      return res.json({
        original_url,
        short_code,
        short_url: `${BASE_URL}/${short_code}`
      });
    }

    // Step 2: generate a random, non-sequential code (not derived from id)
    let short_code;
    let inserted = false;

    while (!inserted) {
      short_code = nanoid(7); // random, unguessable
      try {
        await pool.query(
          'INSERT INTO short_urls (original_url, short_code) VALUES ($1, $2)',
          [original_url, short_code]
        );
        inserted = true;
      } catch (err) {
        if (err.code === '23505') {
          // unique_violation — either short_code collision (retry) or
          // original_url collision from a concurrent request (fetch it)
          const retry = await pool.query(
            'SELECT short_code FROM short_urls WHERE original_url = $1',
            [original_url]
          );
          if (retry.rows.length > 0) {
            short_code = retry.rows[0].short_code;
            inserted = true;
          }
          // else: short_code collision, loop retries with a new random code
        } else {
          throw err;
        }
      }
    }

    await redis.setEx(`short_url:${short_code}`, 3600, original_url);

    res.json({
      original_url,
      short_code,
      short_url: `${BASE_URL}/${short_code}`
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to shorten URL' });
  }
});


// GET /:code - same as before
app.get('/:code', async (req, res) => {
  try {
    const { code } = req.params;

    let original_url = await redis.get(`short_url:${code}`);
    let short_url_id = null;
    // if (!original_url) {
    const result = await pool.query(
      'SELECT id,original_url FROM short_urls WHERE short_code = $1',
      [code]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Short URL not found' });
    }

    original_url = result.rows[0].original_url;
    short_url_id = result.rows[0].id;
    await redis.setEx(`short_url:${code}`, 3600, original_url);
    // Storing short_url_id in Redis for analytics.
    await redis.setEx(`short_url_id:${code}`, 3600, short_url_id.toString());
    // }

    // log click analytics anonymousely (without waiting for it to complete).
    // Log the click
    try {
      await pool.query(
        'INSERT INTO clicks (short_url_id, user_agent, referrer) VALUES ($1, $2, $3)',
        [short_url_id, req.get('user-agent'), req.get('referer')]
      );
      console.log(`Logged click for short_url_id: ${short_url_id}`);
    } catch (err) {
      console.error('Click logging error:', err);
    }


    res.redirect(original_url);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retrieve URL' });
  }
});

// Get analytics:
app.get('/analytics/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const results = await pool.query(
      `select id, original_url, created_at from short_urls where short_code = $1`, [code]
    );

    if (results.rows.length === 0) {
      return res.status(404).json({ error: "Url Not Found." })
    }

    const urlRecord = results.rows[0];


    // get click analytics.
    const clickResult = await pool.query(
      `select count(*) as total_clicks from clicks where short_url_id = $1`, [urlRecord.id]
    )

    const totalClicks = parseInt(clickResult.rows[0].total_clicks);

    // Get last 10 Analytics.
    const recentAnalytics = await pool.query(
      `select timestamp, user_agent, referrer from clicks where short_url_id = $1 
      order by timestamp desc limit 10`, [urlRecord.id]
    )

    res.json({
      short_code: code,
      created_at: urlRecord.created_at,
      original_url: urlRecord.original_url,
      total_clicks: totalClicks,
      recent_clicks: recentAnalytics.rows
    })


  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get analytics" });
  }
})



// ===============================
// Start Server
// ===============================
// - Use PORT from environment or default 3000
// - Start listening for incoming requests
// - Log success message
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})