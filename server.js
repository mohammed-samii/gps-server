const express = require('express');
const path = require('path');
const dgram = require('dgram'); // For UDP communication
const app = express();

// Configure to parse incoming JSON data
app.use(express.json());

const fs = require('fs');

// Serve the index.html directly from the root directory
app.get('/', (req, res) => {
    const filePath = path.join(__dirname, 'index.html');
    res.sendFile(filePath);
});

// Store the latest AVL data
let latestData = {};

// Set up the UDP server to listen for AVL data from the FMC920
const udpServer = dgram.createSocket('udp4');  // Create UDP server for IPv4

// Listening on port 5000 (the default port for FMC920)
udpServer.on('message', (msg, rinfo) => {
    console.log(`Received data from ${rinfo.address}:${rinfo.port}`);
    
    // Teltonika protocol starts with 4 bytes for preamble/length
    const dataLength = msg.readUInt32BE(0);
    
    // Skip first 4 bytes (preamble) and last 4 bytes (CRC)
    const avlData = msg.slice(4, msg.length - 4);
    
    try {
        const parsed = parseTeltonikaData(avlData);
        latestData = parsed;
        
        // Send acknowledgment (4 bytes with number of data received)
        const ackBuffer = Buffer.alloc(4);
        ackBuffer.writeUInt32BE(1); // Acknowledge one data packet
        udpServer.send(ackBuffer, rinfo.port, rinfo.address);
        
        console.log('Parsed AVL Data:', parsed);
    } catch (error) {
        console.error('Failed to parse AVL data:', error);
    }
});

function parseTeltonikaData(buffer) {
    // This is a basic example - actual implementation depends on codec version
    let offset = 0;
    
    const codecId = buffer.readUInt8(offset);
    offset += 1;
    
    const recordsCount = buffer.readUInt8(offset);
    offset += 1;
    
    // Example parsing for one record (simplified)
    const timestamp = buffer.readBigUInt64BE(offset);
    offset += 8;
    
    const priority = buffer.readUInt8(offset);
    offset += 1;
    
    const longitude = buffer.readInt32BE(offset) / 10000000;
    offset += 4;
    
    const latitude = buffer.readInt32BE(offset) / 10000000;
    offset += 4;
    
    return {
        timestamp: Number(timestamp),
        longitude,
        latitude,
        priority
        // Add other fields as needed
    };
}

// Start the UDP server to listen on port 5000
udpServer.bind(5000, () => {
    console.log('UDP Server listening on port 5000');
});

// Serve the latest AVL data to the frontend
app.get('/latest-data', (req, res) => {
    res.json(latestData);
});

// Start the HTTP server to serve the frontend
app.listen(3000, () => {
    console.log('HTTP Server is running on port 3000');
});
