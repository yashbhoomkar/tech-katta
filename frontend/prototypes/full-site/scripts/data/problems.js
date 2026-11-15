// The 22 design problems and 3 sample challenges (real app: GET /v1/articles?kind=problem and /v1/lab).
// status: "solved", "started" or "".
const row = (n, slug, title, level, status, accepted, best, stars) => ({ n, slug, title, level, status, accepted, best, stars });

export const PROBLEMS = [
  row("01", "url-shortener", "Design a URL shortener", "easy", "solved", "64%", 92, 3),
  row("02", "file-sync", "Design file storage and sync", "easy", "started", "51%", null, 2),
  row("03", "restaurants-near-me", "Design restaurants near me", "easy", "", "58%", null, 0),
  row("04", "grocery-delivery", "Design 10-minute grocery delivery", "easy", "", "55%", null, 0),
  row("05", "ticket-booking", "Design match ticket booking", "hard", "", "22%", null, 0),
  row("06", "photo-sharing", "Design photo sharing", "easy", "solved", "60%", 88, 2),
  row("07", "news-feed", "Design a news feed", "medium", "", "37%", null, 0),
  row("08", "dating-swipes", "Design dating app swipes", "medium", "", "41%", null, 0),
  row("09", "coding-judge", "Design a coding judge", "medium", "", "35%", null, 0),
  row("10", "chat-app", "Design a chat app", "medium", "", "33%", null, 0),
  row("11", "notifications", "Design a notification service", "easy", "", "57%", null, 0),
  row("12", "payments", "Design a payment system", "hard", "", "18%", null, 0),
  row("13", "job-scheduler", "Design a job scheduler", "medium", "", "39%", null, 0),
  row("14", "web-crawler", "Design a web crawler", "hard", "", "21%", null, 0),
  row("15", "leaderboard", "Design a live leaderboard", "easy", "solved", "66%", 95, 3),
  row("16", "ad-clicks", "Design ad click counting", "hard", "", "19%", null, 0),
  row("17", "key-value-store", "Design a distributed key-value store", "hard", "", "15%", null, 0),
  row("18", "doc-editor", "Design a shared document editor", "hard", "", "12%", null, 0),
  row("19", "rider-assignment", "Design rider assignment", "hard", "", "17%", null, 0),
  row("20", "video-streaming", "Design video streaming", "medium", "", "34%", null, 0),
  row("21", "menu-search", "Design menu search", "medium", "", "40%", null, 0),
  row("22", "ind-vs-pak", "Design live streaming for IND vs PAK", "hard", "", "9%", null, 0),
];

export const CHALLENGES = [
  { level: "Beginner", title: "Too much for one server", stars: 3 },
  { level: "Intermediate", title: "The 8 pm flash sale", stars: 1 },
  { level: "Advanced", title: "The cache restarts at dinner", stars: 0 },
];

export const problemBySlug = (slug) => PROBLEMS.find((p) => p.slug === slug);
export const levelName = (l) => l[0].toUpperCase() + l.slice(1);
export const starsText = (n) => "★".repeat(n) + "☆".repeat(3 - n);

export const HINTS = [
  "How many new links a day, and how many opens? Write both numbers down first.",
  "Opens outnumber new links about 100 to 1. Which part of your design sees that load?",
  "A short code is just a key. What is the fastest way to look a key up?",
  "Put a cache in front of the database for opens. Most opens are for a few popular links.",
  "Two servers must never hand out the same code. Where could codes come from so they never clash?",
  "Hand each server a block of 1,000 numbers at a time, and turn each number into a code.",
  "The load balancer should sit in two zones, so one zone going down keeps links working.",
];

export const INTERVIEWER = {
  "how many links a day?": "About 2 crore new links a day, and around 200 crore opens.",
  "read to write ratio?": "Roughly 100 opens for every new link.",
  "do links expire?": "Yes, if the marketer sets an expiry. Most don’t: assume links live for 5 years.",
  "is this design ok?": "I can’t judge it for you; Run and Submit can. But tell me: what happens when one zone goes down?",
};
