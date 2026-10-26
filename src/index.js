import express from "express";
import usersRouter from "./routes/users.routes.js";
import postsRouter from "./routes/posts.routes.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});

app.use("/users", usersRouter);
app.use("/posts", postsRouter);

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});

export default app;
