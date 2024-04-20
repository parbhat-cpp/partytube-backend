import { Users } from "./users-type";

export interface RoomData {
    roomName: string;
    roomId: string;
    roomAdminUsername: string;
    roomAdminId: string;
    users: Array<Users>;
};
