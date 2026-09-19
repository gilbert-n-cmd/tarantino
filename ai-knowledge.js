/* ============================================
   AI Knowledge Base — Action Map + General Responses
   Bishop Angelo Tarantino Memorial Secondary School
   ============================================
   This is the BRAIN of the bot. Update URLs here
   whenever you add/rename pages on your site.
*/

/* ============================================
   SCHOOL ACTION MAP (pages & links)
   ============================================ */
const SITE_ACTIONS = {

  // ---------- ADMISSIONS ----------
  admissionALevel: {
    category: "Admissions",
    keywords: ["a-level", "a level", "alevel", "advanced level", "s5", "s6",
               "senior 5", "senior 6", "high school", "upper secondary"],
    url: "https://gilbert-n-cmd.github.io/tarantino/a-level.html",
    reply: "Here's the A-Level admission page. You'll need your UCE results, a passport photo, and the application fee."
  },

  admissionOLevel: {
    category: "Admissions",
    keywords: ["o-level", "o level", "olevel", "ordinary level", "s1", "s2",
               "s3", "s4", "senior 1", "senior 4", "lower secondary"],
    url: "https://gilbert-n-cmd.github.io/tarantino/o-level.html",
    reply: "Here's the O-Level admission page. Bring your PLE results and a birth certificate."
  },

  admissionGeneral: {
    category: "Admissions",
    keywords: ["admission", "apply", "application", "join", "enroll", "enrol",
               "register", "registration", "form", "enrollment", "enrolment"],
    url: "https://gilbert-n-cmd.github.io/tarantino/admissions.html",
    reply: "Here's our main admissions page with all requirements, deadlines, and the online application form."
  },

  // ---------- FEES ----------
  fees: {
    category: "Fees",
    keywords: ["fee", "fees", "payment", "pay", "cost", "tuition", "price",
               "how much", "school fees", "charges", "structure"],
    url: "https://gilbert-n-cmd.github.io/tarantino/fees.html",
    reply: "Here's the fees structure with breakdowns for day and boarding students, plus payment options."
  },

  // ---------- ACADEMICS ----------
  departments: {
    category: "Academics",
    keywords: ["department", "departments", "subject", "subjects", "course",
               "courses", "program", "programme", "programs", "offer", "stream",
               "combination", "combinations"],
    url: "https://gilbert-n-cmd.github.io/tarantino/departments.html",
    reply: "Here are all our academic departments and the subjects offered in each stream."
  },

  // ---------- FACILITIES ----------
  facilities: {
    category: "Campus",
    keywords: ["facility", "facilities", "campus", "library", "lab",
               "laboratory", "sports", "ground", "drama", "theatre", "theater",
               "classroom", "computer"],
    url: "https://gilbert-n-cmd.github.io/tarantino/facilities.html",
    reply: "Take a look at our facilities — labs, library, sports grounds, drama room, and more."
  },

  // ---------- ALUMNI ----------
  alumni: {
    category: "Community",
    keywords: ["alumni", "alumnus", "old boy", "old girl", "graduate",
               "network", "former student", "ex-student"],
    url: "https://gilbert-n-cmd.github.io/tarantino/alumni.html",
    reply: "Join our alumni network here to reconnect with classmates and access opportunities."
  },

  // ---------- ABOUT ----------
  about: {
    category: "About",
    keywords: ["about", "history", "vision", "mission", "who are you",
               "background", "story", "founded", "school info"],
    url: "https://gilbert-n-cmd.github.io/tarantino/about.html",
    reply: "Learn about our vision, mission, and the history of Bishop Angelo Tarantino Memorial Secondary School."
  },

  // ---------- CONTACT ----------
  contact: {
    category: "Contact",
    keywords: ["contact", "call", "reach", "phone", "telephone", "email",
               "location", "find", "direction", "directions", "address",
               "map", "where"],
    url: "https://gilbert-n-cmd.github.io/tarantino/contact.html",
    reply: "Here's how to reach us — phone numbers, email, and a location map."
  },

  // ---------- TEAM ----------
  team: {
    category: "Staff",
    keywords: ["headmaster", "head teacher", "headteacher", "principal",
               "teacher", "staff", "team", "management", "board"],
    url: "https://gilbert-n-cmd.github.io/tarantino/team.html",
    reply: "Meet our headmaster, teaching staff, and board of governors."
  }
};

/* ============================================
   GENERAL CONVERSATION RESPONSES
   Handles greetings, thanks, farewells, identity, etc.
   ============================================ */
const GENERAL_RESPONSES = [
  // ---------- GREETINGS ----------
  {
    keywords: ["hi","hello","hey","hallo","helo","hiya","yo","sup","good morning",
               "good afternoon","good evening","good night","howdy","greetings",
               "muli","mwaramutse","habari","jambo","salam"],
    replies: [
      "👋 Hello! Welcome to Bishop Angelo Tarantino Memorial Secondary School. How can I help you today?",
      "Hi there! 😊 I'm here to help with admissions, fees, subjects, and more. What would you like to know?",
      "Hello! 👋 Ask me about our school — admissions, fees, departments, or contact info.",
      "Greetings! 🎓 How can I assist you with Bishop Angelo Tarantino Memorial SS?"
    ]
  },

  // ---------- HOW ARE YOU ----------
  {
    keywords: ["how are you","how are u","how you doing","how do you do","you ok",
               "how is it going","how's it going","oli otya","habari yako"],
    replies: [
      "I'm doing great, thank you! 😊 How can I help you today?",
      "I'm always ready to help! What would you like to know about our school?",
      "Feeling helpful today! 🎓 Ask me anything about admissions, fees, or subjects."
    ]
  },

  // ---------- WHO ARE YOU ----------
  {
    keywords: ["who are you","what are you","your name","whats your name",
               "what is your name","introduce yourself","tell me about yourself",
               "are you a bot","are you human","are you ai"],
    replies: [
      "I'm the virtual assistant for Bishop Angelo Tarantino Memorial Secondary School. 🎓 I can help you find information about admissions, fees, subjects, and more!",
      "I'm a friendly AI helper for the school website. Ask me anything about the school!",
      "I'm the school's virtual assistant 🤖 — here to guide you to the right info 24/7."
    ]
  },

  // ---------- WHAT CAN YOU DO ----------
  {
    keywords: ["what can you do","help","how can you help","what do you do",
               "what can i ask","guide me","options","menu"],
    replies: [
      "I can help with:<br>🎓 <b>Admissions</b> — A-Level, O-Level<br>💰 <b>Fees</b> — day & boarding<br>📖 <b>Departments</b> — subjects offered<br>🏫 <b>Facilities</b> — labs, library, sports<br>📞 <b>Contact</b> — phone, email, location<br><br>Just type what you need!",
      "Try asking me things like:<br>• \"I want to apply for A-Level\"<br>• \"How much are school fees?\"<br>• \"What subjects do you offer?\"<br>• \"Where are you located?\""
    ]
  },

  // ---------- THANKS ----------
  {
    keywords: ["thank","thanks","thank you","thx","ty","appreciate","webale",
               "asante","mwebare","grateful"],
    replies: [
      "You're welcome! 😊 Anything else I can help with?",
      "Happy to help! 🎓 Let me know if you need anything else.",
      "My pleasure! Feel free to ask more questions anytime."
    ]
  },

  // ---------- BYE ----------
  {
    keywords: ["bye","goodbye","see you","see ya","later","farewell","good night",
               "take care","cheers","kwaheri","oraire"],
    replies: [
      "Goodbye! 👋 Feel free to come back anytime.",
      "Take care! 🎓 We hope to see you at Bishop Angelo Tarantino Memorial SS.",
      "See you soon! Thanks for visiting our school website."
    ]
  },

  // ---------- COMPLIMENTS ----------
  {
    keywords: ["good bot","nice bot","great bot","well done","awesome","amazing",
               "you are good","you're good","i like you","cool","nice"],
    replies: [
      "Thank you! 😊 I try my best to help.",
      "That means a lot! 🎓 Let me know if you need anything else.",
      "You're too kind! 💙 Ask me anything about the school."
    ]
  },

  // ---------- INSULTS / FRUSTRATION ----------
  {
    keywords: ["stupid","dumb","useless","bad bot","you suck","idiot",
               "nonsense","rubbish","terrible"],
    replies: [
      "I'm sorry I couldn't help. 😔 Try rephrasing, or contact the school directly on WhatsApp.",
      "I'm still learning! Please try asking differently, or reach the school office for help.",
      "Sorry about that! Try keywords like <b>admissions</b>, <b>fees</b>, or <b>contact</b>."
    ]
  },

  // ---------- LANGUAGE ----------
  {
    keywords: ["do you speak","can you speak","language","luganda","swahili",
               "runyoro","rutooro","english","translate"],
    replies: [
      "I currently speak English, but I understand some Luganda, Runyoro, and Swahili keywords. 🌍",
      "I mainly respond in English. For other languages, please contact the school office."
    ]
  },

  // ---------- SCHOOL IDENTITY ----------
  {
    keywords: ["school name","what school","which school","about the school",
               "tarantino","bishop angelo"],
    replies: [
      "We're <b>Bishop Angelo Tarantino Memorial Secondary School</b> — a trusted center for quality education in Fort Portal, Uganda. Motto: <i>Primus Inter Pares</i> (First Among Equals).",
      "Bishop Angelo Tarantino Memorial SS is a leading secondary school in Fort Portal, offering O-Level and A-Level education."
    ]
  },

  // ---------- MOTTO ----------
  {
    keywords: ["motto","school motto","primus inter pares","slogan"],
    replies: [
      "Our motto is <b>\"Primus Inter Pares\"</b> — Latin for <i>\"First Among Equals\"</i>. 🎓"
    ]
  },

  // ---------- JOKES ----------
  {
    keywords: ["joke","tell me a joke","funny","make me laugh","something funny"],
    replies: [
      "Why did the student eat his homework? Because the teacher said it was a piece of cake! 🍰😄",
      "Why did the math book look sad? Because it had too many problems. 📘😅",
      "What did the pencil say to the eraser? \"You're rubbing me the wrong way!\" ✏️😂"
    ]
  },

  // ---------- FEELINGS ----------
  {
    keywords: ["i am sad","im sad","i am happy","im happy","i am tired","im tired",
               "i am bored","im bored","i am stressed","im stressed","feeling"],
    replies: [
      "I hope things get better soon! 💙 If you need school info, I'm here.",
      "Thanks for sharing. 😊 Anything about the school I can help with?",
      "Stay strong! 🎓 Let me know if I can help with school-related questions."
    ]
  },

  // ---------- LOVE / RELATIONSHIP ----------
  {
    keywords: ["i love you","do you love me","will you marry me","be my friend",
               "are you single","do you have a girlfriend"],
    replies: [
      "Aww, that's sweet! 💙 But I'm just a bot — here to help with school info. 😊",
      "I'm flattered! 😄 Let's keep it professional — ask me about admissions or fees!"
    ]
  },

  // ---------- WEATHER ----------
  {
    keywords: ["weather","is it raining","how is the weather","temperature"],
    replies: [
      "I can't check live weather, but Fort Portal is known for its cool, pleasant climate. 🌤️ For today's forecast, check your weather app!",
      "I don't have weather data, but Fort Portal is usually beautiful! ☀️🌧️"
    ]
  },

  // ---------- RELIGION ----------
  {
    keywords: ["god","pray","religion","church","faith","god fearing"],
    replies: [
      "We nurture God-fearing values alongside academic excellence. 🙏",
      "Our school promotes moral and spiritual growth. You can learn more on the About page."
    ]
  }
];

/* ---------- Quick Reply Suggestions ---------- */
const QUICK_REPLIES = [
  { label: "🎓 Apply for A-Level",  query: "I want to apply for A-level" },
  { label: "📚 Apply for O-Level",  query: "I want to apply for O-level" },
  { label: "💰 School Fees",        query: "How much are the school fees" },
  { label: "📖 Departments",        query: "What departments do you have" },
  { label: "📞 Contact School",     query: "How can I contact the school" }
];

/* ---------- Fallback when no match ---------- */
const FALLBACK_REPLY = `I'm not sure about that yet. Try asking about <b>admissions</b>, <b>fees</b>, <b>departments</b>, <b>facilities</b>, or <b>contact</b>.<br><br>
Or reach us on <a href="https://wa.me/256700000000" target="_blank">WhatsApp</a>.`;

/* ---------- Welcome message ---------- */
const WELCOME_MESSAGE = `👋 Hello! I'm the school assistant.<br><br>
How can I help you today? You can ask me about admissions, fees, subjects, or contact info.`;

/* ---------- Config ---------- */
const BOT_CONFIG = {
  schoolName: "Bishop Angelo Tarantino Memorial Secondary School",
  whatsappNumber: "256700000000",   // ⚠️ Replace with real number (no + or spaces)
  useAI: false,                     // Set true if using serverless AI (api/chat.js)
  apiEndpoint: "/api/chat"          // Only used when useAI = true
};

/* ============================================
   MATH HANDLER
   Handles: "what is 2+2", "calculate 5*10", "10 / 2"
   ============================================ */
function tryMath(query) {
  const mathPattern = /(?:what is|whats|calculate|compute|solve)?\s*(-?\d+(?:\.\d+)?)\s*([\+\-\*\/x×÷])\s*(-?\d+(?:\.\d+)?)/i;
  const match = query.match(mathPattern);

  if (match) {
    const a = parseFloat(match[1]);
    const op = match[2];
    const b = parseFloat(match[3]);
    let result;

    switch (op) {
      case '+': result = a + b; break;
      case '-': result = a - b; break;
      case '*':
      case 'x':
      case '×': result = a * b; break;
      case '/':
      case '÷':
        if (b === 0) return "Cannot divide by zero. 🚫";
        result = a / b;
        break;
      default: return null;
    }

    return `🧮 <b>${a} ${op} ${b} = ${result}</b>`;
  }
  return null;
}

/* ============================================
   TIME / DATE HANDLER
   ============================================ */
function tryTimeDate(query) {
  const text = query.toLowerCase();

  const timeKeywords = ["what time","current time","time now","tell me the time"];
  const dateKeywords = ["what date","today's date","what day","date today","what is today"];

  if (timeKeywords.some(k => text.includes(k))) {
    return `🕐 Current time: <b>${new Date().toLocaleTimeString()}</b>`;
  }

  if (dateKeywords.some(k => text.includes(k))) {
    const d = new Date();
    return `📅 Today: <b>${d.toLocaleDateString('en-GB', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    })}</b>`;
  }

  return null;
}

/* ============================================
   MAIN GENERAL RESPONSE HANDLER
   Priority: Math → Time/Date → General Keywords
   ============================================ */
function getGeneralResponse(query) {
  const text = query.toLowerCase().trim();

  // Empty or very short
  if (text.length < 2) {
    return "Could you tell me a bit more? 😊 Try asking about admissions, fees, or contact.";
  }

  // 🔢 Math first
  const mathResult = tryMath(query);
  if (mathResult) return mathResult;

  // 🕐 Time / Date
  const timeDateResult = tryTimeDate(query);
  if (timeDateResult) return timeDateResult;

  // 💬 General keyword match
  let bestMatch = null;
  let bestScore = 0;

  for (const item of GENERAL_RESPONSES) {
    let score = 0;
    for (const kw of item.keywords) {
      if (text.includes(kw)) score += kw.length;
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = item;
    }
  }

  if (bestMatch) {
    const replies = bestMatch.replies;
    return replies[Math.floor(Math.random() * replies.length)];
  }

  return null; // No match — let school actions or fallback handle it
}