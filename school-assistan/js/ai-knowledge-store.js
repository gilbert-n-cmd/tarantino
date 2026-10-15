/* ============================================
   Firestore Knowledge Base — AI Bot
   Matcher v3 — with synonyms, stemming, fuzzy
   ============================================ */

import {
  collection, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

function waitForFirebase() {
  return new Promise((resolve) => {
    if (window.tarantinoAuth?.db) return resolve(window.tarantinoAuth);
    const check = setInterval(() => {
      if (window.tarantinoAuth?.db) {
        clearInterval(check);
        resolve(window.tarantinoAuth);
      }
    }, 20);
    setTimeout(() => clearInterval(check), 10000);
  });
}

/* ============================================
   STOP WORDS
   ============================================ */
const STOP_WORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
  "do", "does", "did", "have", "has", "had", "will", "would", "should",
  "could", "can", "may", "might", "must", "shall", "to", "of", "in",
  "on", "at", "by", "for", "with", "about", "against", "between",
  "into", "through", "during", "before", "after", "above", "below",
  "up", "down", "out", "off", "over", "under", "again", "further",
  "then", "once", "here", "there", "when", "where", "why", "how",
  "all", "any", "both", "each", "few", "more", "most", "other",
  "some", "such", "no", "nor", "not", "only", "own", "same", "so",
  "than", "too", "very", "s", "t", "just", "don", "now", "i", "me",
  "my", "we", "our", "you", "your", "he", "him", "his", "she", "her",
  "it", "its", "they", "them", "their", "what", "which", "who", "whom",
  "this", "that", "these", "those", "am", "if", "or", "and", "but"
]);

/* ============================================
   SYNONYM GROUPS
   Every word in a group maps to the same concept.
   ============================================ */
const SYNONYM_GROUPS = [
  // --- MONEY / FEES ---
  ["fee", "fees", "cost", "costs", "price", "prices", "charge", "charges",
   "tuition", "payment", "payments", "pay", "expense", "expenses", "fare"],

  // --- ADMISSIONS ---
  ["admission", "admissions", "apply", "application", "applications",
   "enroll", "enrollment", "enrol", "enrolment", "register", "registration",
   "join", "joining", "enter", "entrance"],

  // --- LEVELS (O-LEVEL) ---
  ["o-level", "olevel", "o level", "ordinary", "s1", "s2", "s3", "s4",
   "senior1", "senior2", "senior3", "senior4", "lower secondary"],

  // --- LEVELS (A-LEVEL) ---
  ["a-level", "alevel", "a level", "advanced", "s5", "s6",
   "senior5", "senior6", "upper secondary", "high school"],

  // --- LOCATION ---
  ["location", "where", "address", "place", "situated", "find", "directions",
   "map", "located", "position", "area", "district"],

  // --- CONTACT ---
  ["contact", "reach", "call", "phone", "telephone", "email", "whatsapp",
   "touch", "communicate"],

  // --- STAFF / LEADERSHIP ---
  ["headmaster", "headteacher", "head teacher", "principal", "director",
   "boss", "leader", "head", "administration"],

  // --- SUBJECTS ---
  ["subject", "subjects", "course", "courses", "program", "programme",
   "programmes", "programs", "curriculum", "class", "classes"],

  // --- DEPARTMENTS / STREAMS ---
  ["department", "departments", "stream", "streams", "section",
   "combination", "combinations", "faculty", "field"],

  // --- FACILITIES ---
  ["facility", "facilities", "amenities", "infrastructure", "building",
   "buildings", "campus", "compound"],

  // --- BOARDING ---
  ["boarding", "boarder", "boarders", "hostel", "hostels", "dorm", "dorms",
   "dormitory", "dormitories", "accommodation", "stay", "resident", "residence"],

  // --- UNIFORM ---
  ["uniform", "uniforms", "dress", "attire", "clothing", "clothes",
   "outfit", "apparel"],

  // --- MOTTO / VALUES ---
  ["motto", "slogan", "slogans", "values", "value", "principles",
   "beliefs", "philosophy"],

  // --- HOURS / SCHEDULE ---
  ["hours", "time", "times", "schedule", "timetable", "session",
   "opening", "closing", "opens", "closes"],

  // --- TERM / DATES ---
  ["term", "terms", "semester", "session", "calendar", "period"],

  // --- ABOUT ---
  ["about", "history", "background", "story", "founded", "established",
   "started", "vision", "mission", "overview", "info", "information"],

  // --- PORTAL ---
  ["portal", "login", "signin", "account", "dashboard", "access", "system"],

  // --- ALUMNI ---
  ["alumni", "alumnus", "graduate", "graduates", "oldboy", "oldgirl",
   "oldstudent", "formerstudent", "exstudent"],

  // --- RELIGION ---
  ["religion", "religious", "god", "faith", "church", "prayer",
   "spiritual", "christian", "christianity"],

  // --- RESULTS ---
  ["results", "grades", "marks", "scores", "performance", "report",
   "exam", "exams", "examination", "examinations"],

  // --- TEACHERS ---
  ["teacher", "teachers", "tutor", "tutors", "instructor", "lecturer",
   "educator", "staff"],

  // --- PAYMENT METHODS ---
  ["bank", "banking", "momo", "airtel", "mtn", "mobilemoney"],

  // --- FOOD ---
  ["food", "meals", "meal", "dining", "cafeteria", "canteen", "menu"],

  // --- SPORTS ---
  ["sports", "games", "athletics", "football", "soccer", "basketball",
   "volleyball", "netball", "swimming"],

  // --- HEALTH ---
  ["health", "sick", "sickbay", "clinic", "nurse", "medical",
   "medicine", "hospital"],

  // --- SAFETY ---
  ["safety", "security", "safe", "secure", "guards", "protection"],

  // --- TRANSPORT ---
  ["transport", "bus", "buses", "van", "vehicle", "pickup", "dropoff"],

  // --- HOLIDAYS ---
  ["holiday", "holidays", "vacation", "break", "breaks", "closure",
   "closed", "recess"],

  // --- PARENTS ---
  ["parent", "parents", "guardian", "guardians", "family", "father",
   "mother", "sponsor"],

  // --- STUDENT ---
  ["student", "students", "pupil", "pupils", "learner", "learners",
   "child", "children", "kid", "kids"],

  // --- REQUIREMENTS ---
  ["requirement", "requirements", "need", "needs", "needed", "required",
   "mandatory", "necessary", "prerequisite"]
];

/* ============================================
   STEMMER
   ============================================ */
function stem(word) {
  if (word.length < 4) return word;
  return word
    .replace(/ies$/, "y")
    .replace(/([^aeiou])es$/, "$1")
    .replace(/s$/, "")
    .replace(/ing$/, "")
    .replace(/ed$/, "")
    .replace(/ly$/, "")
    .replace(/([^aeiou])er$/, "$1")
    .replace(/([^aeiou])est$/, "$1");
}

/* ============================================
   SYNONYM MAP — built once
   ============================================ */
const SYNONYM_MAP = (() => {
  const map = new Map();
  for (let g = 0; g < SYNONYM_GROUPS.length; g++) {
    for (const w of SYNONYM_GROUPS[g]) {
      map.set(w.toLowerCase(), `g${g}`);
      map.set(stem(w.toLowerCase()), `g${g}`);
    }
  }
  return map;
})();

function canonicalize(token) {
  const lower = token.toLowerCase();
  if (SYNONYM_MAP.has(lower)) return SYNONYM_MAP.get(lower);
  const stemmed = stem(lower);
  if (SYNONYM_MAP.has(stemmed)) return SYNONYM_MAP.get(stemmed);
  return stemmed;
}

/* ============================================
   TOKENIZER
   ============================================ */
function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w))
    .map(stem);
}

/* ============================================
   LEVENSHTEIN (typo tolerance)
   ============================================ */
function levenshtein(a, b) {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  if (Math.abs(a.length - b.length) > 3) return 99;

  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = a[j - 1] === b[i - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[b.length][a.length];
}

function fuzzyMatch(a, b) {
  if (a === b) return true;
  if (a.length < 4 || b.length < 4) return false;
  const dist = levenshtein(a, b);
  const tolerance = Math.min(2, Math.floor(Math.max(a.length, b.length) / 4));
  return dist <= tolerance;
}

/* ============================================
   SCORING
   ============================================ */
function scoreMatch(query, entry) {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return 0;

  const queryCanon = queryTokens.map(canonicalize);

  const keywordStrings = (entry.keywords || []).map((k) => String(k).toLowerCase().trim());
  const keywordTokens = keywordStrings.flatMap(tokenize);
  const keywordCanon = keywordTokens.map(canonicalize);

  const questionTokens = tokenize(entry.question || "");
  const questionCanon = questionTokens.map(canonicalize);

  const answerTokens = tokenize(entry.answer || "");
  const answerCanon = answerTokens.map(canonicalize);

  let score = 0;
  let matchedTokens = 0;

  for (let qi = 0; qi < queryTokens.length; qi++) {
    const qToken = queryTokens[qi];
    const qCanon = queryCanon[qi];
    let bestForThisToken = 0;

    // 1. Exact keyword token
    if (keywordTokens.includes(qToken)) {
      bestForThisToken = Math.max(bestForThisToken, 12);
    }
    // 2. Synonym in keywords
    else if (keywordCanon.includes(qCanon)) {
      bestForThisToken = Math.max(bestForThisToken, 10);
    }
    // 3. Fuzzy match in keywords (typos)
    else {
      for (const kToken of keywordTokens) {
        if (fuzzyMatch(qToken, kToken)) {
          bestForThisToken = Math.max(bestForThisToken, 6);
          break;
        }
      }
    }

    // 4. Exact match in question
    if (questionTokens.includes(qToken)) {
      bestForThisToken = Math.max(bestForThisToken, 9);
    }
    // 5. Synonym in question
    else if (questionCanon.includes(qCanon)) {
      bestForThisToken = Math.max(bestForThisToken, 7);
    }

    // 6. Exact in answer body (weak)
    if (answerTokens.includes(qToken)) {
      bestForThisToken = Math.max(bestForThisToken, 3);
    }
    // 7. Synonym in answer body (weakest)
    else if (answerCanon.includes(qCanon)) {
      bestForThisToken = Math.max(bestForThisToken, 2);
    }

    if (bestForThisToken > 0) {
      matchedTokens++;
      score += bestForThisToken;
    }
  }

  if (matchedTokens === 0) return 0;

  // Coverage bonus
  const coverage = matchedTokens / queryTokens.length;
  score += coverage * 20;

  // Penalize long queries with only one match
  if (queryTokens.length > 4 && coverage < 0.3) {
    score *= 0.5;
  }

  // Phrase bonus — keyword phrase appears as substring
  const lowerQuery = query.toLowerCase();
  for (const kw of keywordStrings) {
    if (kw.length >= 4 && lowerQuery.includes(kw)) {
      score += 15;
      break;
    }
  }

  // Full question substring bonus
  const lowerQ = (entry.question || "").toLowerCase();
  if (lowerQ.length >= 8 && lowerQuery.includes(lowerQ)) {
    score += 40;
  }

  // Priority nudge
  score += (Number(entry.priority) || 0) * 0.5;

  return score;
}

/* ============================================
   LOAD + SEARCH
   ============================================ */
(async () => {
  const { db } = await waitForFirebase();
  console.log("[Knowledge] Starting v3 (synonyms + stemming + fuzzy)…");

  let cache = null;
  let cacheTime = 0;
  const CACHE_TTL = 3 * 60 * 1000;

  async function loadKnowledge() {
    const now = Date.now();
    if (cache && now - cacheTime < CACHE_TTL) return cache;
    try {
      const snap = await getDocs(collection(db, "knowledge"));
      cache = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      cacheTime = now;
      console.log(`[Knowledge] Loaded ${cache.length} entries`);
      return cache;
    } catch (err) {
      console.warn("[Knowledge] Failed to load:", err);
      return [];
    }
  }

  async function searchKnowledge(query) {
    const entries = await loadKnowledge();
    if (entries.length === 0) return null;

    const text = String(query || "").trim();
    if (text.length < 2) return null;

    let best = null;
    let bestScore = 0;

    for (const entry of entries) {
      const score = scoreMatch(text, entry);
      if (score > bestScore) {
        bestScore = score;
        best = entry;
      }
    }

    const MIN_SCORE = 8;
    if (bestScore >= MIN_SCORE) {
      console.log(
        `[Knowledge] Match: "${best.question}" | Score: ${bestScore.toFixed(1)}`
      );
      return best;
    }

    console.log(`[Knowledge] No match (best score: ${bestScore.toFixed(1)})`);
    return null;
  }

  async function searchKnowledgeTop(query, maxResults = 5) {
    const entries = await loadKnowledge();
    if (entries.length === 0) return [];

    const text = String(query || "").trim();
    if (text.length < 2) return [];

    return entries
      .map((entry) => ({ entry, score: scoreMatch(text, entry) }))
      .filter((s) => s.score >= 8)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults)
      .map((s) => s.entry);
  }

  function clearCache() {
    cache = null;
    cacheTime = 0;
    console.log("[Knowledge] Cache cleared");
  }

  window.tarantinoSearchKnowledge = searchKnowledge;
  window.tarantinoSearchKnowledgeTop = searchKnowledgeTop;
  window.tarantinoClearKnowledgeCache = clearCache;

  console.log("[Knowledge] ✅ Ready (v3)");
})();