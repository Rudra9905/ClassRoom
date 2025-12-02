# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project overview

This repository contains a full-stack "Smart Classroom" application:
- **Backend**: Spring Boot (Java 21, Maven) under `src/main/java/com/smartclassroom/backend`.
- **Frontend**: React + TypeScript + Vite app under `frontend/`.
- **Database**: MySQL configured in `src/main/resources/application.properties` with JPA/Hibernate managing schema (`spring.jpa.hibernate.ddl-auto=update`).
- Backend runs on `http://localhost:8080`, frontend dev server on `http://localhost:5173`. REST API base URL is `http://localhost:8080/api`.

The core domain covers **users**, **classrooms**, **assignments**, **submissions**, **announcements**, and **classroom chat**, with explicit student/teacher roles.

## Backend: Spring Boot service

### How to run and build

From the repository root:

- **Run backend (using Maven wrapper)**
  - `./mvnw spring-boot:run`
  - On Windows PowerShell you can also use `./mvnw.cmd spring-boot:run` if the shell does not recognize the Unix-style script.

- **Build backend artifact**
  - `./mvnw clean package`
  - Produces a Spring Boot executable JAR under `target/`.

- **Run backend tests**
  - `./mvnw test`

- **Run a single backend test class**
  - `./mvnw -Dtest=ServiceTests test`
  - `ServiceTests` lives in `src/test/java/com/smartclassroom/backend/service/ServiceTests.java` and exercises `UserService` and `AssignmentService` with Mockito.

### Backend structure and layering

Main entrypoints:
- `com.smartclassroom.backend.SmartClassroomBackendApplication` is the active Spring Boot application class configured in the Maven plugin.
- There is an older scaffolded app in `com.adv_classroom.adv_class.AdvClassApplication`; new work should generally target the `com.smartclassroom.backend` package hierarchy.

The backend follows a conventional layered architecture:

- **Configuration** (`config/`)
  - `SecurityConfig` defines a `SecurityFilterChain` and CORS setup.
  - CORS allows the Vite dev server origin (`http://localhost:5173`), methods `GET/POST/PUT/DELETE/OPTIONS`, all headers, and credentials.
  - All HTTP requests are currently permitted (`anyRequest().permitAll()`), with CSRF disabled, and HTTP Basic enabled but effectively unused given `permitAll`.

- **Web layer** (`controller/`)
  - Controllers are grouped by feature (e.g. `AssignmentController`, `ClassroomController`, `AnnouncementController`, `AssignmentSubmissionController`, `ChatController`, `AuthController`, `UserController`).
  - Controllers expose REST endpoints under `/api/...`, accept validated DTO request bodies, and delegate to corresponding services.
  - Example: `AssignmentController` is mapped to `/api/classrooms/{classroomId}/assignments` and provides:
    - `POST /` — create an assignment for a classroom, taking `teacherId` as a request parameter and an `AssignmentCreateRequestDTO` body; the path `classroomId` overrides any value in the body.
    - `GET /` — list assignments for a classroom.
    - `GET /{assignmentId}` — fetch a single assignment.
    - `PUT /{assignmentId}` — partial update via `AssignmentUpdateRequestDTO`.
    - `GET /{assignmentId}/statistics` — exposes `AssignmentStatisticsDTO` with counts of enrolled, submitted, not-submitted, and graded students.
    - `GET /{assignmentId}/non-submitted-students` — returns `UserResponseDTO` entries for students who have not submitted.
  - `ChatController` exposes classroom-scoped chat endpoints under `/api/classrooms/{classroomId}/chat` with `POST /messages` and `GET /messages`, returning `ChatMessageResponseDTO` that embeds a `UserResponseDTO` for the sender.
  - `AuthController` exposes `/api/auth/register` and `/api/auth/login`, returning `AuthResponseDTO` objects.

- **DTOs** (`dto/...`)
  - DTOs are organized per feature: `dto.assignment`, `dto.announcement`, `dto.auth`, `dto.chat`, `dto.classroom`, each with request/response types and sometimes aggregator `Dtos` classes.
  - Response DTOs are typically built using Lombok builders in controller-private mapper methods rather than exposing entities directly.

- **Domain model** (`model/`)
  - Core entities include `User`, `UserRole` (e.g. TEACHER/STUDENT), `Classroom`, `ClassroomMember`, `ClassroomRole`, `Assignment`, `AssignmentSubmission`, `Announcement`, and `ChatMessage`.
  - Entities are standard JPA annotated classes and are wired via `@ManyToOne` / `@OneToMany` relationships to represent classrooms, enrolled members, assignments, and submissions.

- **Persistence layer** (`repository/`)
  - Repositories are Spring Data JPA interfaces (e.g. `AssignmentRepository`, `AssignmentSubmissionRepository`, `ClassroomRepository`, `ClassroomMemberRepository`, `UserRepository`, `ChatMessageRepository`, `AnnouncementRepository`).
  - They define derived query methods such as:
    - `findByClassroomId` / `findByClassroomIdIn` to fetch assignments per classroom or across multiple classrooms.
    - `findByAssignmentIdAndStudentId`, `findByAssignmentId` on submissions.
    - Aggregation helpers like `countByClassroomIdAndRole(...)`, `countByAssignmentId(...)`, and `countGradedByAssignmentId(...)` used for statistics.

- **Service layer** (`service/`)
  - Each major feature has a corresponding service: `AssignmentService`, `AssignmentSubmissionService`, `ClassroomService`, `AnnouncementService`, `ChatService`, `UserService`.
  - Services encapsulate business rules that span multiple repositories and consider roles and deadlines.
  - Example: `AssignmentService`:
    - `createAssignment(...)` loads the target `Classroom` and `User` (teacher) via repositories and enforces `UserRole.TEACHER` before creating an `Assignment` entity and saving it.
    - `getAssignmentStatistics(...)` uses `ClassroomMemberRepository` and `AssignmentSubmissionRepository` counts to build `AssignmentStatisticsDTO` with `totalStudents`, `submittedCount`, `notSubmittedCount`, and `gradedCount`.
    - `getNonSubmittedStudents(...)` computes the set difference between all classroom students and those who have submissions.
    - `getStudentAssignments(studentId)` resolves the student’s classroom memberships, fetches all assignments in those classrooms, optionally joins any existing `AssignmentSubmission`, and computes flags like `isSubmitted`, `isPastDeadline` (using `LocalDateTime.now()` compared to `assignment.dueDate`), along with `marks` and `feedback` if present.
  - `UserService` handles registration and authentication logic; tests in `ServiceTests` cover duplicate-email handling and successful registration.

- **Error handling** (`exception/`)
  - Custom exceptions such as `BadRequestException`, `ResourceNotFoundException`, and `DuplicateResourceException` represent domain-specific error cases.
  - `GlobalExceptionHandler` (a `@ControllerAdvice`) translates exceptions into structured API error responses using `ApiError`, keeping controllers lean and making error responses consistent.

### Auth and security behavior

- `SecurityConfig` currently allows all requests (`anyRequest().permitAll()`), and there is no JWT or session enforcement yet.
- `AuthController` builds `AuthResponseDTO` with a `user` object but always sets `token` to `null` for both register and login.
- On the frontend, `apiClient` attaches a `Bearer` token from the `smart-classroom-auth` entry in `localStorage` on every request. At present, the backend effectively ignores this header due to the permissive security configuration.
- When implementing real authentication/authorization, expect to:
  - Generate a non-null token (e.g., JWT) in `AuthController` and include it in `AuthResponseDTO`.
  - Update `SecurityConfig` to validate the token and restrict access based on `UserRole` and endpoints.

### Database and configuration

- Database configuration is in `src/main/resources/application.properties` and targets a local MySQL instance with a dedicated `classroom_db` schema and user.
- JPA/Hibernate is configured with `spring.jpa.hibernate.ddl-auto=update` and SQL logging enabled.
- The server port is explicitly set to `8080`.

## Frontend: React + TypeScript + Vite

### How to run, build, and type-check

From the repository root, switch into the frontend app:

```bash
cd frontend
```

Then:

- **Start dev server**
  - `npm run dev`
  - Vite serves the app (by default) on `http://localhost:5173`.

- **Build production assets**
  - `npm run build`
  - Outputs static assets into `frontend/dist/`.

- **Preview production build**
  - `npm run preview`

- **Type-check / lint TypeScript**
  - `npm run lint`
  - This runs `tsc --noEmit` for type-checking without generating JS.

There are currently no npm test scripts defined in `frontend/package.json`.

### Frontend structure and routing

Key structure under `frontend/src/`:

- **Entrypoint and routing**
  - `main.tsx` bootstraps React and React Router.
  - `App.tsx` defines all application routes using nested layouts:
    - `AuthLayout` wraps `/login` and `/register` routes.
    - `AppLayout` (inside a `ProtectedRoute`) wraps authenticated routes like `/dashboard`, `/classes`, `/classes/:id`, `/assignments`, `/assignments/:id`, `/profile`.
  - `ProtectedRoute` uses `useAuth()` to check for an authenticated user; unauthenticated users are redirected to `/login`.

- **Layouts and chrome**
  - `layouts/AppLayout.tsx` and `layouts/AuthLayout.tsx` define page shells for authenticated vs auth pages.
  - `components/layout/Navbar.tsx` and `components/layout/Sidebar.tsx` compose navigation and the main app chrome used by `AppLayout`.

- **Pages and flows**
  - `pages/dashboard/DashboardPage.tsx` shows a high-level overview for the logged-in user.
  - `pages/classes/ClassesPage.tsx` and `ClassDetailPage.tsx` manage listing and detail views for classrooms.
  - `pages/assignments/AssignmentsPage.tsx` and `AssignmentDetailPage.tsx` handle the student assignment experience.
    - `AssignmentsPage` calls `assignmentApi.getStudentAssignments()` to fetch `StudentAssignment` data.
    - It supports filters (`all`, `pending`, `submitted`, `graded`) and derives deadline status (`Open`, `Due Soon`, `Overdue`) based on `isPastDeadline` and `dueDate`.
    - It renders cards via `Card`, `Badge`, `Spinner`, and `Tabs` UI components and links each card to `/assignments/{id}`.
  - `pages/auth/LoginPage.tsx` and `RegisterPage.tsx` manage authentication forms.
  - `pages/profile/ProfilePage.tsx` shows the current user’s profile information.

- **State and auth context**
  - `context/AuthContext.tsx` centralizes authentication state and persistence (backed by `localStorage`, using the `smart-classroom-auth` key).
  - `hooks/useAuth.ts` provides a convenient hook for components to access the authenticated user and auth operations.
  - `ProtectedRoute` in `App.tsx` is the main integration point between router and auth state.

- **API clients and domain types**
  - `services/apiClient.ts` defines a shared Axios instance with:
    - `baseURL` set to `http://localhost:8080/api`.
    - A request interceptor that, on each request, reads the `smart-classroom-auth` entry from `localStorage`, parses out a `token` field (if present), and attaches `Authorization: Bearer <token>` to the request headers.
  - Feature-specific API modules (`assignmentApi.ts`, `authApi.ts`, `chatApi.ts`, `classroomApi.ts`) wrap `apiClient` for each domain area.
  - `types/domain.ts` holds TypeScript interfaces (e.g. `StudentAssignment`) that align with backend DTOs, including fields like `isSubmitted`, `isPastDeadline`, `marks`, `feedback`, and classroom metadata.

- **UI components and styling**
  - `components/ui/` contains reusable headless UI primitives (`Button`, `Input`, `Card`, `Badge`, `Modal`, `Spinner`, `Tabs`, `Avatar`) used across pages.
  - Styling relies on Tailwind CSS utility classes; Tailwind and PostCSS are configured via devDependencies and Vite.

## End-to-end behavior and flows

At a high level, the main flows connect frontend and backend as follows:

- **Authentication**
  - Frontend auth pages call `/api/auth/register` and `/api/auth/login` via `authApi`.
  - Responses currently include a `user` object; the `token` field is `null` until real token issuance is implemented.
  - Auth state is still persisted client-side; once token issuance is added server-side, the existing `apiClient` interceptor and `AuthContext` can start passing real bearer tokens.

- **Classrooms and membership**
  - Users can belong to multiple classrooms via `ClassroomMember` records.
  - Many service and controller methods take `classroomId` (path variable) plus user IDs (request params) to enforce operations in the context of a specific classroom.

- **Assignments and submissions**
  - Teachers create and update assignments via `AssignmentController`/`AssignmentService`; only users with `UserRole.TEACHER` can create assignments.
  - Students' views of assignments (in `AssignmentsPage` on the frontend) are powered by `AssignmentService.getStudentAssignments(...)`, which aggregates assignments across all classrooms the student belongs to and annotates each with submission status, marks, feedback, and a computed `isPastDeadline` flag.
  - Assignment statistics and lists of non-submitting students are available via dedicated endpoints in `AssignmentController` using count and query helpers from repositories.

- **Announcements and chat**
  - `AnnouncementController`/`AnnouncementService` manage classroom announcements, which are likely surfaced in dashboard or classroom detail pages (see the corresponding frontend pages and API service).
  - `ChatController` and `ChatService` allow posting and retrieving messages per classroom; responses embed sender details so the frontend can render avatars/names without extra requests.

When working on new features, it is usually most efficient to:
- Start from the relevant REST controller in `com.smartclassroom.backend.controller`, trace into its service and repository collaborators, then locate corresponding DTOs and frontend `services/*Api.ts` functions and pages under `frontend/src/pages/`.
- Keep ports and origins consistent with `application.properties` and `SecurityConfig` when introducing new clients or changing where the frontend is served from.
