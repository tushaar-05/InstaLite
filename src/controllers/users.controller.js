import {
  createUser,
  listUsers,
  getUserById,
  updateUser,
  deleteUser,
  getUserPosts,
  getUserLikedPosts,
} from "../services/users.service.js";
import { parsePagination, buildMeta } from "../utils/pagination.js";

export async function create(req, res) {
  try {
    const { username, email, fullname, bio } = req.body || {};

    if (!username || !email || !fullname) {
      return res.status(400).json({
        error: "username, email and fullname are required",
      });
    }

    const newUser = await createUser({
      username,
      email,
      fullname,
      bio: bio !== undefined ? bio : null,
    });

    return res.status(201).json(newUser);
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({
        error: "username or email already taken",
      });
    }
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
      isPrivate,
      search,
      hasPosts,
    } = req.query;

    const allowedSortBy = ["createdAt", "username", "fullname"];
    if (!allowedSortBy.includes(sortBy)) {
      return res.status(400).json({
        error: "sortBy must be one of: createdAt, username, fullname",
      });
    }

    const allowedOrder = ["asc", "desc"];
    if (!allowedOrder.includes(order)) {
      return res.status(400).json({
        error: "order must be asc or desc",
      });
    }

    const where = {};

    if (isPrivate !== undefined) {
      if (isPrivate !== "true" && isPrivate !== "false") {
        return res.status(400).json({
          error: "isPrivate must be true or false",
        });
      }
      where.isPrivate = isPrivate === "true";
    }

    if (search !== undefined && search !== "") {
      where.OR = [
        { username: { contains: search, mode: "insensitive" } },
        { fullname: { contains: search, mode: "insensitive" } },
      ];
    }

    if (hasPosts !== undefined) {
      if (hasPosts !== "true" && hasPosts !== "false") {
        return res.status(400).json({
          error: "hasPosts must be true or false",
        });
      }
      where.posts = hasPosts === "true" ? { some: {} } : { none: {} };
    }

    const [users, total] = await listUsers({
      skip,
      take,
      orderBy: { [sortBy]: order },
      where,
    });

    return res.status(200).json({
      data: users,
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
      return res.status(404).json({ error: "User not found" });
    }

    const user = await getUserById(id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json(user);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

export async function update(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(404).json({ error: "User not found" });
    }

    const existingUser = await getUserById(id);
    if (!existingUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const { fullname, bio, isPrivate } = req.body || {};
    const data = {};
    if (fullname !== undefined) data.fullname = fullname;
    if (bio !== undefined) data.bio = bio;
    if (isPrivate !== undefined) data.isPrivate = Boolean(isPrivate);

    const updatedUser = await updateUser(id, data);
    return res.status(200).json(updatedUser);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

export async function remove(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(404).json({ error: "User not found" });
    }

    const existingUser = await getUserById(id);
    if (!existingUser) {
      return res.status(404).json({ error: "User not found" });
    }

    await deleteUser(id);
    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

export async function getPosts(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(404).json({ error: "User not found" });
    }

    const existingUser = await getUserById(id);
    if (!existingUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const pagination = parsePagination(req.query);
    if (pagination.error) {
      return res.status(400).json({ error: pagination.error });
    }

    const { page, limit, skip, take } = pagination;
    const [posts, total] = await getUserPosts(id, { skip, take });

    return res.status(200).json({
      data: posts,
      meta: buildMeta(total, page, limit),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

export async function getLikedPosts(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(404).json({ error: "User not found" });
    }

    const existingUser = await getUserById(id);
    if (!existingUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const pagination = parsePagination(req.query);
    if (pagination.error) {
      return res.status(400).json({ error: pagination.error });
    }

    const { page, limit, skip, take } = pagination;
    const [posts, total] = await getUserLikedPosts(id, { skip, take });

    return res.status(200).json({
      data: posts,
      meta: buildMeta(total, page, limit),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
