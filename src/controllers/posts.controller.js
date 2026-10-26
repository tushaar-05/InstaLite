import {
  createPost,
  listPosts,
  getPostById,
  updatePost,
  deletePost,
} from "../services/posts.service.js";
import { getUserById } from "../services/users.service.js";
import { parsePagination, buildMeta } from "../utils/pagination.js";

export async function create(req, res) {
  try {
    const { imageUrl, authorId, caption, location } = req.body || {};

    if (
      !imageUrl ||
      authorId === undefined ||
      authorId === null ||
      authorId === ""
    ) {
      return res.status(400).json({
        error: "imageUrl and authorId are required",
      });
    }

    const authorIdInt = parseInt(authorId, 10);
    if (isNaN(authorIdInt)) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    const author = await getUserById(authorIdInt);
    if (!author) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    const newPost = await createPost({
      imageUrl,
      authorId: authorIdInt,
      caption: caption !== undefined ? caption : null,
      location: location !== undefined ? location : null,
    });

    return res.status(201).json(newPost);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

export async function list(req, res) {
  try {
    const pagination = parsePagination(req.query);
    if (pagination.error) {
      return res.status(400).json({ error: pagination.error });
    }

    const { page, limit, skip, take } = pagination;
    const {
      sortBy = "createdAt",
      order = "desc",
      location,
      search,
      from,
      to,
    } = req.query;

    const allowedSortBy = ["createdAt", "updatedAt", "likes"];
    if (!allowedSortBy.includes(sortBy)) {
      return res.status(400).json({
        error: "sortBy must be one of: createdAt, updatedAt, likes",
      });
    }

    const allowedOrder = ["asc", "desc"];
    if (!allowedOrder.includes(order)) {
      return res.status(400).json({
        error: "order must be asc or desc",
      });
    }

    const where = {};

    if (location !== undefined && location !== "") {
      where.location = { equals: location, mode: "insensitive" };
    }

    if (search !== undefined && search !== "") {
      where.caption = { contains: search, mode: "insensitive" };
    }

    if (from !== undefined) {
      const fromDate = new Date(from);
      if (isNaN(fromDate.getTime())) {
        return res.status(400).json({
          error: "from and to must be valid dates",
        });
      }
    }

    if (to !== undefined) {
      const toDate = new Date(to);
      if (isNaN(toDate.getTime())) {
        return res.status(400).json({
          error: "from and to must be valid dates",
        });
      }
    }

    if (from !== undefined || to !== undefined) {
      where.createdAt = {};
      if (from !== undefined) {
        where.createdAt.gte = new Date(from);
      }
      if (to !== undefined) {
        where.createdAt.lt = new Date(to);
      }
    }

    let orderBy;
    if (sortBy === "likes") {
      orderBy = [{ likes: { _count: order } }, { createdAt: "desc" }];
    } else {
      orderBy = { [sortBy]: order };
    }

    const [posts, total] = await listPosts({
      skip,
      take,
      orderBy,
      where,
    });

    return res.status(200).json({
      data: posts,
      meta: buildMeta(total, page, limit),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

export async function getOne(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(404).json({ error: "Post not found" });
    }

    const post = await getPostById(id);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    return res.status(200).json(post);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

export async function update(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(404).json({ error: "Post not found" });
    }

    const existingPost = await getPostById(id);
    if (!existingPost) {
      return res.status(404).json({ error: "Post not found" });
    }

    const { caption, location } = req.body || {};
    const data = {};
    if (caption !== undefined) data.caption = caption;
    if (location !== undefined) data.location = location;

    const updatedPost = await updatePost(id, data);
    return res.status(200).json(updatedPost);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

export async function remove(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(404).json({ error: "Post not found" });
    }

    const existingPost = await getPostById(id);
    if (!existingPost) {
      return res.status(404).json({ error: "Post not found" });
    }

    await deletePost(id);
    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
