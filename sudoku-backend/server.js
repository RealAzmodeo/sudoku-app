require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bodyParser = require('body-parser');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const multer = require('multer');

// Configure Gemini
const GEN_AI_KEY = process.env.GEMINI_API_KEY;
if (!GEN_AI_KEY) {
    console.error("❌ CRITICAL ERROR: GEMINI_API_KEY is not set in environment variables!");
}
const genAI = new GoogleGenerativeAI(GEN_AI_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// Configure Multer (Uploads in memory)
const upload = multer({ storage: multer.memoryStorage() });

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' })); 

// --- DATABASE SETUP (PostgreSQL / Neon.tech) ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for Neon.tech
  }
});

const initDb = async () => {
    try {
        const client = await pool.connect();
        console.log('Connected to PostgreSQL database.');
        
        // Create Tables
        await client.query(`
            CREATE TABLE IF NOT EXISTS puzzles (
                id TEXT PRIMARY KEY,
                initialGrid TEXT,
                solvedGrid TEXT,
                difficulty TEXT,
                author TEXT,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS scores (
                id SERIAL PRIMARY KEY,
                puzzleId TEXT,
                playerName TEXT,
                installationId TEXT,
                timeSeconds INTEGER,
                mistakes INTEGER,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        client.release();
    } catch (err) {
        console.error('Error initializing database', err.message);
    }
};

initDb();

// --- API ROUTES ---

// 0. PING
app.get('/api/ping', (req, res) => {
    res.json({ status: "alive", timestamp: new Date() });
});

// List Community Puzzles with User Status
app.get('/api/puzzles', async (req, res) => {
    const { installationId } = req.query;
    
    const query = `
      SELECT 
        p.id, 
        p.difficulty, 
        p.author, 
        p.createdAt, 
        COUNT(s.id) as plays,
        MAX(CASE WHEN s.installationId = $1 THEN 1 ELSE 0 END) as "userCompleted"
      FROM puzzles p
      LEFT JOIN scores s ON p.id = s.puzzleId
      GROUP BY p.id
      ORDER BY p.createdAt DESC 
      LIMIT 50
    `;
    
    try {
        const result = await pool.query(query, [installationId || '']);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// AI SCAN
app.post('/api/scan', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image uploaded' });
        }

        const imagePart = {
            inlineData: {
                data: req.file.buffer.toString("base64"),
                mimeType: req.file.mimetype,
            },
        };

        const prompt = `
            Analyze this image of a Sudoku puzzle.
            Extract the numbers into a 9x9 grid.
            Represent empty cells as 0.
            Return ONLY a valid JSON 2D array (matrix) of integers.
            Example format: [[5,3,0...], [6,0,0...], ...]
            Do not include markdown formatting or explanations.
        `;

        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        const text = response.text();
        
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        
        try {
            const grid = JSON.parse(cleanText);
            res.json({ grid });
        } catch (parseError) {
            console.error("JSON Parse Error. Raw text was:", cleanText);
            res.status(500).json({ error: "AI returned invalid format", raw: cleanText });
        }

    } catch (error) {
        console.error("Gemini Scan Error:", error);
        res.status(500).json({ error: "Gemini Error", message: error.message });
    }
});

// 1. Save a new Puzzle
app.post('/api/puzzle', async (req, res) => {
  const { id, initialGrid, solvedGrid, difficulty, author } = req.body;
  
  if (!id || !initialGrid || !solvedGrid) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const query = `
    INSERT INTO puzzles (id, initialGrid, solvedGrid, difficulty, author) 
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (id) DO NOTHING
  `;
  
  try {
      await pool.query(query, [id, JSON.stringify(initialGrid), JSON.stringify(solvedGrid), difficulty, author || 'Anonymous']);
      res.json({ message: 'Puzzle processed', id });
  } catch (err) {
      res.status(500).json({ error: err.message });
  }
});

// 2. Get a Puzzle by ID
app.get('/api/puzzle/:id', async (req, res) => {
  const { id } = req.params;
  try {
      const result = await pool.query(`SELECT * FROM puzzles WHERE id = $1`, [id]);
      if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Puzzle not found' });
      }
      const row = result.rows[0];
      res.json({
        id: row.id,
        initialGrid: JSON.parse(row.initialgrid),
        solvedGrid: JSON.parse(row.solvedgrid),
        difficulty: row.difficulty
      });
  } catch (err) {
      res.status(500).json({ error: err.message });
  }
});

// 3. Submit a Score
app.post('/api/score', async (req, res) => {
  const { puzzleId, playerName, timeSeconds, mistakes, installationId } = req.body;
  
  const query = `
    INSERT INTO scores (puzzleId, playerName, timeSeconds, mistakes, installationId) 
    VALUES ($1, $2, $3, $4, $5)
  `;
  
  try {
      await pool.query(query, [puzzleId, playerName, timeSeconds, mistakes, installationId || 'unknown']);
      res.json({ message: 'Score saved' });
  } catch (err) {
      res.status(500).json({ error: err.message });
  }
});

// 4. Get Leaderboard
app.get('/api/leaderboard', async (req, res) => {
  const { puzzleId } = req.query;
  
  let query = `SELECT * FROM scores ORDER BY mistakes ASC, timeSeconds ASC LIMIT 50`;
  let params = [];

  if (puzzleId) {
    query = `SELECT * FROM scores WHERE puzzleId = $1 ORDER BY mistakes ASC, timeSeconds ASC LIMIT 50`;
    params = [puzzleId];
  }

  try {
      const result = await pool.query(query, params);
      res.json(result.rows);
  } catch (err) {
      res.status(500).json({ error: err.message });
  }
});

// 5. Update Author Name
app.put('/api/update-author', async (req, res) => {
    const { oldName, newName } = req.body;
    if (!oldName || !newName) return res.status(400).json({ error: "Names required" });

    try {
        await pool.query(`UPDATE puzzles SET author = $1 WHERE author = $2`, [newName, oldName]);
        await pool.query(`UPDATE scores SET playerName = $1 WHERE playerName = $2`, [newName, oldName]);
        res.json({ message: "Author updated" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});