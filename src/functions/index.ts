import { v4 as uuidv4 } from 'uuid';

export const getUniqueUserId = () => {
    return uuidv4().split("-").at(4);
}