import { Router } from "express";
import {
  create,
  list,
  getOne,
  update,
  remove,
  getPosts,
  getLikedPosts,
} from "../controllers/users.controller.js";

const router = Router();

router.post("/", create);
router.get("/", list);
router.get("/:id", getOne);
router.patch("/:id", update);
router.delete("/:id", remove);
router.get("/:id/posts", getPosts);
router.get("/:id/liked-posts", getLikedPosts);

export default router;
