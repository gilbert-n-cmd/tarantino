AI BOT REGULAR USER LOGIN FIX

Changes made:
1. Firebase config is now loaded as an ES module on all pages that use the AI bot.
2. AI authentication uses isolated aiBot* functions and ai-bot:* events.
3. Authentication exposes an explicit aiBotAuthReady promise so the login form never races Firebase startup.
4. Chat history exposes aiBotChatReady so sessions cannot be loaded before the store is ready.
5. AI bot references were updated to use the isolated authentication and chat APIs.
6. Existing student/school portal tarantinoLogin/tarantinoLogout functions are not touched by the AI bot.

IMPORTANT FIREBASE CHECK:
In Firebase Console for project tarantino-3e322, enable Authentication > Sign-in method > Email/Password.

The Firestore rules must also allow an authenticated user to read/write their own users/{uid}/sessions data if chat history is required.
