# To-Do List for Migrating eLearning to MySQL Backend

## Backend Setup
- [ ] Initialize Node.js project with Express.
- [ ] Setup MySQL connection and database configuration.
- [ ] Design database schema for:
  - Users (students, teachers, admins)
  - Quizzes
  - Notes/Tutorials
  - Students data

## Backend API Development
- [ ] Implement authentication endpoints (signup, login) using JWT.
- [ ] Implement CRUD endpoints for quizzes.
- [ ] Implement CRUD endpoints for notes and tutorials.
- [ ] Implement endpoints for student management.
- [ ] Implement logout and token verification.

## Frontend Refactor
- [ ] Refactor login pages (student, teacher, admin) to call backend APIs.
- [ ] Refactor dashboards to fetch quizzes, notes, students from backend APIs.
- [ ] Replace Firebase SDK calls with fetch to backend.
- [ ] Remove Firebase SDK imports and usages.
- [ ] Add frontend JWT token handling (storage, attaching token to requests).

## Optional
- [ ] Create migration scripts/tools to transfer existing Firebase data to MySQL database.

## Testing & Validation
- [ ] Test all API endpoints independently.
- [ ] Test frontend integrated with backend API.
- [ ] Validate authentication and authorization.
- [ ] Ensure smooth user experience during login, data CRUD, and logout.

---

This will be the workflow to migrate the eLearning system away from Firebase to MySQL backend.
