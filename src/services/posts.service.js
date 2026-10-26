import prisma from "../db.js";

const USER_SUMMARY_SELECT = {
  id: true,
  username: true,
  fullname: true,
};

export async function createPost(data) {
  return await prisma.post.create({
    data,
  });
}

export async function listPosts({ skip, take, orderBy, where }) {
  return await prisma.$transaction([
    prisma.post.findMany({
      where,
      orderBy,
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

export async function getPostById(id) {
  return await prisma.post.findUnique({
    where: { id },
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
  });
}

export async function updatePost(id, data) {
  return await prisma.post.update({
    where: { id },
    data,
  });
}

export async function deletePost(id) {
  return await prisma.post.delete({
    where: { id },
  });
}

export async function getPostLikes(id) {
  const likes = await prisma.like.findMany({
    where: { postId: id },
    include: {
      user: {
        select: USER_SUMMARY_SELECT,
      },
    },
    orderBy: {
      user: {
        username: "asc",
      },
    },
  });

  return likes.map((l) => l.user);
}
