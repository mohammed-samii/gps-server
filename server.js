const dgram = require('dgram'); // For UDP communication
const express = require('express');
const cors = require('cors'); // Import CORS
const path = require('path');

const app = express();
let latestData = {}; // Store the latest parsed data

// Enable CORS for your Vercel domain
app.use(cors({
  origin: 'https://gps-server-zeta.vercel.app',
}));

// Serve the frontend (if needed locally)
app.use(express.static(path.join(__dirname)));

// Endpoint to fetch the latest AVL data
app.get('/latest-data', (req, res) => {
  res.json(latestData);
});

// UDP server setup
const udpServer = dgram.createSocket('udp4');

udpServer.on('message', (msg, rinfo) => {
  console.log(`Received data from ${rinfo.address}:${rinfo.port}`);

  try {
    // Parse the incoming message as JSON
    const data = JSON.parse(msg.toString());

    // Extract and normalize fields for frontend consumption
    latestData = {
      timestamp: data.timestamp || Date.now(),
      priority: data.priority || 0,
      location: data.location || [null, null],
      altitude: data.altitude || 0,
      speed: data.speed || 0,
    };

    console.log('Parsed Data:', latestData);

    // Send a response back to the UDP client
    const responseMessage = Buffer.from('Data received and processed successfully.');
    udpServer.send(responseMessage, rinfo.port, rinfo.address, (err) => {
      if (err) {
        console.error('Error sending response:', err);
      } else {
        console.log('Response sent to client:', rinfo.address, rinfo.port);
      }
    });
  } catch (error) {
    console.error('Error parsing UDP message:', error);

    // Send an error response back to the client
    const errorMessage = Buffer.from('Error processing your data.');
    udpServer.send(errorMessage, rinfo.port, rinfo.address, (err) => {
      if (err) {
        console.error('Error sending error response:', err);
      } else {
        console.log('Error response sent to client:', rinfo.address, rinfo.port);
      }
    });
  }
});

// Bind the UDP server to a port
udpServer.bind(5000, () => {
  console.log('UDP Server listening on port 5000');
});

// Start the HTTP server
app.listen(3000, () => {
  console.log('HTTP Server running on port 3000');
});
