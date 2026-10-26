import prisma from "../db.js";

const USER_SUMMARY_SELECT = {
  id: true,
  username: true,
  fullname: true,
};

export async function createUser(data) {
  return await prisma.user.create({
    data,
  });
}

export async function listUsers({ skip, take, orderBy, where }) {
  return await prisma.$transaction([
    prisma.user.findMany({
      where,
      orderBy,
      skip,
      take,
    }),
    prisma.user.count({ where }),
  ]);
}

export async function getUserById(id) {
  return await prisma.user.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          posts: true,
          likes: true,
        },
      },
    },
  });
}

export async function updateUser(id, data) {
  return await prisma.user.update({
    where: { id },
    data,
  });
}

export async function deleteUser(id) {
  return await prisma.user.delete({
    where: { id },
  });
}

export async function getUserPosts(userId, { skip, take }) {
  return await prisma.$transaction([
    prisma.post.findMany({
      where: { authorId: userId },
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: {
        _count: {
          select: {
            likes: true,
          },
        },
      },
    }),
    prisma.post.count({ where: { authorId: userId } }),
  ]);
}

export async function getUserLikedPosts(userId, { skip, take }) {
  const where = {
    likes: {
      some: {
        userId,
      },
    },
  };

  return await prisma.$transaction([
    prisma.post.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: {
        author: {
          select: USER_SUMMARY_SELECT,
        },
        _count: {
          select: {
            likes: true,
          },
        },
      },
    }),
    prisma.post.count({ where }),
  ]);
}
