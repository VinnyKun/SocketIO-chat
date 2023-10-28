
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

const CHAT_EVENT = 'chat message';
const INIT_USERNAME_ROOM_EVENT = 'init username room';
let lastUserId = 0;

function getUsernameFromClients(sockets) {
    let usernameListString = '';
    sockets.forEach((socket, index) => {
        lastIndex = sockets.length - 1;
        if (socket.data && socket.data.username) {
            usernameListString += `${socket.data.username}`;
            if (lastIndex !== index) {
                usernameListString += ', '; // prevent comma for last index
            }
        }
    })
    return usernameListString;
}

app.get('/', (req, res) => {
    res.sendFile(__dirname +'/index.html');
});

io.on('connection', async (socket) => {
    lastUserId += 1
    const userId = lastUserId
    const welcomeMessage = `Welcome user${userId}! Please input an username and chat room`
    const denialMessage = `User${userId}! Please input an username and chat room. You are currently not part of any chat rooms`
    const socketsAtConnect = await io.fetchSockets();
    const currentUser = {
        userId,
        username: undefined,
        roomJoined: undefined,
        roomLeft: undefined
    }

    socket.emit(CHAT_EVENT, welcomeMessage)
    console.log(CHAT_EVENT, `user${userId} has joined the chat (${socketsAtConnect.length} user(s) connected)`)

    socket.on('disconnect', async () => {
        console.log(`User id: ${userId}  disconnected`);
        // abstract this logic to prevent copy paste
        const previousRoom = currentUser.roomJoined;
        socket.leave(previousRoom)
        const activeSocketsInRoom = await io.in(previousRoom).fetchSockets()
        const usernamesInRoom = getUsernameFromClients(activeSocketsInRoom);
        currentUser.roomLeft = previousRoom;
        io.to(previousRoom).emit(CHAT_EVENT, `[${previousRoom}] ${currentUser.username} has left the room! Active users in chat are: [${usernamesInRoom}]`);
    })

    socket.on(INIT_USERNAME_ROOM_EVENT, async (msg) => {
        const { username, room } = msg
        let roomLeftMessage = '';
        // corner case what if username and room input is the same
        if (currentUser.roomJoined) {
            const previousRoom = currentUser.roomJoined;
            socket.leave(previousRoom)
            const activeSocketsInRoom = await io.in(previousRoom).fetchSockets()
            const usernamesInRoom = getUsernameFromClients(activeSocketsInRoom);
            currentUser.roomLeft = previousRoom;
            io.to(previousRoom).emit(CHAT_EVENT, `[${previousRoom}] ${currentUser.username} has left the room! Active users in chat are: [${usernamesInRoom}]`);
            roomLeftMessage = ` You have left room:${previousRoom}`;
        }

        socket.join(room);
        currentUser.username = username;
        currentUser.roomJoined = room;
        socket.data = currentUser;
        socket.emit(CHAT_EVENT, `Welcome ${username}! You have now joined room: ${room}.${roomLeftMessage}`)
        const activeSocketsInRoom = await io.in(room).fetchSockets()
        const usernamesInRoom = getUsernameFromClients(activeSocketsInRoom);
        io.to(room).emit(CHAT_EVENT, `[${room}] ${username} has joined the room! Active users in chat are: [${usernamesInRoom}]`);
    })

    socket.on(CHAT_EVENT, (msg) => {
        if (currentUser.username && currentUser.roomJoined) {
            const room = currentUser.roomJoined;
            io.to(room).emit(CHAT_EVENT, `[${room}] ${currentUser.username}: ${msg}`);
        } else {
            socket.emit(CHAT_EVENT, denialMessage)
        }
        
    })
});

server.listen(3000, () => {
    console.log('listening on *:3000');
});