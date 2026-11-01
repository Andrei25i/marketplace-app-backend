import { randomUUID } from "crypto";

const getRoot = () =>
  (process.env.CLOUDINARY_ROOT_FOLDER || "project/dev").replace(
    /^\/+|\/+$/g,
    "",
  );

export const userRoot = (userId: string) => `${getRoot()}/users/${userId}/`;

export const adImagePublicId = (userId: string) =>
  `${userRoot(userId)}ads/${randomUUID()}`;

export const chatMediaPublicId = (userId: string, conversationId: string) =>
  `${userRoot(userId)}chat/${conversationId}/${randomUUID()}`;

export const userTag = (userId: string) => `user_${userId}`;

export const isOwnedBy = (
  publicId: unknown,
  userId: string,
): publicId is string =>
  typeof publicId === "string" &&
  !publicId.includes("..") &&
  publicId.startsWith(userRoot(userId));
