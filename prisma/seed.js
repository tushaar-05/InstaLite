import prisma from "../src/db.js";
import { users, posts, likes } from "./seed-data.js";

async function main() {
  try {
    // 1. Delete all rows from all three tables. Children first: likes, then posts, then users
    await prisma.like.deleteMany();
    await prisma.post.deleteMany();
    await prisma.user.deleteMany();

    // 2. Create all users in one query, get created rows back
    const createdUsers = await prisma.user.createManyAndReturn({
      data: users,
    });

    // 3. Build a lookup: username -> id
    const userMap = new Map(createdUsers.map((u) => [u.username, u.id]));

    // 4. Create all posts in one query, replacing author with authorId
    const postsToCreate = posts.map((p) => ({
      imageUrl: p.imageUrl,
      caption: p.caption,
      location: p.location,
      createdAt: p.createdAt,
      authorId: userMap.get(p.author),
    }));

    const createdPosts = await prisma.post.createManyAndReturn({
      data: postsToCreate,
    });

    // 5. Build a lookup: insta## -> post id
    const postMap = new Map();
    for (const p of createdPosts) {
      const key = p.imageUrl.split("/")[4];
      postMap.set(key, p.id);
    }

    // 6. Create all likes in one query (real userId and postId)
    const likesToCreate = likes.map((l) => ({
      userId: userMap.get(l.user),
      postId: postMap.get(l.post),
    }));

    const createdLikes = await prisma.like.createManyAndReturn({
      data: likesToCreate,
    });

    // 7. Print seeded numbers
    console.log(
      `🌱 Seeded ${createdUsers.length} users, ${createdPosts.length} posts and ${createdLikes.length} likes`
    );
  } catch (error) {
    console.error("Error during seeding:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
