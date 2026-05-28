TYPE READY
CONTEXT
SUMMARY: Full-stack web application called Spiral that celebrates chaos over discipline and progress over perfection
GOAL: Build a production-ready app with React frontend, Node.js backend, and Supabase for database and authentication
TECH
FRONTEND: React
BACKEND: Node.js
DATABASE_REQUIRED: true
FEATURES
- Authentication with email and password using Supabase Auth
- Landing page with punchy design and CTA
- Onboarding flow with 3 steps for first login
- AI goal breakdown with monthly milestones and weekly micro-actions
- Dashboard with goal display, current milestone, weekly action, and spiral visualization
- Weekly check-in modal with log entry and effort score
- Goal archive for completed or expired goals
- Mobile responsive design
- Loading states and error handling
- Raw, honest tone throughout the app
TODOS
[1] TITLE: Set up project structure and initial files
    DESC: Create the basic project structure with React, Node.js, and Supabase integration. Set up the main landing page at /workspace/frontend/app/page.tsx. Use Tailwind CSS for styling.
    DEPS: []
[2] TITLE: Implement Supabase authentication
    DESC: Add email and password signup and login functionality using Supabase Auth. Ensure each user has their own private account and all data is scoped to them. Implement protected routes so unauthenticated users can't access the app.
    DEPS: [1]
[3] TITLE: Design and implement landing page
    DESC: Create a dark, energetic, punchy landing page with headline "You're not undisciplined. You're just aiming wrong." Show what the app does in 3 bullet points. Include a big CTA button to sign up. Make it mobile responsive.
    DEPS: [1]
[4] TITLE: Implement onboarding flow (3 steps)
    DESC: Create a 3-step onboarding flow that appears only on first login. Step 1: Enter one big unrealistic 6 month goal. Step 2: Set a start date. Step 3: Pick a category. Save everything to Supabase on completion and redirect to dashboard.
    DEPS: [2]
[5] TITLE: Implement AI goal breakdown API call
    DESC: After onboarding, make an API call to generate 6 monthly milestones working backward from the big goal, and 4 weekly micro-actions for month 1. Store all milestones and weekly actions in Supabase.
    DEPS: [4]
[6] TITLE: Design and implement dashboard
    DESC: Create the main dashboard screen after login. Show the user's big goal, current month milestone, this week's micro-action in a highlighted card, and a "Log This Week" button. Implement the spiral visualization. Use dark background, electric blue or deep purple accents, bold typography, and fast, energetic feeling.
    DEPS: [2]
[7] TITLE: Implement weekly check-in modal
    DESC: Add a modal that opens when the user taps "Log This Week". Include a text field for "What actually happened this week?", a slider from 1 to 10 labeled "How hard did you go?", and a submit button. Save each check-in to Supabase with week number, log text, effort score, and timestamp.
    DEPS: [6]
[8] TITLE: Implement spiral visualization
    DESC: Create a horizontal or vertical timeline showing every week since the goal started. Weeks with a log entry show as filled circles with the effort score. Weeks without entries show as empty circles. Display three stats: Weeks Active, Weeks Missed, and Spiral Score.
    DEPS: [7]
[9] TITLE: Implement goal archive
    DESC: Allow users to mark a goal as complete or archived when it hits 6 months. Create a page to view archived goals with the full spiral timeline and final stats.
    DEPS: [6]
[10] TITLE: Add mobile responsiveness and loading states
    DESC: Ensure all pages are mobile responsive. Add loading states for all async operations. Implement error handling with user-friendly messages.
    DEPS: [1]
[11] TITLE: Finalize tone and copy
    DESC: Review all copy throughout the app to ensure it's raw, honest, and slightly chaotic. Avoid motivational poster language. Use phrases like "You fell off. Keep going." instead of "Great job staying consistent!".
    DEPS: [1]