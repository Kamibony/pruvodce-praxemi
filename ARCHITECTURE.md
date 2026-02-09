# System Architecture

## 1. Tech Stack
- **Frontend Framework:** Vue 3 + Composition API (`<script setup>`)
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **Database:** Google Cloud Firestore (NoSQL)
- **Deployment:** Firebase Hosting

## 2. Data Strategy

### Single Source of Truth
Firestore is the definitive source of truth for all application data. The legacy `src/db.json` file is deprecated and must be removed after migration.

### Identity
- **Student ID:** The unique student ID (e.g., `242324`) serves as the immutable Document ID in the `students` collection. This facilitates direct lookups and future integrations.

### Collections Structure

#### `students` Collection
- **Document ID:** Student ID (string, e.g., "242324")
- **Fields:**
  - `name`: string (Full Name)
  - `schoolId`: string (Reference to `schools` collection document ID)
  - `week`: string (e.g., "1.-4. týden")
  - `email`: string (optional)
  - `ai_conversations`: sub-collection (see below)

#### `schools` Collection
- **Document ID:** School ID (string, e.g., "horovice")
- **Fields:**
  - `name`: string
  - `focus`: string
  - `coord`: string (Coordinator contact info)

#### `content` Collection
- **Document ID:** `faq` (or other content types)
- **Fields:**
  - `items`: array of objects
    - `q`: string (Question)
    - `a`: string (Answer)

## 3. Future AI Integration

To support the "AI Sensei" ecosystem, a sub-collection structure is defined for student conversations.

### Schema: `students/{studentId}/ai_conversations`
- **Document ID:** Auto-generated Firestore ID
- **Fields:**
  - `startedAt`: timestamp
  - `topic`: string (Context of the conversation)
  - `summary`: string (RAG-generated summary of the chat)
  - `messages`: array of objects
    - `role`: "user" | "assistant"
    - `content`: string
    - `timestamp`: timestamp

This structure allows the AI Sensei to access a student's history and provide personalized guidance based on their internship progress.

## 4. Service Pattern
- **Strict Separation:** UI components (`.vue` files) must NEVER import JSON data directly or access Firestore directly.
- **Service Layer:** All data access must go through `src/services/StudentService.js`.
- **API:**
  - `login(studentId)`: Authenticates the student by verifying their ID exists in Firestore.
  - `getDashboardData(studentId)`: Aggregates student profile, school details, team members, and static content (FAQ).
