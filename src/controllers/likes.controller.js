import { createLike, deleteLike } from "../services/likes.service.js";
import { getPostById, getPostLikes } from "../services/posts.service.js";
import { getUserById } from "../services/users.service.js";

export async function like(req, res) {
  try {
    const postId = parseInt(req.params.id, 10);
    const { userId } = req.body || {};

    if (userId === undefined || userId === null || userId === "") {
      return res.status(400).json({
        error: "userId is required",
      });
    }

    const userIdInt = parseInt(userId, 10);

    const post = await getPostById(postId);
    if (!post) {
      return res.status(404).json({
        error: "Post not found",
      });
    }

    const user = await getUserById(userIdInt);
    if (!user) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    try {
      const newLike = await createLike(postId, userIdInt);
      return res.status(201).json(newLike);
    } catch (err) {
      if (err.code === "P2002") {
        return res.status(409).json({
          error: "Already liked",
        });
      }
      throw err;
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

export async function unlike(req, res) {
  try {
    const postId = parseInt(req.params.id, 10);
    const userId = parseInt(req.params.userId, 10);

    if (isNaN(postId) || isNaN(userId)) {
      return res.status(404).json({
        error: "Like not found",
      });
    }

    try {
      await deleteLike(postId, userId);
      return res.status(204).send();
    } catch (err) {
      if (err.code === "P2025") {
        return res.status(404).json({
          error: "Like not found",
        });
      }
      throw err;
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

export async function getLikes(req, res) {
  try {
    const postId = parseInt(req.params.id, 10);
    if (isNaN(postId)) {
      return res.status(404).json({ error: "Post not found" });
    }

    const post = await getPostById(postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const likes = await getPostLikes(postId);
    return res.status(200).json(likes);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
