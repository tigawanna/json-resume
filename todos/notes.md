Here are the features and improvements from your notes, structured into a clear and actionable list of development tasks.

### High-Priority Improvements

---

#### 1. Jobs Page & Detail View

**Problem:** The Jobs tab currently only displays a non-interactive list, preventing users from viewing or acting on individual job entries.
**Tasks:**

- **Make Jobs Viewable:** Convert job list items into clickable links that navigate to a new, detailed job page.
- **Redesign Job List into Cards:** Replace the current table/list view with a card-based layout for each job.
- **Enhance Job Cards:**
  - Display the job price and estimated pay range.
  - Include an "external link" icon that opens the original job posting URL in a new tab.
  - Make the entire card clickable to navigate to the internal job detail page.
- **Create Job Detail Page:** This page should allow users to view and edit all job information, including:
  - Posting URL
  - Job Description
  - Title, company, etc.

---

#### 2. Main Agent Modernization

**Problem:** The main call-to-action agent feels "legacy" and its interface is "broken."
**Tasks:**

- **Redesign Agent Interface:** Create a modern, minimalist UI inspired by the AI agent in Google Docs.
  - Implement a small, floating "sparkle" or "star" icon as the entry point.
  - Clicking the icon expands it into an input box that grows in height with the user's text, up to a maximum of ~40% of the screen height.
- **Implement Intelligent Routing:** When a user types a command, the agent should analyze the text and route them to the correct feature or workflow. For example, a user could say:
  - _"Tailor my resume for this job posting..."_ -> The agent should save the job, find the relevant resume, and initiate the tailoring process.

---

#### 3. Dashboard Performance & Content

**Problem:** The dashboard's stats loading blocks the UI, causing a slow and clunky experience.
**Tasks:**

- **Implement Lazy Loading:** Load the dashboard UI shell first, and then asynchronously fetch stats data. The stats sections should have their own loading indicators.
- **Add "Jobs" Statistics:** Include a new stats widget for jobs (e.g., saved jobs, applied jobs, etc.).

---

#### 4. Experiences Section Redesign

**Problem:** The Experiences section is a simple list and lacks the flexibility to manage the data effectively for resume tailoring.
**Tasks:**

- **Redesign Experience View:** Transform the list into an expandable view.
  - **Immutable Data:** The Company Name and the Period (dates of employment) should be fixed and non-editable once an experience is created.
  - **Mutable Data:** When expanded, show the following as editable fields:
    - **Titles:** Users can have multiple titles for the same period and can edit/add/remove them to suit a specific role they are targeting.
    - **Bullet Points:** Display all associated bullet points. Users should be able to edit, add, or delete bullets. This allows them to highlight relevant achievements and remove vague or unhelpful points, creating a curated "source of truth" for the AI.

---

### Medium-Priority & Backlog Features

---

#### 5. UI/UX Consistency & Cleanup

**Tasks:**

- **Standardize Auto-Saving:** Audit all fields that require explicit saves and convert them to auto-save, making the experience more seamless.
- **Refine Tab Layout:**
  - In the Resume Sync section, hide auxiliary elements (like "Templates") in the sidebar to reduce clutter.
  - Ensure the main tabs (like "AI" and others) are more prominent and consistent with the minimal aesthetic of the AI section.

---

#### 6. Pay Estimate Calculator (Feature)

**Description:** Build a feature to help users calculate gross pay based on desired net pay. This can be added to the backlog but is noted as a valuable, creative addition.
**Tasks:**

- Integrate or build a net-to-gross pay calculator.
- Explore existing open-source solutions (e.g., a referenced GitHub repository by a Kenyan developer) for inspiration.
- Add this calculator to the relevant section of the dashboard, likely near the job details.
