// Server-side code using Node.js, Express, and Socket.IO
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const users = {};

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'sender.html'));
});

app.get('/receiver', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'receiver.html'));
});

io.on('connection', (socket) => {
  console.log('A user connected');

  // Handle user creation
  socket.on('createUser', (username) => {
    users[socket.id] = username;
    io.emit('userList', Object.values(users));
  });

  // Handle initiateCall
  socket.on('initiateCall', (data) => {
    const senderSocket = Object.keys(users).find(key => users[key] === data.senderUsername);
    const receiverSocket = Object.keys(users).find(key => users[key] === data.receiverUsername);

    if (senderSocket && receiverSocket) {
      // Notify the receiver about the incoming call
      io.to(receiverSocket).emit('incomingCall', {
        senderUsername: data.senderUsername,
        offer: data.offer,
      });
    } else {
      console.log('User not found.');
    }
  });

  // Handle offer from sender
  socket.on('offer', (data) => {
    const receiverSocket = Object.keys(users).find(key => users[key] === data.receiverUsername);

    if (receiverSocket) {
      // Notify the receiver about the offer
      io.to(receiverSocket).emit('offer', {
        senderUsername: data.senderUsername,
        receiverUsername: data.receiverUsername,
        offer: data.offer,
      });
    } else {
      console.log('Receiver not found.');
    }
  });

  // Handle answer from receiver
  socket.on('answer', (data) => {
    const senderSocket = Object.keys(users).find(key => users[key] === data.senderUsername);

    if (senderSocket) {
      // Notify the sender about the answer
      io.to(senderSocket).emit('callAccepted', {
        receiverUsername: data.receiverUsername,
        answer: data.answer,
      });
    } else {
      console.log('Sender not found.');
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('A user disconnected');
    delete users[socket.id];
    io.emit('userList', Object.values(users));
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
