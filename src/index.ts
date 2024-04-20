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
const io = new Server();

io.on("connection", (socket) => {
    socket.on("create-room", (adminUsername: string, roomName: string, roomId: string) => {
        // Check if room exists
        if (roomsData[`${roomId}`]) {
            socket.emit("room-exists");
            return;
        }

        // Creating unique user id
        const userId: string = getUniqueUserId() as string;

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

        // Updating Room data
        roomsData = {
            ...roomsData,
            [`${roomId}`]: newRoom
        }

        console.log(roomsData);
        console.log(roomsData[`${roomId}`].users);
    });

    socket.on("join-room", (username: string, roomId: string) => {
        // Check if room does not exists
        if (!roomsData[`${roomId}`]) {
            socket.emit("room-not-found");
            return;
        }

        // Creating unique user id
        const userId: string = getUniqueUserId() as string;

        // Creating new user
        const newUser: Users = {
            userId: userId,
            username: username,
        }

        roomsData[`${roomId}`].users.push(newUser);

        socket.broadcast.emit("new-user-joined");

        console.log(roomsData);
        console.log(roomsData[`${roomId}`].users);
    });

    socket.on("leave-room", (userId: string, username: string, roomId: string) => {
        // Check if room exists
        if (!roomsData[`${roomId}`]) {
            socket.emit("room-not-found");
            return;
        }

        // Admmin left room
        if (roomsData[`${roomId}`].roomAdminId === userId) {
            delete roomsData[`${roomId}`];
            socket.broadcast.emit("admin-left-room");
            return;
        }

        const user: Users = {
            userId: userId,
            username: username,
        }

        // When a user leaves a room
        const userIndex: number = roomsData[`${roomId}`].users.indexOf(user);

        if (userIndex > -1) {
            roomsData[`${roomId}`].users.splice(userIndex, 1);
            socket.broadcast.emit("user-left");
        } else {
            socket.emit("unable-to-leave");
        }
    });
});

io.listen(WS_PORT);

app.listen(PORT, () => {
    console.log(`running on http://localhost:${PORT}`);
})
