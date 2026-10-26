/* ============================================
   AI Knowledge Base — Database Only
   ============================================ */

// We remove SITE_ACTIONS, GENERAL_RESPONSES, Math, and Time handlers.

const QUICK_REPLIES = [
  { label: "🎓 Apply for A-Level",  query: "How do I apply for A-Level?" },
  { label: "📚 Apply for O-Level",  query: "How do I apply for O-Level?" },
  { label: "💰 School Fees",        query: "How much are the school fees?" },
  { label: "📖 Departments",        query: "What departments do you have?" },
  { label: "📞 Contact School",     query: "How can I contact the school?" }
];

const FALLBACK_REPLY = `I couldn't find an answer to that in my database. 😔 <br><br>
Try asking about <b>admissions</b>, <b>fees</b>, <b>subjects</b>, or <b>contact info</b>.<br><br>
Or click here to <a href="https://wa.me/256700000000" target="_blank">chat with us on WhatsApp</a>.`;
const WELCOME_MESSAGE = `👋 Hello! I'm the school assistant.<br><br>
How can I help you today? I can answer questions about admissions, fees, subjects, and contact info.`;