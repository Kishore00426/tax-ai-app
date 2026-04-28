const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { compareRegimes } = require('../utils/taxCalculator');

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

router.post('/', async (req, res) => {
  const { message } = req.body;

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: "Gemini API key is not configured." });
  }

  try {
    // 1. Extract Info using Gemini
    const extractionPrompt = `
      Extract tax-related information from this Indian user message: "${message}"
      Return ONLY a JSON object with these keys: 
      - income (number, default 0, assume yearly if not specified)
      - deductions (number, default 0, check for mentions of 80C, 80D, HRA etc)
      - fy (string, '2024-25' or '2025-26', default '2025-26')
      - queryType (string, 'calculate' or 'general')

      Example: "I earn 15 LPA and have 1.5L in 80C"
      Output: {"income": 1500000, "deductions": 150000, "fy": "2025-26", "queryType": "calculate"}
    `;

    const result = await model.generateContent(extractionPrompt);
    const responseText = result.response.text();
    
    // Clean JSON response (Gemini sometimes adds markdown blocks)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    let extraction = { queryType: 'general' };
    
    if (jsonMatch) {
      try {
        extraction = JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.warn("Failed to parse Gemini JSON:", e);
      }
    }

    let aiResponse = "";
    let comparison = null;

    if (extraction.queryType === 'calculate' && extraction.income > 0) {
      // 2. Perform Calculation using local utility
      comparison = compareRegimes(extraction.income, extraction.deductions, extraction.fy);
      
      // 3. Generate Natural Language Analysis using Gemini
      const analysisPrompt = `
        You are an Indian Tax Expert. Analyze these results for the user:
        Financial Year: ${comparison.fy}
        Total Income: ₹${comparison.income.toLocaleString('en-IN')}
        Deductions: ₹${extraction.deductions.toLocaleString('en-IN')}
        
        New Regime Tax: ₹${comparison.newRegime.totalTax.toLocaleString('en-IN')}
        Old Regime Tax: ₹${comparison.oldRegime.totalTax.toLocaleString('en-IN')}
        Recommended: ${comparison.better} regime
        Total Savings: ₹${comparison.savings.toLocaleString('en-IN')}

        Provide a very concise, professional analysis. Explain why the ${comparison.better} regime is better. 
        Mention any common deductions they might be missing if they are using the Old regime.
        Be friendly and helpful.
      `;

      const analysisResult = await model.generateContent(analysisPrompt);
      aiResponse = analysisResult.response.text();
    } else {
      // General Tax Query
      const chatPrompt = `You are an Indian Tax Expert assistant. Briefly and accurately answer this user query: "${message}"`;
      const chatResult = await model.generateContent(chatPrompt);
      aiResponse = chatResult.response.text();
    }

    res.json({
      reply: aiResponse,
      comparison: comparison,
      extraction: extraction
    });

  } catch (error) {
    console.error('Error in chat route:', error);
    res.status(500).json({ error: 'Failed to process request', details: error.message });
  }
});

module.exports = router;
