// server.js
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const multer  = require('multer');
const cors = require('cors');
const path = require('path');
const pdfParse = require('pdf-parse');
const fs = require('fs');

const app = express();
app.use(express.json());
app.use(cors());

// -----------------------
// ENVIRONMENT VARIABLES
// -----------------------
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_CSE_ID = process.env.GOOGLE_CSE_ID;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// -----------------------
// Gemini API Rate Limiting & Call
// -----------------------
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

let lastGeminiCallTime = 0;
async function geminiCall(prompt) {
  const minInterval = 30000; // 30 seconds between calls
  const now = Date.now();
  const timeSinceLast = now - lastGeminiCallTime;
  if (timeSinceLast < minInterval) {
    await new Promise(resolve => setTimeout(resolve, minInterval - timeSinceLast));
  }
  lastGeminiCallTime = Date.now();

  // Use the correct hostname for SSL
  const url = 'https://generativeai.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent';
  let retries = 3;
  let backoff = 30000; // initial backoff in ms
  while (true) {
    try {
      const response = await axios.post(url, { prompt }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GEMINI_API_KEY}`
        }
      });
      return response.data.text;
    } catch (error) {
      if (error.response && error.response.status === 429 && retries > 0) {
        console.log(`Gemini API rate limit hit. Retrying in ${backoff/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, backoff));
        retries--;
        backoff *= 2;
      } else {
        throw error;
      }
    }
  }
}

// -----------------------
// Multer configuration for PDF uploads
// -----------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Ensure this folder exists
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// -----------------------
// In-memory Data Storage for MVP (replace with DB in production)
// -----------------------
const dashboardData = {
  chats: [
    { id: 1, from: "Alice", message: "Project kickoff meeting at 10am", timestamp: new Date() },
    { id: 2, from: "Bob", message: "Client feedback received", timestamp: new Date() }
  ],
  progressReports: [] // will store details of uploaded reports
};

// -----------------------
// Helper: Google Custom Search
// -----------------------
async function googleSearch(query, numResults = 5) {
  const url = 'https://www.googleapis.com/customsearch/v1';
  try {
    const response = await axios.get(url, {
      params: {
        q: query,
        key: GOOGLE_API_KEY,
        cx: GOOGLE_CSE_ID,
        num: numResults
      }
    });
    return response.data.items || [];
  } catch (error) {
    console.error("Error in googleSearch:", error.message);
    return [];
  }
}

// -----------------------
// Dashboard Endpoint (CEO's Overview)
// -----------------------
app.get('/api/dashboard', (req, res) => {
  res.json(dashboardData);
});

// -----------------------
// Endpoint: Explain Uploaded Report (PDF)
// -----------------------
// This endpoint extracts text from an uploaded PDF and uses Gemini to generate a detailed explanation.
app.post('/api/explain-report', upload.single('report'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded." });
  try {
    const dataBuffer = req.file.buffer || require('fs').readFileSync(req.file.path);
    console.log(req.file.path);
    const pdfData = await pdfParse(dataBuffer);
    const pdfText = pdfData.text;
    const prompt = `
You are an expert analyst. The following is a progress report provided as a PDF. Read the text below and generate a detailed, structured summary with clear sections, highlighting key points, trends, and any recommendations.

Report Content:
${pdfText}

Provide the summary in a professional and formatted style.
    `;
    const explanation = await geminiCall(prompt);
    // For demo, also store the file details.
    dashboardData.progressReports.push({
      filename: req.file.filename,
      originalname: req.file.originalname,
      uploadedAt: new Date()
    });
    res.json({ explanation });
  } catch (error) {
    console.log(req.file.path);
    res.status(500).json({ error: error.message });
  }
});

// -----------------------
// Endpoint: Market Analysis with Internet & PDF Data
// -----------------------
// The CEO specifies what market analysis they want. Optionally, they can upload a PDF with market data.
// The endpoint uses Google search to gather additional data and extracts PDF text if available.
app.post('/api/market-analysis', upload.single('marketPdf'), async (req, res) => {
  const { analysisType, description } = req.body;
  if (!analysisType || !description) {
    return res.status(400).json({ error: "analysisType and description are required" });
  }
  
  // Build a search query based on analysisType and description.
  const searchQuery = `${analysisType} ${description} market trends analysis`;
  const searchResults = await googleSearch(searchQuery, 3);
  let searchText = '';
  searchResults.forEach(result => {
    searchText += `Title: ${result.title}\nSnippet: ${result.snippet}\n\n`;
  });
  
  // If a PDF is provided, extract its text.
  let pdfText = '';
  if (req.file) {
    try {
      const dataBuffer = req.file.buffer || require('fs').readFileSync(req.file.path);
      const pdfData = await pdfParse(dataBuffer);
      pdfText = pdfData.text;
    } catch (err) {
      console.log(req.file.path);
      console.error("PDF extraction error:", err.message);
    }
  }
  
  // Compose the prompt for Gemini
  const prompt = `
You are an expert market analyst. The CEO has requested a detailed market analysis focusing on "${analysisType}". 
Description of analysis intent: ${description}

Additional Internet Search Data:
${searchText}

${pdfText ? "Extracted PDF Data:\n" + pdfText + "\n" : ""}

Based on the above information, generate a comprehensive market analysis report with:
- An executive summary.
- Detailed trends and insights.
- Actionable recommendations.

Format the output in a clear and structured manner.
  `;
  try {
    const analysis = await geminiCall(prompt);
    res.json({ analysis });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// -----------------------
// Other Endpoints for Additional Tasks (Email summarization, Content Generation, etc.)
// -----------------------

// Email Summarization
app.post('/api/email-summarize', async (req, res) => {
  const { emailContent } = req.body;
  if (!emailContent) return res.status(400).json({ error: "emailContent is required" });
  const prompt = `
You are an expert communications assistant. Summarize the following email into key points and draft a professional reply if needed:

Email Content:
${emailContent}

Provide a concise summary and suggestions for next steps.
  `;
  try {
    const summary = await geminiCall(prompt);
    res.json({ summary });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Report Generation from Financial and Performance Data
app.post('/api/generate-report', async (req, res) => {
  const { financialData, performanceData } = req.body;
  if (!financialData || !performanceData) {
    return res.status(400).json({ error: "financialData and performanceData are required" });
  }
  const prompt = `
You are a business analyst. Using the provided financial and performance data, generate a comprehensive report that includes:
1. An executive summary.
2. Detailed analysis.
3. Actionable recommendations.

Financial Data:
${financialData}

Performance Data:
${performanceData}
  `;
  try {
    const report = await geminiCall(prompt);
    res.json({ report });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// (Other endpoints such as risk analysis, travel & expense, task automation, content generation,
// social media & PR can be added in a similar manner.)

// -----------------------
// Endpoint: Project Status (Mock Data for MVP)
// -----------------------
app.get('/api/project-status', (req, res) => {
  const status = {
    projectName: "CEO Dashboard MVP",
    overallStatus: "On Track",
    latestChats: dashboardData.chats,
    reportsCount: dashboardData.progressReports.length,
    lastUpdated: new Date()
  };
  res.json(status);
});

// -----------------------
// Start the Server
// -----------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
