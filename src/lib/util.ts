import { v4 as uuidv4 } from 'uuid';

// Generate a version 4 UUID
export const generateUniqueId = () => {
  return uuidv4();
};
