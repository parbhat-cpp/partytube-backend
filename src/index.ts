import express, { Express } from "express";
import { config } from 'dotenv';
import { Server } from "socket.io";
import { Users } from "./types/users-type";
import { RoomData } from "./types/room-infotype";
import { getUniqueUserId } from "./functions";

config();

const app: Express = express();
const PORT: string | number = process.env.PORT || 5000;
const WS_PORT: number = Number(process.env.WS_PORT?.toString()) || 3000;

app.use(express.json());
app.use(express.urlencoded());

let roomsData: any = {};
let usersData: any = {};
const io = new Server();

io.on("connection", (socket) => {
    socket.on("create-room", (adminUsername: string, userId: string, roomName: string, roomId: string) => {
        console.log('room create');

        // Check if room exists
        if (roomsData[`${roomId}`]) {
            socket.emit("room-exists");
            return;
        }

        socket.emit("room-n-exists");

        // Creating Admin user
        const admin: Users = {
            userId: userId,
            username: adminUsername,
        };

        // Creating new Room
        const newRoom: RoomData = {
            roomName: roomName,
            roomId: roomId,
            roomAdminUsername: admin.username,
            roomAdminId: admin.userId,
            users: [admin],
        };

        usersData = {
            ...usersData,
            [`${userId}`]: {
                name: adminUsername,
                id: userId,
                isAdmin: true,
                room: roomId
            }
        }

        // Updating Room data
        roomsData = {
            ...roomsData,
            [`${roomId}`]: newRoom
        }

        socket.emit("user-id", userId);

        console.log(roomsData);
        console.log(roomsData[`${roomId}`].users);
        console.log(usersData);
    });

    socket.on("join-room", (username: string, userId: string, roomId: string) => {
        console.log('join room');

        // Check if room does not exists
        if (!roomsData[`${roomId}`]) {
            socket.emit("room-not-found");
            return;
        }

        // emitting room found
        socket.emit("room-found");

        // Creating new user
        const newUser: Users = {
            userId: userId,
            username: username,
        }

        usersData = {
            ...usersData,
            [`${userId}`]: {
                name: username,
                id: userId,
                isAdmin: false,
                room: roomId
            }
        }

        roomsData[`${roomId}`].users.push(newUser);

        socket.broadcast.emit("new-user-joined", username);

        console.log(roomsData);
        console.log(roomsData[`${roomId}`].users);
        console.log(usersData);

    });

    socket.on("leave-room", (userId: string, username: string, roomId: string) => {
        console.log('leave room');

        // Check if room exists
        if (!roomsData[`${roomId}`]) {
            socket.emit("room-not-found");
            return;
        }

        // Admin left room
        if (roomsData[`${roomId}`].roomAdminId === userId) {
            delete roomsData[`${roomId}`];
            delete usersData[`${userId}`];

            socket.broadcast.emit("admin-left-room");
            console.log(roomsData);
            console.log(usersData);

            return;
        }

        const user: Users = {
            userId: userId,
            username: username,
        }

        // When a user leaves a room
        const userIndex: number = roomsData[`${roomId}`].users.indexOf(user);

        if (usersData[`${userId}`]) {
            delete usersData[`${userId}`];

            let index = roomsData[`${roomId}`].users.findIndex((obj: Users) => obj.userId === userId);
            if (index !== -1) {
                roomsData[`${roomId}`].users.splice(index, 1);
            }

            socket.broadcast.emit("user-left", username);

            console.log(roomsData[`${roomId}`].users);
            console.log(usersData);
            return;
        }
    });

    socket.on("get-room", (roomId: string) => {
        // Check if room exists
        if (!roomsData[`${roomId}`]) {
            socket.emit("room-not-found");
            return;
        }

        socket.emit("room-info", roomsData[`${roomId}`]);
    });

    socket.on("get-user", (userId: string) => {
        // Check if user exists
        if (!usersData[`${userId}`]) {
            socket.emit("user-not-found");
            return;
        }

        socket.emit("user-info", usersData[`${userId}`]);
    });
});

io.listen(WS_PORT);

app.listen(PORT, () => {
    console.log(`running on http://localhost:${PORT}`);
})
