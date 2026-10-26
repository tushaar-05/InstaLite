# Seeding, Filtering, Sorting & Pagination

We are continuing the **InstaLite** app. In the previous lab we built full CRUD for `User` and `Post` using the MVC structure (routes → controllers → services).

But look at our `GET /users` and `GET /posts` again. They return **every single row** in the table. That's fine with 5 rows. Real Instagram has billions of posts. Nobody loads all of them in one request 😵

In this lab we will:

1. **Seed** the database with a fixed set of realistic data, so everyone has the same data to test against.
2. Add **pagination** - return the data one page at a time.
3. Add **sorting** - let the client choose the order.
4. Add **filtering** - let the client ask only for the rows they care about.

> No schema changes in this lab. No new migrations. We only use the `User` and `Post` tables you already have.

## What you will build

| Endpoint / Command   | What's new                                                          |
| -------------------- | ------------------------------------------------------------------- |
| `npx prisma db seed` | Wipes both tables and fills them with 12 users and 24 posts         |
| `GET /users`         | Pagination + sorting + filtering (`isPrivate`, `search`)            |
| `GET /posts`         | Pagination + sorting + filtering (`location`, `search`, date range) |

All the other routes from the previous lab (`POST`, `GET /:id`, `PATCH`, `DELETE`) stay exactly as they are and must keep working.

## The new response shape (read this once, use it for both)

From Step 04 onwards, `GET /users` and `GET /posts` will **no longer return a plain array**. They return an object like this:

```json
{
  "data": [ { "...": "..." }, { "...": "..." } ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 12,
    "totalPages": 2
  }
}
```

| Field             | Meaning                                                                 |
| ----------------- | ----------------------------------------------------------------------- |
| `data`            | The rows on **this** page                                               |
| `meta.page`       | The page number that was returned                                       |
| `meta.limit`      | How many rows per page were used                                        |
| `meta.total`      | Total number of rows that match the filters (**not** just on this page) |
| `meta.totalPages` | `total / limit`, rounded **up**                                         |

Yes, this is a breaking change for anyone who was using these routes as arrays. That's on purpose. Welcome to API versioning problems 🙃

### Error messages

Use these **exact** messages. Every invalid query parameter gets a `400`:

| Situation                                   | Body                                                                  |
| ------------------------------------------- | --------------------------------------------------------------------- |
| `page` or `limit` is not a positive integer | `{ "error": "page and limit must be positive integers" }`             |
| `sortBy` is not allowed (users)             | `{ "error": "sortBy must be one of: createdAt, username, fullname" }` |
| `sortBy` is not allowed (posts)             | `{ "error": "sortBy must be one of: createdAt, updatedAt" }`          |
| `order` is not `asc` or `desc`              | `{ "error": "order must be asc or desc" }`                            |
| `isPrivate` is not `true` or `false`        | `{ "error": "isPrivate must be true or false" }`                      |
| `from` or `to` is not a valid date          | `{ "error": "from and to must be valid dates" }`                      |

---

# Part A - Seeding

Till now, we created users and posts one by one with `curl`. Every student has different data, so "it works on my machine" is impossible to verify.

**Seeding** = a script that puts a known set of data into the database. Run it, and everyone has the exact same rows.

## Step 01 - The seed data file

**Task:**

1. Create `prisma/seed-data.js`.
2. Paste the data below into it **as it is**. Don't change anything, the expected results in this lab depend on this exact data.

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

const posts = [
  { imageUrl: "https://picsum.photos/seed/insta01/600/600", caption: "Sunset at Baga beach 🌅",          location: "Goa",        createdAt: "2026-02-01T18:30:00.000Z" },
  { imageUrl: "https://picsum.photos/seed/insta02/600/600", caption: "Cutting chai at the station",      location: "Mumbai",     createdAt: "2026-02-04T08:10:00.000Z" },
  { imageUrl: "https://picsum.photos/seed/insta03/600/600", caption: "Snow everywhere ❄️",               location: "Manali",     createdAt: "2026-02-08T10:00:00.000Z" },
  { imageUrl: "https://picsum.photos/seed/insta04/600/600", caption: "Pink city vibes",                  location: "Jaipur",     createdAt: "2026-02-12T13:25:00.000Z" },
  { imageUrl: "https://picsum.photos/seed/insta05/600/600", caption: null,                               location: "Pune",       createdAt: "2026-02-15T07:45:00.000Z" },
  { imageUrl: "https://picsum.photos/seed/insta06/600/600", caption: "Marine Drive at night",            location: "Mumbai",     createdAt: "2026-02-19T21:00:00.000Z" },
  { imageUrl: "https://picsum.photos/seed/insta07/600/600", caption: "Morning run done ✅",              location: null,         createdAt: "2026-02-23T06:30:00.000Z" },
  { imageUrl: "https://picsum.photos/seed/insta08/600/600", caption: "Lake Pichola sunset",              location: "Udaipur",    createdAt: "2026-02-27T17:50:00.000Z" },
  { imageUrl: "https://picsum.photos/seed/insta09/600/600", caption: "Shaniwar Wada on a Sunday",        location: "Pune",       createdAt: "2026-03-03T11:15:00.000Z" },
  { imageUrl: "https://picsum.photos/seed/insta10/600/600", caption: "Fish thali > everything",          location: "Goa",        createdAt: "2026-03-07T13:40:00.000Z" },
  { imageUrl: "https://picsum.photos/seed/insta11/600/600", caption: "Trek to Hampta Pass begins",       location: "Manali",     createdAt: "2026-03-11T05:20:00.000Z" },
  { imageUrl: "https://picsum.photos/seed/insta12/600/600", caption: "New sketchbook, who dis",          location: null,         createdAt: "2026-03-15T15:05:00.000Z" },
  { imageUrl: "https://picsum.photos/seed/insta13/600/600", caption: "Hawa Mahal at sunrise",            location: "Jaipur",     createdAt: "2026-03-19T06:10:00.000Z" },
  { imageUrl: "https://picsum.photos/seed/insta14/600/600", caption: "Vada pav hunt 🍔",                 location: "Mumbai",     createdAt: "2026-03-23T19:30:00.000Z" },
  { imageUrl: "https://picsum.photos/seed/insta15/600/600", caption: "Rainy day + chai + book",          location: "Pune",       createdAt: "2026-03-27T16:20:00.000Z" },
  { imageUrl: "https://picsum.photos/seed/insta16/600/600", caption: "Old Goa churches",                 location: "goa",        createdAt: "2026-03-31T10:50:00.000Z" },
  { imageUrl: "https://picsum.photos/seed/insta17/600/600", caption: "Solang valley paragliding 🪂",     location: "Manali",     createdAt: "2026-04-04T12:00:00.000Z" },
  { imageUrl: "https://picsum.photos/seed/insta18/600/600", caption: null,                               location: null,         createdAt: "2026-04-08T09:35:00.000Z" },
  { imageUrl: "https://picsum.photos/seed/insta19/600/600", caption: "City Palace details",              location: "Udaipur",    createdAt: "2026-04-12T14:45:00.000Z" },
  { imageUrl: "https://picsum.photos/seed/insta20/600/600", caption: "Sunset from Sinhagad fort",        location: "Pune",       createdAt: "2026-04-16T18:15:00.000Z" },
  { imageUrl: "https://picsum.photos/seed/insta21/600/600", caption: "Gateway of India, finally",        location: "Mumbai",     createdAt: "2026-04-20T08:55:00.000Z" },
  { imageUrl: "https://picsum.photos/seed/insta22/600/600", caption: "Dance practice behind the scenes", location: null,         createdAt: "2026-04-24T20:25:00.000Z" },
  { imageUrl: "https://picsum.photos/seed/insta23/600/600", caption: "Palolem beach mornings",           location: "Goa",        createdAt: "2026-04-28T07:05:00.000Z" },
  { imageUrl: "https://picsum.photos/seed/insta24/600/600", caption: "Tiger spotted at Tadoba 🐅",       location: "Chandrapur", createdAt: "2026-05-02T06:40:00.000Z" },
];

module.exports = { users, posts };
```

> Yes, post `insta16` has `location: "goa"` in lowercase. That's not a typo. You'll see why in Step 08 😏

**Test:**

Nothing to test yet. It's just data.

## Step 02 - The seed script

**Task:**

Create `prisma/seed.js` that does the following, **in this order**:

1. Imports the Prisma Client from `src/db.js` (the one you created last lab - don't create a new client).
2. Imports `users` and `posts` from `prisma/seed-data.js`.
3. **Deletes all posts**, then **deletes all users**.
4. Creates all 12 users in **one** query.
5. Creates all 24 posts in **one** query.
6. Prints `🌱 Seeded 12 users and 24 posts` - the numbers must come from what the create queries returned, not hardcoded.
7. Disconnects the Prisma Client when done, **whether the seed succeeded or failed**.
8. If anything fails, prints the error and exits with exit code `1`.

**Test:**

```sh
node prisma/seed.js
```

You should see `🌱 Seeded 12 users and 24 posts`.

Now start the server and hit your **old** `GET /users` and `GET /posts` from the previous lab. You should get an array of 12 users and an array of 24 posts.

## Step 03 - Register the seed command with Prisma

Running `node prisma/seed.js` works, but Prisma has a standard way to run seed scripts: `npx prisma db seed`. Every Prisma project uses this, so anyone joining your project knows how to seed without reading your code.

**Task:**

1. Tell Prisma about your seed script in your Prisma config file (the `prisma.config.js` / `prisma7.config.js` you already have).
2. Add an npm script `"seed"` in `package.json` that runs `prisma db seed`.

**Test:**

```sh
npx prisma db seed
npm run seed
npm run seed
```

| Check                                              | Expected                          |
| -------------------------------------------------- | --------------------------------- |
| Each command prints                                | `🌱 Seeded 12 users and 24 posts` |
| After running it **3 times**, `GET /users` returns | **12** users, not 36              |
| After running it **3 times**, `GET /posts` returns | **24** posts, not 72              |

If you got 36 users (or a unique constraint error 💥), go back and check Step 02.3.

> From now on, **re-seed before testing any step**. The expected results below assume a freshly seeded database. (Did a `DELETE` test eat one of your users? Just `npm run seed` again.)

> ⚠️ The `id`s will be different every time you seed (auto-increment never goes back). That's why the expected results below identify users by `username` and posts by the `insta##` part of their `imageUrl` - never by `id`.

---

# Part B - Paginate, sort and filter `GET /users`

You work in the MVC structure you built in the previous lab:

- the **route** stays one line,
- the **controller** reads and validates `req.query`, calls the service, sends the response,
- the **service** talks to Prisma and does not touch `req` or `res`.

## Step 04 - Pagination on `GET /users`

**Task:**

Update `GET /users` to support pagination.

| Query param | Default | Rules                                                                                   |
| ----------- | ------- | --------------------------------------------------------------------------------------- |
| `page`      | `1`     | Must be a positive integer (`1`, `2`, `3` ... not `0`, `-1`, `1.5`, `abc`)              |
| `limit`     | `10`    | Must be a positive integer. If it's more than `50`, use `50` (don't error, just cap it) |

| Aspect                         | Requirement                                                                     |
| ------------------------------ | ------------------------------------------------------------------------------- |
| Default order                  | Newest first (`createdAt` descending)                                           |
| Response                       | `200` with `{ data, meta }` (see "The new response shape" above)                |
| `page` is beyond the last page | `200` with `data: []` - this is **not** an error. `meta.total` is still correct |
| Invalid `page` / `limit`       | `400` with `{ "error": "page and limit must be positive integers" }`            |
| Number of DB round trips       | The users and the total count must be fetched in a **single transaction**       |

**Test:**

```sh
# 1
curl -s "localhost:3000/users"
# 2
curl -s "localhost:3000/users?page=2"
# 3
curl -s "localhost:3000/users?page=3&limit=5"
# 4
curl -s "localhost:3000/users?limit=100"
# 5
curl -s "localhost:3000/users?page=5"
# 6
curl -i "localhost:3000/users?page=0"
# 7
curl -i "localhost:3000/users?limit=abc"
# 8
curl -i "localhost:3000/users?page=1.5"
```

> Quote the URL in `curl`! Without quotes, your shell treats `&` as "run in background" and half your query string disappears.

**Expected Results:**

| #   | Status | `data` (usernames, in order)                                              | `meta`                                             |
| --- | ------ | ------------------------------------------------------------------------- | -------------------------------------------------- |
| 1   | `200`  | 10 users: `dev_shoots`, `isha_dances`, `aditya_codes`, ... , `meera.eats` | `{ page: 1, limit: 10, total: 12, totalPages: 2 }` |
| 2   | `200`  | `arjun_clicks`, `riya_travels`                                            | `{ page: 2, limit: 10, total: 12, totalPages: 2 }` |
| 3   | `200`  | `arjun_clicks`, `riya_travels`                                            | `{ page: 3, limit: 5, total: 12, totalPages: 3 }`  |
| 4   | `200`  | All 12 users                                                              | `{ page: 1, limit: 50, total: 12, totalPages: 1 }` |
| 5   | `200`  | `[]`                                                                      | `{ page: 5, limit: 10, total: 12, totalPages: 2 }` |
| 6   | `400`  | `{ "error": "page and limit must be positive integers" }`                 |                                                    |
| 7   | `400`  | `{ "error": "page and limit must be positive integers" }`                 |                                                    |
| 8   | `400`  | `{ "error": "page and limit must be positive integers" }`                 |                                                    |

## Step 05 - Sorting on `GET /users`

**Task:**

Add sorting to `GET /users`. It must work **together** with pagination.

| Query param | Default     | Allowed values                      |
| ----------- | ----------- | ----------------------------------- |
| `sortBy`    | `createdAt` | `createdAt`, `username`, `fullname` |
| `order`     | `desc`      | `asc`, `desc`                       |

| Aspect               | Requirement                                                                      |
| -------------------- | -------------------------------------------------------------------------------- |
| `sortBy` not allowed | `400` with `{ "error": "sortBy must be one of: createdAt, username, fullname" }` |
| `order` not allowed  | `400` with `{ "error": "order must be asc or desc" }`                            |

> Why an allow-list? Because `sortBy=email` or `sortBy=password` (if you ever add one 😬) should not be something a random client can play with. **Never pass user input straight into a query.**

**Test:**

```sh
# 1
curl -s "localhost:3000/users?sortBy=username&order=asc"
# 2
curl -s "localhost:3000/users?sortBy=fullname&order=desc&limit=3"
# 3
curl -s "localhost:3000/users?order=asc&limit=2"
# 4
curl -i "localhost:3000/users?sortBy=email"
# 5
curl -i "localhost:3000/users?order=sideways"
```

**Expected Results:**

| #   | Status | `data` (usernames, in order)                                          | `meta.total` / `meta.totalPages` |
| --- | ------ | --------------------------------------------------------------------- | -------------------------------- |
| 1   | `200`  | Starts with `aditya_codes`, `ananya_reads`, `arjun_clicks` ...        | `12` / `2`                       |
| 2   | `200`  | `vikram.trek`, `sara_sketches`, `rohan_runs`                          | `12` / `4`                       |
| 3   | `200`  | `riya_travels`, `arjun_clicks` (oldest first)                         | `12` / `6`                       |
| 4   | `400`  | `{ "error": "sortBy must be one of: createdAt, username, fullname" }` |                                  |
| 5   | `400`  | `{ "error": "order must be asc or desc" }`                            |                                  |

## Step 06 - Filtering on `GET /users`

**Task:**

Add two optional filters to `GET /users`. They must work **together** with each other, with sorting and with pagination.

| Query param | Rules                                                                                                                                  |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `isPrivate` | `true` → only private accounts. `false` → only public accounts. Anything else → `400` `{ "error": "isPrivate must be true or false" }` |
| `search`    | Returns users whose `username` **or** `fullname` **contains** the search text, **case-insensitive**                                    |

| Aspect       | Requirement                                                               |
| ------------ | ------------------------------------------------------------------------- |
| `meta.total` | Must count only the users that **match the filters**, not the whole table |
| No filters   | Behaves exactly like Step 05                                              |

**Test:**

```sh
# 1
curl -s "localhost:3000/users?isPrivate=true"
# 2
curl -s "localhost:3000/users?isPrivate=false"
# 3
curl -s "localhost:3000/users?search=sh"
# 4
curl -s "localhost:3000/users?search=SH&isPrivate=false&sortBy=fullname&order=asc&limit=2"
# 5
curl -s "localhost:3000/users?search=zzz"
# 6
curl -i "localhost:3000/users?isPrivate=maybe"
```

**Expected Results:**

| #   | Status | `data` (usernames, in order)                               | `meta.total` / `meta.totalPages` |
| --- | ------ | ---------------------------------------------------------- | -------------------------------- |
| 1   | `200`  | `dev_shoots`, `neha_designs`, `ananya_reads`, `meera.eats` | `4` / `1`                        |
| 2   | `200`  | 8 users, starting with `isha_dances`, `aditya_codes`       | `8` / `1`                        |
| 3   | `200`  | `dev_shoots`, `isha_dances`, `riya_travels`                | `3` / `1`                        |
| 4   | `200`  | `isha_dances`, `riya_travels`                              | `2` / `1`                        |
| 5   | `200`  | `[]`                                                       | `0` / `0`                        |
| 6   | `400`  | `{ "error": "isPrivate must be true or false" }`           |                                  |

> Notice test 3: `riya_travels` matched because of her **fullname** (Riya **Sh**arma), and `dev_shoots` matched because of his **username**. That's the "username **or** fullname" part.

---

# Part C - Paginate, sort and filter `GET /posts`

Same idea, same MVC structure, now for posts. You've done it once for users, so this part has fewer hints 😉

## Step 07 - Pagination & sorting on `GET /posts`

**Task:**

Update `GET /posts` to support pagination and sorting.

| Query param | Default     | Rules                                                                  |
| ----------- | ----------- | ---------------------------------------------------------------------- |
| `page`      | `1`         | Same rules as users                                                    |
| `limit`     | `10`        | Same rules as users (positive integer, cap at `50`)                    |
| `sortBy`    | `createdAt` | Allowed: `createdAt`, `updatedAt`                                      |
| `order`     | `desc`      | Allowed: `asc`, `desc`                                                 |

| Aspect               | Requirement                                                                 |
| -------------------- | --------------------------------------------------------------------------- |
| Response             | `200` with `{ data, meta }`, same shape as users                            |
| `page` beyond last   | `200` with `data: []`                                                       |
| Invalid `page`/`limit` | `400` with `{ "error": "page and limit must be positive integers" }`      |
| `sortBy` not allowed | `400` with `{ "error": "sortBy must be one of: createdAt, updatedAt" }`     |
| `order` not allowed  | `400` with `{ "error": "order must be asc or desc" }`                       |
| DB round trips       | Posts and the total count fetched in a **single transaction**               |

**Test:**

```sh
# 1
curl -s "localhost:3000/posts"
# 2
curl -s "localhost:3000/posts?page=3"
# 3
curl -s "localhost:3000/posts?page=4"
# 4
curl -s "localhost:3000/posts?order=asc&limit=3"
# 5
curl -i "localhost:3000/posts?limit=0"
# 6
curl -i "localhost:3000/posts?sortBy=caption"
# 7
curl -i "localhost:3000/posts?order=up"
```

**Expected Results:**

| #   | Status | `data` (posts by `insta##`, in order)                       | `meta`                                             |
| --- | ------ | ----------------------------------------------------------- | -------------------------------------------------- |
| 1   | `200`  | `insta24`, `insta23`, ... , `insta15` (10 posts)            | `{ page: 1, limit: 10, total: 24, totalPages: 3 }` |
| 2   | `200`  | `insta04`, `insta03`, `insta02`, `insta01`                  | `{ page: 3, limit: 10, total: 24, totalPages: 3 }` |
| 3   | `200`  | `[]`                                                        | `{ page: 4, limit: 10, total: 24, totalPages: 3 }` |
| 4   | `200`  | `insta01`, `insta02`, `insta03` (oldest first)              | `{ page: 1, limit: 3, total: 24, totalPages: 8 }`  |
| 5   | `400`  | `{ "error": "page and limit must be positive integers" }`   |                                                    |
| 6   | `400`  | `{ "error": "sortBy must be one of: createdAt, updatedAt" }` |                                                   |
| 7   | `400`  | `{ "error": "order must be asc or desc" }`                  |                                                    |

## Step 08 - Filtering on `GET /posts`

**Task:**

Add these optional filters to `GET /posts`. All of them must work together, and with sorting and pagination.

| Query param | Rules                                                                                                                       |
| ----------- | --------------------------------------------------------------------------------------------------------------------------- |
| `location`  | Posts whose `location` **equals** the value, **case-insensitive** (`goa`, `Goa`, `GOA` all match both `"Goa"` and `"goa"`)  |
| `search`    | Posts whose `caption` **contains** the value, case-insensitive                                                              |
| `from`      | Only posts with `createdAt` **on or after** this date (e.g. `2026-03-01`)                                                   |
| `to`        | Only posts with `createdAt` **before** this date - `to` is **exclusive**                                                    |

| Aspect                         | Requirement                                                 |
| ------------------------------ | ----------------------------------------------------------- |
| `from` / `to` not a valid date | `400` with `{ "error": "from and to must be valid dates" }` |
| `meta.total`                   | Counts only the matching posts                              |

> Why is `to` exclusive? So that `from=2026-03-01&to=2026-04-01` means "all of March", with no overlap with `from=2026-04-01&to=2026-05-01`. Same idea as pages - page 1 ends where page 2 starts.

**Test:**

```sh
# 1
curl -s "localhost:3000/posts?location=GOA"
# 2
curl -s "localhost:3000/posts?search=sunset"
# 3
curl -s "localhost:3000/posts?from=2026-03-01&to=2026-04-01"
# 4
curl -s "localhost:3000/posts?from=2026-04-01"
# 5
curl -s "localhost:3000/posts?location=pune&search=CHAI"
# 6
curl -s "localhost:3000/posts?location=mumbai&limit=2&page=2"
# 7
curl -i "localhost:3000/posts?from=yesterday"
```

**Expected Results:**

| #   | Status | `data` (posts by `insta##`, in order)            | `meta.total` / `meta.totalPages` |
| --- | ------ | ------------------------------------------------ | -------------------------------- |
| 1   | `200`  | `insta23`, `insta16`, `insta10`, `insta01`       | `4` / `1`                        |
| 2   | `200`  | `insta20`, `insta08`, `insta01`                  | `3` / `1`                        |
| 3   | `200`  | `insta16`, `insta15`, ... , `insta09` (8 posts)  | `8` / `1`                        |
| 4   | `200`  | `insta24`, `insta23`, ... , `insta17` (8 posts)  | `8` / `1`                        |
| 5   | `200`  | `insta15`                                        | `1` / `1`                        |
| 6   | `200`  | `insta06`, `insta02`                             | `4` / `2`                        |
| 7   | `400`  | `{ "error": "from and to must be valid dates" }` |                                  |

> If test 1 gives you **3** posts instead of 4, your location filter is case-sensitive. Remember `insta16`? 😏

## Step 09 - Final test run

**Task:**

1. `npm run seed`
2. Restart the server.
3. Run every test from Step 04 to Step 08, in order.
4. Run a few tests from the **previous** lab too (`POST /users`, `PATCH /posts/:id`, `DELETE /users/:id` ...). Nothing should be broken.

**Final folder structure (new / changed files marked):**

```txt
prisma/
  schema.prisma
  seed-data.js            ← new
  seed.js                 ← new
src/
  index.js
  db.js
  routes/
    users.routes.js
    posts.routes.js
  controllers/
    users.controller.js   ← changed
    posts.controller.js   ← changed
  services/
    users.service.js      ← changed
    posts.service.js      ← changed
prisma.config.js          ← changed (seed command)
package.json              ← changed (seed script)
```
