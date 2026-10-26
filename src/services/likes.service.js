import prisma from "../db.js";

export async function createLike(postId, userId) {
  return await prisma.like.create({
    data: {
      postId,
      userId,
    },
  });
}

export async function deleteLike(postId, userId) {
  return await prisma.like.delete({
    where: {
      userId_postId: {
        userId,
        postId,
      },
    },
  });
}
