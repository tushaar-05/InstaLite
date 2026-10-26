# Relations

We are continuing the **InstaLite** app. So far we have two tables, `User` and `Post`, and they don't know anything about each other 🤷

That's weird. On Instagram, every post **belongs to** someone, and people **like** each other's posts. Both of these are **relations** between rows.

In this lab we will:

1. Add **relations** to the schema - one one-to-many and one many-to-many.
2. **Seed** related data (which is harder than it sounds, because the `id`s change every time 😬).
3. **Read** related data - `include`, `select`, `_count` and relation filters.
4. **Write** related data - liking and unliking posts.
5. See what **cascading deletes** do when a user leaves.

## The relations we are adding

| Relation                 | Type                               | Meaning                                                  |
| ------------------------ | ---------------------------------- | -------------------------------------------------------- |
| `User` → `Post`          | One-to-many                        | A user writes many posts. A post has exactly one author  |
| `User` ↔ `Post` (`Like`) | Many-to-many (explicit join table) | A user likes many posts. A post is liked by many users   |

## What you will build

| Endpoint / Command                  | What's new                                                                 |
| ----------------------------------- | -------------------------------------------------------------------------- |
| `npx prisma db seed`                | Also seeds post authors and 29 likes                                       |
| `POST /posts`                       | Now needs an `authorId`                                                    |
| `GET /posts`                        | Each post includes its author and like count. New `sortBy=likes`           |
| `GET /posts/:id`                    | Includes the author and the like count                                     |
| `GET /users`                        | New filter: `hasPosts`                                                     |
| `GET /users/:id`                    | Includes post and like counts                                              |
| `GET /users/:id/posts`              | A user's posts, paginated                                                  |
| `GET /posts/:id/likes`              | Who liked this post                                                        |
| `POST /posts/:id/likes`             | Like a post                                                                |
| `DELETE /posts/:id/likes/:userId`   | Unlike a post                                                              |
| `GET /users/:id/liked-posts` (bonus)| Posts this user has liked                                                  |

All routes from the previous labs must keep working (with the small changes described in each step).

### The "user summary" shape

Whenever a user appears **inside** another object (a post's author, the list of people who liked a post), return **only** this:

```json
{ "id": 7, "username": "riya_travels", "fullname": "Riya Sharma" }
```

> Why not the whole user? Because the whole user has an `email` 📧. Nobody scrolling a post should get the author's email for free. **Use `select`, not `include`, for nested users.**

### Error messages

Use these **exact** messages:

| Situation                                      | Status | Body                                                                |
| ---------------------------------------------- | ------ | ------------------------------------------------------------------- |
| `POST /posts` without `imageUrl` or `authorId` | `400`  | `{ "error": "imageUrl and authorId are required" }`                 |
| Like without `userId`                          | `400`  | `{ "error": "userId is required" }`                                 |
| `hasPosts` is not `true` or `false`            | `400`  | `{ "error": "hasPosts must be true or false" }`                     |
| `sortBy` is not allowed (posts)                | `400`  | `{ "error": "sortBy must be one of: createdAt, updatedAt, likes" }` |
| A user in the URL **or** body doesn't exist    | `404`  | `{ "error": "User not found" }`                                     |
| A post in the URL doesn't exist                | `404`  | `{ "error": "Post not found" }`                                     |
| Unliking a post that isn't liked               | `404`  | `{ "error": "Like not found" }`                                     |
| Liking a post twice                            | `409`  | `{ "error": "Already liked" }`                                      |

All the error messages from the previous lab (`page and limit must be positive integers`, `isPrivate must be true or false`, etc.) stay as they are.

---

# Part A - The schema

> ⚠️ Our tables already have data in them, and we are about to add a **required** column. Read Step 01 carefully before running anything.

## Step 01 - One-to-many: `User` → `Post`

**Task:**

Update `prisma/schema.prisma`:

| Model  | Add                                                                           |
| ------ | ----------------------------------------------------------------------------- |
| `Post` | `authorId Int` (required) and a relation field `author` pointing to `User`    |
| `Post` | When the author is deleted, their posts are deleted too (`onDelete: Cascade`) |
| `Post` | An index on `authorId` (`@@index([authorId])`)                                |
| `User` | The other side of the relation: `posts Post[]`                                |

Then create a migration named `add_post_author`.

**Test:**

Run the migration **without** resetting first:

```sh
npx prisma migrate dev --name add_post_author
```

It fails (or warns you and refuses) 💥 **Read the message.** Why can't Prisma add a **required** `authorId` column to a table that already has 24 posts? What would those 24 posts get as their `authorId`?

Write your answer down, you'll need it in the viva 😏

We don't care about the old data (we have a seed script!), so wipe the database and apply all migrations from scratch:

```sh
npx prisma migrate reset
```

Then run the `migrate dev` command again. It should go through this time.

> If `migrate reset` tries to run your seed and it crashes, **ignore it for now**. The old seed creates posts without an author, which isn't allowed anymore. We fix the seed in Step 03.

> `POST /posts` from the previous lab is also broken now (it doesn't send an `authorId`). That's expected - we fix it in Step 04.

## Step 02 - Many-to-many: `Like`

A user can like many posts. A post can be liked by many users. That's **many-to-many**, and many-to-many needs a **join table** in between.

Prisma can create a hidden join table for you (implicit many-to-many), but we want to store **when** the like happened, so we make it **explicit**.

**Task:**

Add a `Like` model:

| Field       | Type / Rules                                                          |
| ----------- | --------------------------------------------------------------------- |
| `userId`    | `Int` → relation field `user` to `User`, cascade on delete            |
| `postId`    | `Int` → relation field `post` to `Post`, cascade on delete            |
| `createdAt` | `DateTime`, defaults to now                                           |
| Primary key | **Composite**: `@@id([userId, postId])` - there is **no** `id` column |

Add an index on `postId`.

On the other side, add `likes Like[]` to **both** `User` and `Post`.

Migration name: `add_likes`.

> ⚠️ The relation field names (`author`, `posts`, `likes`) are **not optional**. The expected `_count` outputs later in the lab use them as keys.

> Why a composite primary key? Because the same user liking the same post twice makes no sense. With `@@id([userId, postId])`, the **database itself** refuses the second like. You don't need to write a single line of JS to guarantee it. (You still need to send a nice `409` though, Step 10.)

> Why no separate index on `userId`? The composite primary key `(userId, postId)` already works as an index for queries that start with `userId`. Think about it 🤔

**Test:**

```sh
npx prisma migrate dev --name add_likes
npx prisma generate
npx prisma studio
```

You should see an empty `Like` table in Prisma Studio, and `prisma/migrations` should have **2** new folders from this lab.

---

# Part B - Seeding related data

## Step 03 - Seed data with relations

Here's the problem: the `id`s change every time we seed. So the seed data **can't** say `authorId: 3`. Instead, it says **who** the author is (by `username`) and which post (by its `insta##` key), and the seed script looks up the real `id`s.

**Task:**

1. Replace `prisma/seed-data.js` with the data below, **as it is**. The users and posts are the same as last lab, posts just have an `author` now.

```js:prisma/seed-data.js
const users = [
  { username: "riya_travels",  email: "riya@example.com",   fullname: "Riya Sharma",  bio: "Chasing sunsets 🌅",        isPrivate: false, createdAt: "2026-01-03T09:00:00.000Z" },
  { username: "arjun_clicks",  email: "arjun@example.com",  fullname: "Arjun Mehta",  bio: "Street photographer 📸",    isPrivate: false, createdAt: "2026-01-07T10:30:00.000Z" },
  { username: "meera.eats",    email: "meera@example.com",  fullname: "Meera Iyer",   bio: "Food first, always",        isPrivate: true,  createdAt: "2026-01-12T08:15:00.000Z" },
  { username: "kabir_sings",   email: "kabir@example.com",  fullname: "Kabir Khan",   bio: null,                        isPrivate: false, createdAt: "2026-01-18T19:45:00.000Z" },
  { username: "ananya_reads",  email: "ananya@example.com", fullname: "Ananya Rao",   bio: "Books & chai",              isPrivate: true,  createdAt: "2026-01-25T07:20:00.000Z" },
  { username: "rohan_runs",    email: "rohan@example.com",  fullname: "Rohan Desai",  bio: "Marathoner in training",    isPrivate: false, createdAt: "2026-02-02T06:00:00.000Z" },
  { username: "sara_sketches", email: "sara@example.com",   fullname: "Sara Thomas",  bio: null,                        isPrivate: false, createdAt: "2026-02-09T14:10:00.000Z" },
  { username: "vikram.trek",   email: "vikram@example.com", fullname: "Vikram Singh", bio: "Mountains > beaches",       isPrivate: false, createdAt: "2026-02-15T11:00:00.000Z" },
  { username: "neha_designs",  email: "neha@example.com",   fullname: "Neha Kapoor",  bio: "UI/UX designer",            isPrivate: true,  createdAt: "2026-02-21T16:30:00.000Z" },
  { username: "aditya_codes",  email: "aditya@example.com", fullname: "Aditya Verma", bio: "I write bugs for a living", isPrivate: false, createdAt: "2026-03-01T22:05:00.000Z" },
  { username: "isha_dances",   email: "isha@example.com",   fullname: "Isha Patel",   bio: null,                        isPrivate: false, createdAt: "2026-03-08T12:40:00.000Z" },
  { username: "dev_shoots",    email: "dev@example.com",    fullname: "Dev Malhotra", bio: "Wildlife photography",      isPrivate: true,  createdAt: "2026-03-15T05:55:00.000Z" },
];

// `author` is a username, NOT an id
const posts = [
  { author: "riya_travels",  imageUrl: "https://picsum.photos/seed/insta01/600/600", caption: "Sunset at Baga beach 🌅",          location: "Goa",        createdAt: "2026-02-01T18:30:00.000Z" },
  { author: "arjun_clicks",  imageUrl: "https://picsum.photos/seed/insta02/600/600", caption: "Cutting chai at the station",      location: "Mumbai",     createdAt: "2026-02-04T08:10:00.000Z" },
  { author: "vikram.trek",   imageUrl: "https://picsum.photos/seed/insta03/600/600", caption: "Snow everywhere ❄️",               location: "Manali",     createdAt: "2026-02-08T10:00:00.000Z" },
  { author: "riya_travels",  imageUrl: "https://picsum.photos/seed/insta04/600/600", caption: "Pink city vibes",                  location: "Jaipur",     createdAt: "2026-02-12T13:25:00.000Z" },
  { author: "arjun_clicks",  imageUrl: "https://picsum.photos/seed/insta05/600/600", caption: null,                               location: "Pune",       createdAt: "2026-02-15T07:45:00.000Z" },
  { author: "arjun_clicks",  imageUrl: "https://picsum.photos/seed/insta06/600/600", caption: "Marine Drive at night",            location: "Mumbai",     createdAt: "2026-02-19T21:00:00.000Z" },
  { author: "rohan_runs",    imageUrl: "https://picsum.photos/seed/insta07/600/600", caption: "Morning run done ✅",              location: null,         createdAt: "2026-02-23T06:30:00.000Z" },
  { author: "riya_travels",  imageUrl: "https://picsum.photos/seed/insta08/600/600", caption: "Lake Pichola sunset",              location: "Udaipur",    createdAt: "2026-02-27T17:50:00.000Z" },
  { author: "arjun_clicks",  imageUrl: "https://picsum.photos/seed/insta09/600/600", caption: "Shaniwar Wada on a Sunday",        location: "Pune",       createdAt: "2026-03-03T11:15:00.000Z" },
  { author: "meera.eats",    imageUrl: "https://picsum.photos/seed/insta10/600/600", caption: "Fish thali > everything",          location: "Goa",        createdAt: "2026-03-07T13:40:00.000Z" },
  { author: "vikram.trek",   imageUrl: "https://picsum.photos/seed/insta11/600/600", caption: "Trek to Hampta Pass begins",       location: "Manali",     createdAt: "2026-03-11T05:20:00.000Z" },
  { author: "sara_sketches", imageUrl: "https://picsum.photos/seed/insta12/600/600", caption: "New sketchbook, who dis",          location: null,         createdAt: "2026-03-15T15:05:00.000Z" },
  { author: "riya_travels",  imageUrl: "https://picsum.photos/seed/insta13/600/600", caption: "Hawa Mahal at sunrise",            location: "Jaipur",     createdAt: "2026-03-19T06:10:00.000Z" },
  { author: "meera.eats",    imageUrl: "https://picsum.photos/seed/insta14/600/600", caption: "Vada pav hunt 🍔",                 location: "Mumbai",     createdAt: "2026-03-23T19:30:00.000Z" },
  { author: "ananya_reads",  imageUrl: "https://picsum.photos/seed/insta15/600/600", caption: "Rainy day + chai + book",          location: "Pune",       createdAt: "2026-03-27T16:20:00.000Z" },
  { author: "riya_travels",  imageUrl: "https://picsum.photos/seed/insta16/600/600", caption: "Old Goa churches",                 location: "goa",        createdAt: "2026-03-31T10:50:00.000Z" },
  { author: "vikram.trek",   imageUrl: "https://picsum.photos/seed/insta17/600/600", caption: "Solang valley paragliding 🪂",     location: "Manali",     createdAt: "2026-04-04T12:00:00.000Z" },
  { author: "dev_shoots",    imageUrl: "https://picsum.photos/seed/insta18/600/600", caption: null,                               location: null,         createdAt: "2026-04-08T09:35:00.000Z" },
  { author: "riya_travels",  imageUrl: "https://picsum.photos/seed/insta19/600/600", caption: "City Palace details",              location: "Udaipur",    createdAt: "2026-04-12T14:45:00.000Z" },
  { author: "rohan_runs",    imageUrl: "https://picsum.photos/seed/insta20/600/600", caption: "Sunset from Sinhagad fort",        location: "Pune",       createdAt: "2026-04-16T18:15:00.000Z" },
  { author: "kabir_sings",   imageUrl: "https://picsum.photos/seed/insta21/600/600", caption: "Gateway of India, finally",        location: "Mumbai",     createdAt: "2026-04-20T08:55:00.000Z" },
  { author: "isha_dances",   imageUrl: "https://picsum.photos/seed/insta22/600/600", caption: "Dance practice behind the scenes", location: null,         createdAt: "2026-04-24T20:25:00.000Z" },
  { author: "riya_travels",  imageUrl: "https://picsum.photos/seed/insta23/600/600", caption: "Palolem beach mornings",           location: "Goa",        createdAt: "2026-04-28T07:05:00.000Z" },
  { author: "dev_shoots",    imageUrl: "https://picsum.photos/seed/insta24/600/600", caption: "Tiger spotted at Tadoba 🐅",       location: "Chandrapur", createdAt: "2026-05-02T06:40:00.000Z" },
];

// `user` (a username) likes `post` (the insta## key from the post's imageUrl)
const likes = [
  { user: "meera.eats",    post: "insta01" },
  { user: "vikram.trek",   post: "insta01" },
  { user: "arjun_clicks",  post: "insta01" },
  { user: "isha_dances",   post: "insta01" },
  { user: "neha_designs",  post: "insta01" },
  { user: "riya_travels",  post: "insta03" },
  { user: "rohan_runs",    post: "insta03" },
  { user: "arjun_clicks",  post: "insta08" },
  { user: "kabir_sings",   post: "insta08" },
  { user: "meera.eats",    post: "insta08" },
  { user: "riya_travels",  post: "insta10" },
  { user: "ananya_reads",  post: "insta10" },
  { user: "kabir_sings",   post: "insta10" },
  { user: "dev_shoots",    post: "insta13" },
  { user: "arjun_clicks",  post: "insta14" },
  { user: "meera.eats",    post: "insta15" },
  { user: "neha_designs",  post: "insta15" },
  { user: "aditya_codes",  post: "insta15" },
  { user: "rohan_runs",    post: "insta17" },
  { user: "isha_dances",   post: "insta17" },
  { user: "vikram.trek",   post: "insta20" },
  { user: "riya_travels",  post: "insta20" },
  { user: "neha_designs",  post: "insta22" },
  { user: "riya_travels",  post: "insta24" },
  { user: "aditya_codes",  post: "insta24" },
  { user: "vikram.trek",   post: "insta24" },
  { user: "arjun_clicks",  post: "insta24" },
  { user: "sara_sketches", post: "insta24" },
  { user: "rohan_runs",    post: "insta24" },
];

module.exports = { users, posts, likes };
```

2. Update `prisma/seed.js` so that it does the following, **in this order**:

| #   | What                                                                                                                      |
| --- | ------------------------------------------------------------------------------------------------------------------------- |
| 1   | Deletes **all** rows from all three tables. Children first: likes, then posts, then users                                 |
| 2   | Creates all users in **one** query, and gets the created rows back (with their `id`s)                                     |
| 3   | Builds a lookup: `username` → `id`                                                                                        |
| 4   | Creates all posts in **one** query, replacing `author` with the real `authorId`. Gets the created rows back               |
| 5   | Builds a lookup: `insta##` → post `id`                                                                                    |
| 6   | Creates all likes in **one** query (real `userId` and `postId`)                                                           |
| 7   | Prints `🌱 Seeded 12 users, 24 posts and 29 likes` - all numbers from what the queries returned                          |
| 8   | Same as last lab: disconnect when done (success **or** failure), print the error and exit with code `1` if anything fails |

> 💡 **Hints:**
> - `createMany` only returns `{ count }`. You need the **rows** back. Look for its sibling, `createManyAndReturn` 👀
> - The `insta##` key is hiding inside the `imageUrl`: `"https://picsum.photos/seed/insta01/600/600".split("/")` - which index is it?
> - Don't pass the `author` / `user` / `post` string fields to Prisma. Prisma doesn't know what they are and will throw. Map each row into the shape the table expects.
> - A `Map` or a plain object works fine for the lookups.

> 🤔 **Think:** We set `onDelete: Cascade` everywhere. That means `deleteMany()` on `User` alone would wipe all three tables. So why do we still delete children first? (Hint: what if someone later changes one relation to `Restrict`?)

**Test:**

```sh
npm run seed
npm run seed
npm run seed
```

| Check                       | Expected                                     |
| --------------------------- | -------------------------------------------- |
| Each run prints             | `🌱 Seeded 12 users, 24 posts and 29 likes` |
| Prisma Studio after 3 runs  | 12 users, 24 posts, 29 likes                 |
| Prisma Studio, `Post` table | Every post has an `authorId`                 |

> From now on, **re-seed before testing any step.** Like last lab, the expected results identify users by `username` and posts by `insta##`, never by `id`.

---

# Part C - Reading related data

> 🔎 **Finding `id`s for the tests:** the tests below use placeholders like `<RIYA_ID>` or `<INSTA01_ID>`. Use the filters you built last lab to find them after seeding:
>
> ```sh
> curl -s "localhost:3000/users?search=riya"                       # → <RIYA_ID>
> curl -s "localhost:3000/posts?search=baga"                       # → <INSTA01_ID>
> curl -s "localhost:3000/posts?search=tiger"                      # → <INSTA24_ID>
> curl -s "localhost:3000/posts?location=pune&order=asc&limit=1"   # → <INSTA05_ID>
> ```

## Step 04 - `POST /posts` needs an author

**Task:**

Update `POST /posts` and `PATCH /posts/:id`:

| Aspect                           | Requirement                                                                                   |
| -------------------------------- | --------------------------------------------------------------------------------------------- |
| Accepted body fields             | `imageUrl`, `authorId` (required); `caption`, `location` (optional)                           |
| `imageUrl` or `authorId` missing | `400` with `{ "error": "imageUrl and authorId are required" }`                                |
| No user with that `authorId`     | `404` with `{ "error": "User not found" }`                                                    |
| Success                          | `201` with the created post                                                                   |
| `PATCH /posts/:id`               | `authorId` is **not** editable - silently ignored if sent (you can't steal someone's post 🙅) |

> 💡 There are two ways to detect a missing author: check that the user exists **before** creating, or let the database complain and catch the error (look up Prisma error codes `P2003` and `P2025`). Either is fine. Can you say which one needs fewer queries?

**Test:**

```sh
# 1
curl -i -X POST localhost:3000/posts -H "Content-Type: application/json" \
  -d '{"imageUrl":"https://picsum.photos/seed/new01/600/600","caption":"First post!","authorId":<RIYA_ID>}'
# 2
curl -i -X POST localhost:3000/posts -H "Content-Type: application/json" \
  -d '{"imageUrl":"https://picsum.photos/seed/new02/600/600"}'
# 3
curl -i -X POST localhost:3000/posts -H "Content-Type: application/json" \
  -d '{"imageUrl":"https://picsum.photos/seed/new03/600/600","authorId":999999}'
# 4
curl -i -X PATCH localhost:3000/posts/<INSTA01_ID> -H "Content-Type: application/json" \
  -d '{"caption":"Baga, again 🌅","authorId":<ARJUN_ID>}'
```

**Expected Results:**

| #   | Status | Body                                                |
| --- | ------ | --------------------------------------------------- |
| 1   | `201`  | The new post, with `authorId` equal to riya's id    |
| 2   | `400`  | `{ "error": "imageUrl and authorId are required" }` |
| 3   | `404`  | `{ "error": "User not found" }`                     |
| 4   | `200`  | Caption changed, `authorId` is **still** riya's id  |

## Step 05 - `GET /posts/:id` with its author and like count

**Task:**

`GET /posts/:id` must now return the post **with**:

| Key      | Content                                     |
| -------- | ------------------------------------------- |
| `author` | User summary (`id`, `username`, `fullname`) |
| `_count` | `{ likes }`                                 |

The `404` case stays as it was. Everything must come from **one** Prisma query.

Expected shape (ids will differ):

```json
{
  "id": 101,
  "imageUrl": "https://picsum.photos/seed/insta01/600/600",
  "caption": "Sunset at Baga beach 🌅",
  "location": "Goa",
  "authorId": 37,
  "createdAt": "2026-02-01T18:30:00.000Z",
  "updatedAt": "...",
  "author": { "id": 37, "username": "riya_travels", "fullname": "Riya Sharma" },
  "_count": { "likes": 5 }
}
```

> 💡 You can mix `include` and `select` at different levels. `include` = "all the fields, plus these relations". `select` = "only these fields". Which one do you want for `author`?

**Test:**

```sh
# 1
curl -s localhost:3000/posts/<INSTA01_ID>
# 2
curl -s localhost:3000/posts/<INSTA24_ID>
# 3
curl -s localhost:3000/posts/<INSTA05_ID>
# 4
curl -i localhost:3000/posts/999999
```

**Expected Results:**

| #   | Status | `author.username`               | `_count`         |
| --- | ------ | ------------------------------- | ---------------- |
| 1   | `200`  | `riya_travels`                  | `{ likes: 5 }`   |
| 2   | `200`  | `dev_shoots`                    | `{ likes: 6 }`   |
| 3   | `200`  | `arjun_clicks`                  | `{ likes: 0 }`   |
| 4   | `404`  | `{ "error": "Post not found" }` |                  |

**Check:** there must be **no** `email` anywhere in the response.

## Step 06 - `GET /posts` with authors, like counts and `sortBy=likes`

**Task:**

1. Every post in `GET /posts` must now include `author` (user summary) and `_count: { likes }`.
2. Add `likes` as an allowed `sortBy` value: sort by **number of likes**. When two posts have the same number of likes, the **newer** post comes first (always, whatever the `order`).
3. Update the error message for `sortBy`: `{ "error": "sortBy must be one of: createdAt, updatedAt, likes" }`.
4. All filters, pagination and the single transaction from the previous lab must keep working.

> 💡 Prisma can `orderBy` a relation's count: `{ likes: { _count: "desc" } }`. And `orderBy` also accepts an **array** for tie-breakers.

> 🤔 **Think:** Without `include`, a beginner would do this: fetch 10 posts, then loop over them and run `prisma.user.findUnique` for each author and `prisma.like.count` for each post. How many queries is that for one page? This is called the **N+1 problem**. How many queries does Prisma's `include` + `_count` need?

**Test:**

```sh
# 1
curl -s "localhost:3000/posts?limit=2"
# 2
curl -s "localhost:3000/posts?sortBy=likes&limit=5"
# 3
curl -s "localhost:3000/posts?sortBy=likes&order=asc&limit=3"
# 4
curl -s "localhost:3000/posts?location=goa&sortBy=likes"
# 5
curl -i "localhost:3000/posts?sortBy=comments"
```

**Expected Results:**

| #   | Status | `data` (`insta##`, in order)                                        | Notes                                                                                    |
| --- | ------ | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 1   | `200`  | `insta24`, `insta23`                                                | `insta24` → author `dev_shoots`, `{ likes: 6 }`. `insta23` → author `riya_travels`, `{ likes: 0 }` |
| 2   | `200`  | `insta24`, `insta01`, `insta15`, `insta10`, `insta08`               | Likes: 6, 5, 3, 3, 3. The three 3s are newest first                                      |
| 3   | `200`  | `insta23`, `insta21`, `insta19`                                     | All have 0 likes, so newest first                                                        |
| 4   | `200`  | `insta01`, `insta10`, `insta23`, `insta16`                          | `meta.total` = `4`                                                                       |
| 5   | `400`  | `{ "error": "sortBy must be one of: createdAt, updatedAt, likes" }` |                                                                                          |

## Step 07 - `GET /users/:id` with counts, and the `hasPosts` filter

**Task:**

1. `GET /users/:id` must now include `_count: { posts, likes }` (`likes` = how many posts this user has liked).
2. `GET /users` gets a new optional filter:

| Query param | Rules                                                                                                                                                       |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `hasPosts`  | `true` → only users with **at least one** post. `false` → only users with **no** posts. Anything else → `400` `{ "error": "hasPosts must be true or false" }` |

It must work together with `isPrivate`, `search`, sorting and pagination.

> 💡 Filtering on a relation: look up `some`, `none` and `every` in the Prisma docs.

**Test:**

```sh
# 1
curl -s localhost:3000/users/<RIYA_ID>
# 2
curl -s localhost:3000/users/<DEV_ID>
# 3
curl -s localhost:3000/users/<ADITYA_ID>
# 4
curl -s "localhost:3000/users?hasPosts=false"
# 5
curl -s "localhost:3000/users?hasPosts=true"
# 6
curl -s "localhost:3000/users?hasPosts=true&isPrivate=true"
# 7
curl -i "localhost:3000/users?hasPosts=yes"
```

**Expected Results:**

| #   | Status | Result                                                          |
| --- | ------ | --------------------------------------------------------------- |
| 1   | `200`  | `riya_travels`, `_count`: `{ posts: 7, likes: 4 }`              |
| 2   | `200`  | `dev_shoots`, `_count`: `{ posts: 2, likes: 1 }`                |
| 3   | `200`  | `aditya_codes`, `_count`: `{ posts: 0, likes: 2 }`              |
| 4   | `200`  | `aditya_codes`, `neha_designs` - `meta.total` = `2`             |
| 5   | `200`  | 10 users - `meta.total` = `10`                                  |
| 6   | `200`  | `dev_shoots`, `ananya_reads`, `meera.eats` - `meta.total` = `3` |
| 7   | `400`  | `{ "error": "hasPosts must be true or false" }`                 |

> If riya shows `likes: 5`, you're counting likes **on her posts**, not likes **she gave**. `User.likes` is the list of Like rows where she is the `user`.

## Step 08 - `GET /users/:id/posts`

**Task:**

Add `GET /users/:id/posts` - all posts by one user, **newest first**, paginated with the **same** `{ data, meta }` shape and the **same** `page` / `limit` rules as `GET /posts`. Each post includes `_count: { likes }` (no `author` - we already know who it is).

| Case                 | Status | Body                            |
| -------------------- | ------ | ------------------------------- |
| User exists          | `200`  | `{ data, meta }`                |
| User has no posts    | `200`  | `data: []`, `meta.total` `0`    |
| No user with that id | `404`  | `{ "error": "User not found" }` |

> 💡 You now validate `page` / `limit` in **three** places. Time for a small refactor: move that validation into `src/utils/pagination.js` and use it from all three controllers. Don't copy-paste it a third time 🙏

**Test:**

```sh
# 1
curl -s "localhost:3000/users/<RIYA_ID>/posts?limit=3"
# 2
curl -s "localhost:3000/users/<RIYA_ID>/posts?limit=3&page=3"
# 3
curl -s "localhost:3000/users/<ADITYA_ID>/posts"
# 4
curl -i "localhost:3000/users/999999/posts"
# 5
curl -i "localhost:3000/users/<RIYA_ID>/posts?page=0"
```

**Expected Results:**

| #   | Status | `data` (`insta##`, in order)                              | `meta`                                            |
| --- | ------ | --------------------------------------------------------- | ------------------------------------------------- |
| 1   | `200`  | `insta23`, `insta19`, `insta16`                           | `{ page: 1, limit: 3, total: 7, totalPages: 3 }`  |
| 2   | `200`  | `insta01`                                                 | `{ page: 3, limit: 3, total: 7, totalPages: 3 }`  |
| 3   | `200`  | `[]`                                                      | `{ page: 1, limit: 10, total: 0, totalPages: 0 }` |
| 4   | `404`  | `{ "error": "User not found" }`                           |                                                   |
| 5   | `400`  | `{ "error": "page and limit must be positive integers" }` |                                                   |

## Step 09 - `GET /posts/:id/likes` - who liked this?

**Task:**

Add `GET /posts/:id/likes`. It returns a JSON **array** (not paginated) of **user summaries** of everyone who liked the post, sorted by `username` ascending.

| Case                     | Status | Body                            |
| ------------------------ | ------ | ------------------------------- |
| Post exists              | `200`  | Array of user summaries         |
| Post exists, no likes    | `200`  | `[]`                            |
| No post with that id     | `404`  | `{ "error": "Post not found" }` |

> 💡 Two ways to do this: query the `Like` table and pull out the nested `user`, **or** query the `User` table with a relation filter (`likes: { some: ... }`). Try both, keep the one you find more readable.

**Test:**

```sh
# 1
curl -s localhost:3000/posts/<INSTA01_ID>/likes
# 2
curl -s localhost:3000/posts/<INSTA24_ID>/likes
# 3
curl -s localhost:3000/posts/<INSTA05_ID>/likes
# 4
curl -i localhost:3000/posts/999999/likes
```

**Expected Results:**

| #   | Status | Usernames, in order                                                                       |
| --- | ------ | ----------------------------------------------------------------------------------------- |
| 1   | `200`  | `arjun_clicks`, `isha_dances`, `meera.eats`, `neha_designs`, `vikram.trek`                |
| 2   | `200`  | `aditya_codes`, `arjun_clicks`, `riya_travels`, `rohan_runs`, `sara_sketches`, `vikram.trek` |
| 3   | `200`  | `[]`                                                                                      |
| 4   | `404`  | `{ "error": "Post not found" }`                                                           |

---

# Part D - Writing related data

## Step 10 - Like and unlike

New files: `src/services/likes.service.js` and `src/controllers/likes.controller.js`. Add the routes in `posts.routes.js`.

**Task:**

**`POST /posts/:id/likes`**

| Aspect                     | Requirement                                         |
| -------------------------- | --------------------------------------------------- |
| Body                       | `{ "userId": <id> }` (required)                     |
| `userId` missing           | `400` with `{ "error": "userId is required" }`      |
| No post with that id       | `404` with `{ "error": "Post not found" }`          |
| No user with that `userId` | `404` with `{ "error": "User not found" }`          |
| Already liked              | `409` with `{ "error": "Already liked" }`           |
| Success                    | `201` with the like `{ userId, postId, createdAt }` |

Check in this order: `400` → post `404` → user `404` → `409`.

**`DELETE /posts/:id/likes/:userId`**

| Case           | Status | Body                            |
| -------------- | ------ | ------------------------------- |
| Unliked        | `204`  | Empty                           |
| Like not found | `404`  | `{ "error": "Like not found" }` |

> 💡 For the `409`: don't check "does this like exist?" before inserting. Just insert and catch the unique-constraint error (`P2002`) - your composite primary key from Step 02 does the work. Why is "check first, then insert" buggy when two requests arrive at the same time? 🏎️🏎️
>
> 💡 For the delete: a composite key is addressed in Prisma as `where: { userId_postId: { userId, postId } }`.

**Test:**

```sh
# 1
curl -i -X POST localhost:3000/posts/<INSTA05_ID>/likes -H "Content-Type: application/json" -d '{"userId":<RIYA_ID>}'
# 2
curl -i -X POST localhost:3000/posts/<INSTA05_ID>/likes -H "Content-Type: application/json" -d '{"userId":<RIYA_ID>}'
# 3
curl -i -X POST localhost:3000/posts/<INSTA05_ID>/likes -H "Content-Type: application/json" -d '{}'
# 4
curl -i -X POST localhost:3000/posts/999999/likes -H "Content-Type: application/json" -d '{"userId":<RIYA_ID>}'
# 5
curl -i -X POST localhost:3000/posts/<INSTA05_ID>/likes -H "Content-Type: application/json" -d '{"userId":999999}'
# 6
curl -s localhost:3000/posts/<INSTA05_ID>
# 7
curl -s localhost:3000/posts/<INSTA05_ID>/likes
# 8
curl -i -X DELETE localhost:3000/posts/<INSTA05_ID>/likes/<RIYA_ID>
# 9
curl -i -X DELETE localhost:3000/posts/<INSTA05_ID>/likes/<RIYA_ID>
```

**Expected Results:**

| #   | Status | Body                                |
| --- | ------ | ----------------------------------- |
| 1   | `201`  | `{ userId, postId, createdAt }`     |
| 2   | `409`  | `{ "error": "Already liked" }`      |
| 3   | `400`  | `{ "error": "userId is required" }` |
| 4   | `404`  | `{ "error": "Post not found" }`     |
| 5   | `404`  | `{ "error": "User not found" }`     |
| 6   | `200`  | `_count.likes` is `1`               |
| 7   | `200`  | `riya_travels`                      |
| 8   | `204`  | Empty                               |
| 9   | `404`  | `{ "error": "Like not found" }`     |

---

# Part E - Cascading deletes

## Step 11 - What happens when riya leaves?

Riya has written 7 posts (which have 9 likes between them), and she has liked 4 posts herself. What happens to all of that when we delete her?

You don't need to write any code for this step - `onDelete: Cascade` already did the work. You just need to **prove** it.

**Task:**

1. `npm run seed`
2. Note down `<RIYA_ID>`, `<ARJUN_ID>`, `<INSTA10_ID>` and `<INSTA24_ID>` (riya is about to disappear, so get her id now).
3. Delete riya: `curl -i -X DELETE localhost:3000/users/<RIYA_ID>`
4. Run the tests below.

**Test:**

```sh
# 1
curl -s "localhost:3000/users?limit=1"
# 2
curl -s "localhost:3000/posts?limit=1"
# 3
curl -s "localhost:3000/posts?location=goa"
# 4
curl -s "localhost:3000/posts?sortBy=likes&limit=3"
# 5
curl -s localhost:3000/posts/<INSTA10_ID>/likes
# 6
curl -s localhost:3000/posts/<INSTA24_ID>/likes
# 7
curl -s localhost:3000/users/<ARJUN_ID>
# 8
curl -i localhost:3000/users/<RIYA_ID>/posts
```

**Expected Results:**

| #   | Status | Result                                                                        | Why                                                    |
| --- | ------ | ----------------------------------------------------------------------------- | ------------------------------------------------------ |
| 1   | `200`  | `meta.total` = `11`                                                           | Riya is gone                                           |
| 2   | `200`  | `meta.total` = `17`                                                           | Her 7 posts are gone                                   |
| 3   | `200`  | Only `insta10`                                                                | `insta01`, `insta16`, `insta23` were hers              |
| 4   | `200`  | `insta24` (5 likes), `insta15` (3), `insta17` (2)                             | `insta01` is gone, and riya's like on `insta24` is gone |
| 5   | `200`  | `ananya_reads`, `kabir_sings`                                                 | Riya's like is gone                                    |
| 6   | `200`  | `aditya_codes`, `arjun_clicks`, `rohan_runs`, `sara_sketches`, `vikram.trek`  | Same                                                   |
| 7   | `200`  | `_count`: `{ posts: 4, likes: 2 }` (was `4` / `4`)                            | Arjun liked `insta01` and `insta08`, which were riya's posts. Those likes went with the posts |
| 8   | `404`  | `{ "error": "User not found" }`                                               |                                                        |

> Look at test 7 carefully. Arjun did **nothing**, and his like count dropped from 4 to 2. Cascades travel **two levels** here: user → her posts → the likes on those posts. 🌊

> 🤔 **Experiment (optional, but do it):** In the schema, change the `Post.author` relation to `onDelete: Restrict`, migrate, seed, and try to delete riya again. What status code does your API return? What did Prisma throw? Which behaviour would you want for a real app - and would your answer change for a **bank** app where a "post" is a **transaction**? Change it back to `Cascade` when you're done.

---

# Part F - Bonus

## Step 12 - `GET /users/:id/liked-posts` 🔥

Instagram has a "Posts you've liked" screen. Let's build it.

**Task:**

Add `GET /users/:id/liked-posts` - all posts that `:id` has liked, **newest post first** (by the post's `createdAt`), each with `author` (user summary) and `_count: { likes }`. Paginated with the usual `{ data, meta }` and the usual `page` / `limit` rules. `404` `{ "error": "User not found" }` if the user doesn't exist.

Query the **`Post`** table, not the `Like` table. **One** `findMany` + **one** `count`, in a transaction. No loops, no "first get the post ids from the likes, then...".

> 💡 This is the same relation filter as `hasPosts`, but pointed the other way: a post's `likes` has `some` row whose `userId` is...? 🧩

**Test:**

```sh
# 1
curl -s "localhost:3000/users/<RIYA_ID>/liked-posts"
# 2
curl -s "localhost:3000/users/<ARJUN_ID>/liked-posts?limit=2"
# 3
curl -s "localhost:3000/users/<NEHA_ID>/liked-posts"
# 4  create a brand new user first, then:
curl -s "localhost:3000/users/<NEW_USER_ID>/liked-posts"
# 5
curl -i "localhost:3000/users/999999/liked-posts"
```

**Expected Results:**

| #   | Status | `data` (`insta##`, in order)             | `meta.total` / `meta.totalPages` |
| --- | ------ | ---------------------------------------- | -------------------------------- |
| 1   | `200`  | `insta24`, `insta20`, `insta10`, `insta03` | `4` / `1`                      |
| 2   | `200`  | `insta24`, `insta14`                     | `4` / `2`                        |
| 3   | `200`  | `insta22`, `insta15`, `insta01`          | `3` / `1`                        |
| 4   | `200`  | `[]`                                     | `0` / `0`                        |
| 5   | `404`  | `{ "error": "User not found" }`          |                                  |

## Step 13 - Final test run

**Task:**

1. `npm run seed`
2. Restart the server.
3. Run every test from Step 04 to Step 12, in order. **Re-seed before Step 11** (it deletes riya!) and again **after** it.
4. Run a few tests from the **previous two labs** too. Nothing should be broken.

**Viva questions** - be ready to answer these:

1. Why did the first `migrate dev` in Step 01 fail?
2. Why does `Like` have no `id` column? What stops a user from liking the same post twice?
3. Why did we make the join table **explicit** instead of letting Prisma create an implicit one?
4. `include` vs `select` - when do you use which? Why did we use `select` for `author`?
5. What is the N+1 problem, and how did `include` / `_count` avoid it?
6. Why catch `P2002` instead of checking "does it exist?" before inserting?
7. In Step 11, why did arjun's like count change when **riya** was deleted?
8. `Cascade` vs `Restrict` - which one would you choose for posts? For bank transactions?

**Final folder structure (new / changed files marked):**

```txt
prisma/
  schema.prisma           ← changed (Post.author, Like)
  migrations/             ← 2 new migrations
  seed-data.js            ← changed
  seed.js                 ← changed
src/
  index.js
  db.js
  utils/
    pagination.js         ← new
  routes/
    users.routes.js       ← changed
    posts.routes.js       ← changed
  controllers/
    users.controller.js   ← changed
    posts.controller.js   ← changed
    likes.controller.js   ← new
  services/
    users.service.js      ← changed
    posts.service.js      ← changed
    likes.service.js      ← new
prisma.config.js
package.json
```
