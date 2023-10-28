
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

const CHAT_EVENT = 'chat message';
let lastUserId = 0;

app.get('/', (req, res) => {
    res.sendFile(__dirname +'/index.html');
});

io.on('connection', async (socket) => {
    lastUserId += 1
    const userId = lastUserId
    const welcomeMessage = `Welcome user${userId}`
    const socketsAtConnect = await io.fetchSockets();

    console.log(`user with id: ${userId} connected`);
    socket.emit(CHAT_EVENT, welcomeMessage)
    io.emit(CHAT_EVENT, `user${userId} has joined the chat (${socketsAtConnect.length} user(s) connected)`)

    socket.on('disconnect', async () => {
        const socketsAtDisconnect = await io.fetchSockets();
        console.log(`User id: ${userId}  disconnected`);
        io.emit(CHAT_EVENT, `user${userId} has left the chat (${socketsAtDisconnect.length} user(s) connected)`)
    })
    socket.on(CHAT_EVENT, (msg) => {
        io.emit(CHAT_EVENT, `user${userId}: ${msg}`);
    })
});

server.listen(3000, () => {
    console.log('listening on *:3000');
});