const dgram = require('dgram'); // For UDP communication
const express = require('express');
const app = express();
const path = require('path');

let latestData = {}; // Store the latest parsed data

// Serve the index.html directly from the root directory
app.get('/', (req, res) => {
  const filePath = path.join(__dirname, 'index.html');
  res.sendFile(filePath);
});

// Endpoint to fetch the latest data
app.get('/latest-data', (req, res) => {
  res.json(latestData);
});

// Set up the UDP server
const udpServer = dgram.createSocket('udp4');

udpServer.on('message', (msg, rinfo) => {
  console.log(`Received data from ${rinfo.address}:${rinfo.port}`);

  try {
    // Parse the raw message to JSON
    const data = JSON.parse(msg.toString());

    // Extract relevant fields from the JSON
    const parsedData = {
      timestamp: data.state.reported.ts || null,
      priority: data.state.reported.pr || null,
      location: data.state.reported.latlng ? data.state.reported.latlng.split(',') : [null, null],
      altitude: data.state.reported.alt || null,
      speed: data.state.reported.sp || null,
      events: {
        event_code: data.state.reported.ev || null,
        input_1: data.state.reported['239'] || null,
        input_2: data.state.reported['240'] || null,
      },
      diagnostics: {
        engine_temp: data.state.reported['66'] || null,
        rpm: data.state.reported['67'] || null,
        odometer: data.state.reported['68'] || null,
      },
    };

    // Save parsed data for frontend
    latestData = parsedData;

    console.log('Parsed AVL Data:', parsedData);
  } catch (error) {
    console.error('Error parsing data:', error);
  }
});

// Start listening for UDP packets
udpServer.bind(5000, () => {
  console.log('UDP Server is listening on port 5000');
});

// Start HTTP server
app.listen(3000, () => {
  console.log('HTTP Server is running on port 3000');
});
