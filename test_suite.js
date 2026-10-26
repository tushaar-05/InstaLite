import { execSync, spawn } from "child_process";

// Helper to seed
function runSeed() {
  execSync("node ./prisma/seed.js", { stdio: "inherit" });
}

async function request(baseUrl, path, options = {}) {
  const url = `${baseUrl}${path}`;
  const res = await fetch(url, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      Connection: "close",
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const status = res.status;
  let body = null;
  const text = await res.text();
  try {
    body = JSON.parse(text);
  } catch (e) {
    body = text;
  }

  return { status, body };
}

let passed = 0;
let failed = 0;

function assert(condition, message, details = "") {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ ${message}`);
    if (details) console.error(`    Details: ${JSON.stringify(details)}`);
  }
}

async function runTests() {
  const baseUrl = `http://localhost:3000`;
  let serverProcess = null;

  try {
    await fetch(`${baseUrl}/health`);
    console.log(`Using existing server on ${baseUrl}`);
  } catch {
    console.log(`Starting server on ${baseUrl}...`);
    serverProcess = spawn("node", ["src/index.js"], { stdio: "pipe" });
    let started = false;
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 250));
      try {
        const res = await fetch(`${baseUrl}/health`);
        if (res.ok) {
          started = true;
          break;
        }
      } catch {}
    }
    if (!started) {
      throw new Error("Failed to start server on port 3000");
    }
  }

  try {
    console.log("\n================ PART 1: PROBLEM 1 CRUD TESTS ================");
    runSeed();

    // 1. GET /health
    {
      const res = await request(baseUrl, "/health");
      assert(res.status === 200 && res.body.status === "OK", "GET /health returns 200 OK", res);
    }

    // 2. POST /users
    {
      const res1 = await request(baseUrl, "/users", {
        method: "POST",
        body: { username: "test_user_unique", email: "test_unique@example.com", fullname: "Test User" },
      });
      assert(res1.status === 201 && res1.body.username === "test_user_unique" && res1.body.id, "POST /users creates user with 201", res1);

      const res2 = await request(baseUrl, "/users", {
        method: "POST",
        body: { username: "test_user_unique", email: "another@example.com", fullname: "Dup" },
      });
      assert(res2.status === 409 && res2.body.error === "username or email already taken", "POST /users duplicate username returns 409", res2);

      const res3 = await request(baseUrl, "/users", {
        method: "POST",
        body: { username: "onlyname" },
      });
      assert(res3.status === 400 && res3.body.error === "username, email and fullname are required", "POST /users missing required fields returns 400", res3);
    }

    // 3. GET /users/:id & PATCH /users/:id & DELETE /users/:id
    {
      const usersList = await request(baseUrl, "/users");
      const user = usersList.body.data[0];
      const userId = user.id;

      const getRes = await request(baseUrl, `/users/${userId}`);
      assert(getRes.status === 200 && getRes.body.username === user.username, "GET /users/:id returns user", getRes);

      const patchRes = await request(baseUrl, `/users/${userId}`, {
        method: "PATCH",
        body: { fullname: "Updated Name", username: "should_ignore" },
      });
      assert(patchRes.status === 200 && patchRes.body.fullname === "Updated Name" && patchRes.body.username === user.username, "PATCH /users/:id updates fullname and ignores username", patchRes);

      const delRes = await request(baseUrl, `/users/${userId}`, { method: "DELETE" });
      assert(delRes.status === 204, "DELETE /users/:id returns 204", delRes);

      const getAfterDel = await request(baseUrl, `/users/${userId}`);
      assert(getAfterDel.status === 404 && getAfterDel.body.error === "User not found", "GET deleted user returns 404", getAfterDel);
    }

    console.log("\n================ PART 2: PROBLEM 2 PAGINATION, SORTING & FILTERING ================");
    runSeed();

    // GET /users pagination
    {
      const res1 = await request(baseUrl, "/users");
      assert(res1.status === 200 && res1.body.data.length === 10 && res1.body.meta.total === 12 && res1.body.meta.totalPages === 2, "GET /users default page 1 returns 10 users, total 12", res1);
      assert(res1.body.data[0].username === "dev_shoots", "GET /users default sorted by newest first (dev_shoots)");

      const res2 = await request(baseUrl, "/users?page=2");
      assert(res2.status === 200 && res2.body.data.length === 2 && res2.body.data[0].username === "arjun_clicks" && res2.body.data[1].username === "riya_travels", "GET /users?page=2 returns arjun_clicks and riya_travels", res2);

      const res3 = await request(baseUrl, "/users?page=3&limit=5");
      assert(res3.status === 200 && res3.body.data.length === 2 && res3.body.meta.totalPages === 3, "GET /users?page=3&limit=5 returns last page of 2 users", res3);

      const res4 = await request(baseUrl, "/users?limit=100");
      assert(res4.status === 200 && res4.body.data.length === 12 && res4.body.meta.limit === 50, "GET /users?limit=100 capped at 50, returns all 12", res4);

      const res5 = await request(baseUrl, "/users?page=5");
      assert(res5.status === 200 && res5.body.data.length === 0 && res5.body.meta.total === 12, "GET /users?page=5 beyond last page returns empty array", res5);

      const res6 = await request(baseUrl, "/users?page=0");
      assert(res6.status === 400 && res6.body.error === "page and limit must be positive integers", "GET /users?page=0 returns 400", res6);

      const res7 = await request(baseUrl, "/users?limit=abc");
      assert(res7.status === 400 && res7.body.error === "page and limit must be positive integers", "GET /users?limit=abc returns 400", res7);

      const res8 = await request(baseUrl, "/users?page=1.5");
      assert(res8.status === 400 && res8.body.error === "page and limit must be positive integers", "GET /users?page=1.5 returns 400", res8);
    }

    // GET /users sorting
    {
      const res1 = await request(baseUrl, "/users?sortBy=username&order=asc");
      assert(res1.status === 200 && res1.body.data[0].username === "aditya_codes", "GET /users?sortBy=username&order=asc starts with aditya_codes", res1);

      const res2 = await request(baseUrl, "/users?sortBy=fullname&order=desc&limit=3");
      assert(res2.status === 200 && res2.body.data[0].username === "vikram.trek" && res2.body.data[1].username === "sara_sketches" && res2.body.data[2].username === "rohan_runs", "GET /users sortBy fullname desc limit 3 matches expected order", res2);

      const res3 = await request(baseUrl, "/users?order=asc&limit=2");
      assert(res3.status === 200 && res3.body.data[0].username === "riya_travels" && res3.body.data[1].username === "arjun_clicks", "GET /users order asc limit 2 returns oldest first (riya, arjun)", res3);

      const res4 = await request(baseUrl, "/users?sortBy=email");
      assert(res4.status === 400 && res4.body.error === "sortBy must be one of: createdAt, username, fullname", "GET /users?sortBy=email returns 400", res4);

      const res5 = await request(baseUrl, "/users?order=sideways");
      assert(res5.status === 400 && res5.body.error === "order must be asc or desc", "GET /users?order=sideways returns 400", res5);
    }

    // GET /users filtering
    {
      const res1 = await request(baseUrl, "/users?isPrivate=true");
      assert(res1.status === 200 && res1.body.data.length === 4 && res1.body.meta.total === 4, "GET /users?isPrivate=true returns 4 private users", res1);

      const res2 = await request(baseUrl, "/users?isPrivate=false");
      assert(res2.status === 200 && res2.body.data.length === 8 && res2.body.meta.total === 8, "GET /users?isPrivate=false returns 8 public users", res2);

      const res3 = await request(baseUrl, "/users?search=sh");
      assert(res3.status === 200 && res3.body.meta.total === 3, "GET /users?search=sh matches 3 users (username or fullname)", res3);

      const res4 = await request(baseUrl, "/users?search=SH&isPrivate=false&sortBy=fullname&order=asc&limit=2");
      assert(res4.status === 200 && res4.body.data[0].username === "isha_dances" && res4.body.data[1].username === "riya_travels", "GET /users search case-insensitive + isPrivate + sort matches", res4);

      const res5 = await request(baseUrl, "/users?search=zzz");
      assert(res5.status === 200 && res5.body.data.length === 0 && res5.body.meta.total === 0 && res5.body.meta.totalPages === 0, "GET /users?search=zzz returns empty total 0 totalPages 0", res5);

      const res6 = await request(baseUrl, "/users?isPrivate=maybe");
      assert(res6.status === 400 && res6.body.error === "isPrivate must be true or false", "GET /users?isPrivate=maybe returns 400", res6);
    }

    // GET /posts pagination, sorting, filtering
    {
      const res1 = await request(baseUrl, "/posts");
      assert(res1.status === 200 && res1.body.data.length === 10 && res1.body.meta.total === 24 && res1.body.meta.totalPages === 3, "GET /posts returns 10 posts, total 24", res1);

      const res2 = await request(baseUrl, "/posts?page=3");
      assert(res2.status === 200 && res2.body.data.length === 4, "GET /posts?page=3 returns 4 posts", res2);

      const res3 = await request(baseUrl, "/posts?page=4");
      assert(res3.status === 200 && res3.body.data.length === 0, "GET /posts?page=4 returns empty array", res3);

      const res4 = await request(baseUrl, "/posts?order=asc&limit=3");
      assert(res4.status === 200 && res4.body.data.length === 3 && res4.body.meta.totalPages === 8, "GET /posts?order=asc&limit=3 oldest first", res4);

      const res5 = await request(baseUrl, "/posts?limit=0");
      assert(res5.status === 400 && res5.body.error === "page and limit must be positive integers", "GET /posts?limit=0 returns 400", res5);

      const res6 = await request(baseUrl, "/posts?sortBy=caption");
      assert(res6.status === 400 && res6.body.error === "sortBy must be one of: createdAt, updatedAt, likes", "GET /posts?sortBy=caption returns 400 with allowed list", res6);

      const res7 = await request(baseUrl, "/posts?order=up");
      assert(res7.status === 400 && res7.body.error === "order must be asc or desc", "GET /posts?order=up returns 400", res7);

      const resLoc = await request(baseUrl, "/posts?location=GOA");
      assert(resLoc.status === 200 && resLoc.body.data.length === 4 && resLoc.body.meta.total === 4, "GET /posts?location=GOA case-insensitive returns 4 posts (including goa)", resLoc);

      const resSearch = await request(baseUrl, "/posts?search=sunset");
      assert(resSearch.status === 200 && resSearch.body.meta.total === 3, "GET /posts?search=sunset returns 3 posts", resSearch);

      const resDates = await request(baseUrl, "/posts?from=2026-03-01&to=2026-04-01");
      assert(resDates.status === 200 && resDates.body.meta.total === 8, "GET /posts from March 1 to April 1 returns 8 posts", resDates);

      const resInvalidDate = await request(baseUrl, "/posts?from=yesterday");
      assert(resInvalidDate.status === 400 && resInvalidDate.body.error === "from and to must be valid dates", "GET /posts?from=yesterday returns 400", resInvalidDate);
    }

    console.log("\n================ PART 3: PROBLEM 3 RELATIONS TESTS ================");
    runSeed();

    const findUserId = async (search) => (await request(baseUrl, `/users?search=${encodeURIComponent(search)}`)).body.data[0].id;
    const findPostId = async (search) => (await request(baseUrl, `/posts?search=${encodeURIComponent(search)}`)).body.data[0].id;
    const findOldestPuneId = async () => (await request(baseUrl, `/posts?location=pune&order=asc&limit=1`)).body.data[0].id;

    // Step 04: POST /posts and PATCH /posts/:id
    {
      const riyaId = await findUserId("riya");
      const arjunId = await findUserId("arjun");
      const insta01Id = await findPostId("baga");

      const res1 = await request(baseUrl, "/posts", {
        method: "POST",
        body: { imageUrl: "https://picsum.photos/seed/new01/600/600", caption: "First post!", authorId: riyaId },
      });
      assert(res1.status === 201 && res1.body.authorId === riyaId, "POST /posts creates post with authorId", res1);

      const res2 = await request(baseUrl, "/posts", {
        method: "POST",
        body: { imageUrl: "https://picsum.photos/seed/new02/600/600" },
      });
      assert(res2.status === 400 && res2.body.error === "imageUrl and authorId are required", "POST /posts missing authorId returns 400", res2);

      const res3 = await request(baseUrl, "/posts", {
        method: "POST",
        body: { imageUrl: "https://picsum.photos/seed/new03/600/600", authorId: 999999 },
      });
      assert(res3.status === 404 && res3.body.error === "User not found", "POST /posts non-existent authorId returns 404", res3);

      const res4 = await request(baseUrl, `/posts/${insta01Id}`, {
        method: "PATCH",
        body: { caption: "Baga, again 🌅", authorId: arjunId },
      });
      assert(res4.status === 200 && res4.body.caption === "Baga, again 🌅" && res4.body.authorId === riyaId, "PATCH /posts/:id ignores authorId", res4);
    }

    // Step 05: GET /posts/:id with author and like count
    {
      const insta01Id = await findPostId("baga");
      const insta24Id = await findPostId("tiger");
      const insta05Id = await findOldestPuneId();

      const res1 = await request(baseUrl, `/posts/${insta01Id}`);
      assert(res1.status === 200 && res1.body.author.username === "riya_travels" && res1.body._count.likes === 5, "GET /posts/:id insta01 author riya likes 5", res1);
      assert(res1.body.author.email === undefined, "author does not include email (select used)");

      const res2 = await request(baseUrl, `/posts/${insta24Id}`);
      assert(res2.status === 200 && res2.body.author.username === "dev_shoots" && res2.body._count.likes === 6, "GET /posts/:id insta24 author dev_shoots likes 6", res2);

      const res3 = await request(baseUrl, `/posts/${insta05Id}`);
      assert(res3.status === 200 && res3.body.author.username === "arjun_clicks" && res3.body._count.likes === 0, "GET /posts/:id insta05 likes 0", res3);

      const res4 = await request(baseUrl, "/posts/999999");
      assert(res4.status === 404 && res4.body.error === "Post not found", "GET /posts/999999 returns 404", res4);
    }

    // Step 06: GET /posts with sortBy=likes
    {
      const res1 = await request(baseUrl, "/posts?sortBy=likes&limit=5");
      const likesCounts = res1.body.data.map((p) => p._count.likes);
      assert(res1.status === 200 && JSON.stringify(likesCounts) === JSON.stringify([6, 5, 3, 3, 3]), "GET /posts?sortBy=likes returns posts ordered by likes (6, 5, 3, 3, 3)", likesCounts);

      const res2 = await request(baseUrl, "/posts?location=goa&sortBy=likes");
      assert(res2.status === 200 && res2.body.meta.total === 4, "GET /posts Goa sortBy likes meta.total = 4", res2);

      const res3 = await request(baseUrl, "/posts?sortBy=comments");
      assert(res3.status === 400 && res3.body.error === "sortBy must be one of: createdAt, updatedAt, likes", "GET /posts?sortBy=comments returns 400", res3);
    }

    // Step 07: GET /users/:id with counts & hasPosts filter
    {
      runSeed();
      const riyaId = await findUserId("riya");
      const devId = await findUserId("dev_shoots");
      const adityaId = await findUserId("aditya_codes");

      const res1 = await request(baseUrl, `/users/${riyaId}`);
      assert(res1.status === 200 && res1.body._count.posts === 7 && res1.body._count.likes === 4, "GET /users/:id riya posts 7 likes 4", res1.body._count);

      const res2 = await request(baseUrl, `/users/${devId}`);
      assert(res2.status === 200 && res2.body._count.posts === 2 && res2.body._count.likes === 1, "GET /users/:id dev posts 2 likes 1", res2.body._count);

      const res3 = await request(baseUrl, `/users/${adityaId}`);
      assert(res3.status === 200 && res3.body._count.posts === 0 && res3.body._count.likes === 2, "GET /users/:id aditya posts 0 likes 2", res3.body._count);

      const res4 = await request(baseUrl, "/users?hasPosts=false");
      assert(res4.status === 200 && res4.body.meta.total === 2, "GET /users?hasPosts=false meta.total = 2", res4.body.meta);

      const res5 = await request(baseUrl, "/users?hasPosts=true");
      assert(res5.status === 200 && res5.body.meta.total === 10, "GET /users?hasPosts=true meta.total = 10", res5.body.meta);

      const res6 = await request(baseUrl, "/users?hasPosts=true&isPrivate=true");
      assert(res6.status === 200 && res6.body.meta.total === 3, "GET /users?hasPosts=true&isPrivate=true meta.total = 3", res6.body.meta);

      const res7 = await request(baseUrl, "/users?hasPosts=yes");
      assert(res7.status === 400 && res7.body.error === "hasPosts must be true or false", "GET /users?hasPosts=yes returns 400", res7);
    }

    // Step 08: GET /users/:id/posts
    {
      const riyaId = await findUserId("riya");
      const adityaId = await findUserId("aditya_codes");

      const res1 = await request(baseUrl, `/users/${riyaId}/posts?limit=3`);
      assert(res1.status === 200 && res1.body.meta.total === 7 && res1.body.data.length === 3, "GET /users/:id/posts riya limit 3 returns 3 of 7", res1.body.meta);

      const res2 = await request(baseUrl, `/users/${adityaId}/posts`);
      assert(res2.status === 200 && res2.body.data.length === 0 && res2.body.meta.total === 0 && res2.body.meta.totalPages === 0, "GET /users/:id/posts aditya has 0 posts", res2.body.meta);

      const res3 = await request(baseUrl, "/users/999999/posts");
      assert(res3.status === 404 && res3.body.error === "User not found", "GET /users/999999/posts returns 404", res3);

      const res4 = await request(baseUrl, `/users/${riyaId}/posts?page=0`);
      assert(res4.status === 400 && res4.body.error === "page and limit must be positive integers", "GET /users/:id/posts?page=0 returns 400", res4);
    }

    // Step 09: GET /posts/:id/likes
    {
      const insta01Id = await findPostId("baga");
      const insta05Id = await findOldestPuneId();

      const res1 = await request(baseUrl, `/posts/${insta01Id}/likes`);
      assert(res1.status === 200 && res1.body.length === 5 && res1.body[0].username === "arjun_clicks", "GET /posts/:id/likes insta01 returns 5 user summaries", res1.body);

      const res2 = await request(baseUrl, `/posts/${insta05Id}/likes`);
      assert(res2.status === 200 && res2.body.length === 0, "GET /posts/:id/likes insta05 returns empty array", res2.body);

      const res3 = await request(baseUrl, "/posts/999999/likes");
      assert(res3.status === 404 && res3.body.error === "Post not found", "GET /posts/999999/likes returns 404", res3);
    }

    // Step 10: POST /posts/:id/likes and DELETE /posts/:id/likes/:userId
    {
      const riyaId = await findUserId("riya");
      const insta05Id = await findOldestPuneId();

      const res1 = await request(baseUrl, `/posts/${insta05Id}/likes`, {
        method: "POST",
        body: { userId: riyaId },
      });
      assert(res1.status === 201 && res1.body.userId === riyaId && res1.body.postId === insta05Id, "POST /posts/:id/likes creates like with 201", res1);

      const res2 = await request(baseUrl, `/posts/${insta05Id}/likes`, {
        method: "POST",
        body: { userId: riyaId },
      });
      assert(res2.status === 409 && res2.body.error === "Already liked", "POST /posts/:id/likes duplicate like returns 409", res2);

      const res3 = await request(baseUrl, `/posts/${insta05Id}/likes`, {
        method: "POST",
        body: {},
      });
      assert(res3.status === 400 && res3.body.error === "userId is required", "POST /posts/:id/likes missing userId returns 400", res3);

      const res4 = await request(baseUrl, "/posts/999999/likes", {
        method: "POST",
        body: { userId: riyaId },
      });
      assert(res4.status === 404 && res4.body.error === "Post not found", "POST /posts/999999/likes non-existent post returns 404", res4);

      const res5 = await request(baseUrl, `/posts/${insta05Id}/likes`, {
        method: "POST",
        body: { userId: 999999 },
      });
      assert(res5.status === 404 && res5.body.error === "User not found", "POST /posts/:id/likes non-existent user returns 404", res5);

      const res6 = await request(baseUrl, `/posts/${insta05Id}`);
      assert(res6.status === 200 && res6.body._count.likes === 1, "insta05 now has 1 like", res6.body._count);

      const res7 = await request(baseUrl, `/posts/${insta05Id}/likes/${riyaId}`, {
        method: "DELETE",
      });
      assert(res7.status === 204, "DELETE /posts/:id/likes/:userId returns 204", res7);

      const res8 = await request(baseUrl, `/posts/${insta05Id}/likes/${riyaId}`, {
        method: "DELETE",
      });
      assert(res8.status === 404 && res8.body.error === "Like not found", "DELETE already unliked like returns 404", res8);
    }

    // Step 11: Cascading deletes
    {
      runSeed();
      const rId = await findUserId("riya");
      const aId = await findUserId("arjun");

      // delete riya
      const delRiya = await request(baseUrl, `/users/${rId}`, { method: "DELETE" });
      assert(delRiya.status === 204, "DELETE riya returns 204", delRiya);

      const checkUsers = await request(baseUrl, "/users?limit=1");
      assert(checkUsers.body.meta.total === 11, "After deleting riya, users total is 11", checkUsers.body.meta);

      const checkPosts = await request(baseUrl, "/posts?limit=1");
      assert(checkPosts.body.meta.total === 17, "After deleting riya, posts total is 17 (7 posts deleted)", checkPosts.body.meta);

      const checkGoa = await request(baseUrl, "/posts?location=goa");
      assert(checkGoa.body.meta.total === 1, "After deleting riya, Goa posts total is 1 (insta10)", checkGoa.body.meta);

      const checkArjun = await request(baseUrl, `/users/${aId}`);
      assert(checkArjun.body._count.posts === 4 && checkArjun.body._count.likes === 2, "Arjun's like count dropped from 4 to 2 (cascaded from riya's deleted posts)", checkArjun.body._count);

      const checkRiyaPosts = await request(baseUrl, `/users/${rId}/posts`);
      assert(checkRiyaPosts.status === 404 && checkRiyaPosts.body.error === "User not found", "GET /users/<deleted>/posts returns 404", checkRiyaPosts);
    }

    // Step 12: GET /users/:id/liked-posts
    {
      runSeed();
      const rId = await findUserId("riya");
      const aId = await findUserId("arjun");
      const nId = await findUserId("neha");

      const res1 = await request(baseUrl, `/users/${rId}/liked-posts`);
      assert(res1.status === 200 && res1.body.meta.total === 4 && res1.body.meta.totalPages === 1, "GET /users/:id/liked-posts riya total = 4", res1.body.meta);

      const res2 = await request(baseUrl, `/users/${aId}/liked-posts?limit=2`);
      assert(res2.status === 200 && res2.body.data.length === 2 && res2.body.meta.total === 4 && res2.body.meta.totalPages === 2, "GET /users/:id/liked-posts arjun limit 2", res2.body.meta);

      const res3 = await request(baseUrl, `/users/${nId}/liked-posts`);
      assert(res3.status === 200 && res3.body.meta.total === 3, "GET /users/:id/liked-posts neha total = 3", res3.body.meta);

      const res4 = await request(baseUrl, "/users/999999/liked-posts");
      assert(res4.status === 404 && res4.body.error === "User not found", "GET /users/999999/liked-posts returns 404", res4);
    }

    // Finally reseed so the db is in clean seeded state
    runSeed();

  } finally {
    if (serverProcess) {
      serverProcess.kill();
    }
    console.log(`\n================ SUMMARY ================`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    if (failed > 0) {
      process.exit(1);
    }
  }
}

runTests().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
