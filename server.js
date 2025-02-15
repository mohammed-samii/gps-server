const dgram = require('dgram'); // For UDP communication
const express = require('express');
const cors = require('cors'); // Import CORS
const path = require('path');

const app = express();
let latestData = {}; // Store the latest parsed data

// Enable CORS for any origin
app.use(cors());

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
    console.log(msg.toString());
    // Parse the incoming message
    const rawData = JSON.parse(msg.toString());

    // Extract `state.reported` if it exists
    const reported = rawData?.state?.reported;

    if (reported) {
      // Extract and normalize fields
      latestData = {
        timestamp: reported.ts,
        priority: reported.pr || 0,
        location: reported.latlng
          ? reported.latlng.split(',').map(coord => parseFloat(coord.trim()))
          : [0, 0], // Default to [0, 0] if latlng is invalid
        altitude: reported.alt || 0,
        speed: reported.sp || 0,
        angle: reported.ang || 0,
        satellites: reported.sat || 0,
        event: reported.evt || null, // Event ID if applicable
        additionalParams: {
          event239: reported["239"] || 0,
          event240: reported["240"] || 0,
          parameter21: reported["21"] || null,
          parameter200: reported["200"] || null,
        },
      };

      console.log('Parsed Data:', latestData);

      // Send acknowledgment back to the client
      const responseMessage = Buffer.from('Data received and processed successfully.');
      udpServer.send(responseMessage, rinfo.port, rinfo.address, (err) => {
        if (err) {
          console.error('Error sending response:', err);
        } else {
          console.log('Response sent to client:', rinfo.address, rinfo.port);
        }
      });
    } else {
      throw new Error('Invalid data structure: Missing state.reported');
    }
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
