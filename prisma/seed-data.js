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

export { users, posts, likes };
export default { users, posts, likes };
if (typeof module !== "undefined" && module.exports) {
  module.exports = { users, posts, likes };
}
