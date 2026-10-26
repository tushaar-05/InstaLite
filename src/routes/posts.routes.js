import { Router } from "express";
import {
  create,
  list,
  getOne,
  update,
  remove,
} from "../controllers/posts.controller.js";
import {
  like,
  unlike,
  getLikes,
} from "../controllers/likes.controller.js";

const router = Router();

router.post("/", create);
router.get("/", list);
router.get("/:id", getOne);
router.patch("/:id", update);
router.delete("/:id", remove);

router.get("/:id/likes", getLikes);
router.post("/:id/likes", like);
router.delete("/:id/likes/:userId", unlike);

export default router;
