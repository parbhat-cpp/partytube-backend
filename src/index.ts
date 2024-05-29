import express, { Express } from "express";
import { config } from 'dotenv';
import { Server } from "socket.io";
import { Users } from "./types/users-type";
import { RoomData } from "./types/room-infotype";
import cors from 'cors';
import http from 'http';
config();

const app: Express = express();
const PORT: string | number = process.env.PORT || 5000;
const WS_PORT: number = Number(process.env.WS_PORT?.toString()) || 3000;

app.use(express.json());
app.use(express.urlencoded());
app.use(cors());

let roomsData: any = {};
let usersData: any = {};
const server = new http.Server(app);
const io = new Server(server, {
    transports: ['polling', 'websocket'],
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true
    }
});

io.on("connection", (socket) => {
    socket.on("create-room", (adminUsername: string, userId: string, roomName: string, roomId: string) => {
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
    });

    socket.on("join-room", (username: string, userId: string, roomId: string) => {
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
    });

    socket.on("leave-room", (userId: string, username: string, roomId: string) => {
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

    socket.on("remove-user", (userId: string, roomId: string) => {
        // Check if user exists
        if (!usersData[`${userId}`]) {
            socket.emit("user-not-found");
            return;
        }

        let index = roomsData[`${roomId}`].users.findIndex((obj: Users) => obj.userId === userId);
        if (index !== -1) {
            roomsData[`${roomId}`].users.splice(index, 1);
        }

        delete usersData[`${userId}`];

        socket.broadcast.emit("remove-user-response", userId);
    });

    socket.on("user-removed", (username: string) => {
        socket.broadcast.emit("user-kicked", username);
    });

    socket.on("set-video", (username: string, videoId: string) => {
        socket.broadcast.emit("set-videoid", { "username": username, "videoId": videoId });
    });

    // Chat logic
    socket.on("send-message", (username: string, userId: string, message: string) => {
        // if (username && userId && message) {
        socket.broadcast.emit("receive-message", { "username": username, "userId": userId, "message": message });
        // }
    });

    // seek video
    socket.on("seek-video", (seekData: any) => {
        socket.broadcast.emit("set-video-duration", seekData);
    });
});

server.listen(WS_PORT, () => {
    console.log('server running');
});
