const express = require('express');
const axios = require('axios');
const fs = require('fs'); // <-- Import File System module
const path = require('path'); // <-- Import Path module
const app = express();
const PORT = 3000;
const PYTHON_URL = 'http://localhost:5001';

// Serve static files from the 'public' folder (for the UI)
app.use(express.static('public')); 
app.use(express.json());

// Helper function to log to CSV
function logToCSV(data) {
    const csvFilePath = path.join(__dirname, 'calculations.csv');
    const timestamp = new Date().toISOString();
    // Format: Timestamp, Num1, Num2, Operation, Result
    const csvLine = `${timestamp},${data.input.num1},${data.input.num2},${data.input.operation},${data.result}\n`;
    
    // Check if file exists to write headers first
    if (!fs.existsSync(csvFilePath)) {
        fs.writeFileSync(csvFilePath, 'Timestamp,Num1,Num2,Operation,Result\n');
    }
    
    // Append the new calculation
    fs.appendFileSync(csvFilePath, csvLine);
    console.log('Logged to CSV:', csvLine.trim());
}

// Route 1: Simple test endpoint
app.get('/hello', (req, res) => {
    res.json({ message: 'Hello from Node.js Gateway!' });
});

// Route 2: Main integration endpoint
app.post('/api/calculate', async (req, res) => {
    console.log('Node.js received:', req.body);

    try {
        // Forward to Python
        const pythonResponse = await axios.post(`${PYTHON_URL}/calculate`, req.body);
        
        // Log to CSV (only if calculation was successful and not an error string)
        if (typeof pythonResponse.data.result === 'number') {
            logToCSV(pythonResponse.data);
        }

        // Enrich and return response
        res.json({
            gateway_message: 'Node.js successfully aggregated the data',
            python_result: pythonResponse.data
        });
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({
            error: 'Failed to reach Python service. Is it running on port 5001?'
        });
    }
});

// Route 3: System status check
app.get('/api/status', async (req, res) => {
    try {
        const ping = await axios.get(`${PYTHON_URL}/ping`);
        res.json({
            gateway: 'Node.js is running',
            python: ping.data
        });
    } catch (error) {
        res.status(500).json({
            gateway: 'Node.js is running',
            python: 'Python is NOT reachable'
        });
    }
});

app.listen(PORT, () => {
    console.log(`Node.js Gateway: http://localhost:${PORT}`);
    console.log(`Python URL: ${PYTHON_URL}`);
});