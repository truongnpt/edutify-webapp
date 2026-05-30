# LMS SaaS Platform Documentation

## Included Documents

1. Business Analysis (BA)
2. Software Requirement Specification (SRS)
3. ERD Design
4. Permission Matrix
5. Database Schema & RLS Design
6. Next.js Architecture

---

# 1. Business Analysis (BA)

## Vision

Xây dựng nền tảng LMS SaaS theo kiến trúc Multi-Tenant, Subscription-based.

Modules:
- Test Platform (Phase 1)
- LMS (Phase 2)
- CRM (Phase 3)

## Core Principles

- Multi-Tenant
- Role Permission
- Subscription Billing
- Organization Architecture

## Roles

- Owner
- Admin
- Teacher
- Student

## Core Features

### Question Bank
- Single Choice
- Multiple Choice
- True/False
- Essay
- Fill Blank

### Exam Management
- Create Exam
- Assign Exam
- Auto Grading

### Student Management
- Create Student
- Import Excel
- Exam Assignment

---

# 2. Software Requirement Specification (SRS)

## Functional Requirements

### FR-01 Authentication
- Register
- Login
- Forgot Password

### FR-02 Organization Management
- Create Organization
- Update Organization

### FR-03 Member Management
- Invite Member
- Assign Role

### FR-04 Question Bank
- CRUD Question Bank

### FR-05 Question Management
- CRUD Question
- Support multiple question types

### FR-06 Exam Management
- Create Exam
- Add Question
- Remove Question

### FR-07 Student Management
- Create Student
- Import Student

### FR-08 Exam Assignment
- Assign Exam
- Set Start/End Time

### FR-09 Exam Taking
- Start Exam
- Auto Save
- Submit Exam

### FR-10 Auto Grading
- Single Choice
- Multiple Choice
- True/False
- Fill Blank

### FR-11 Result Management
- Score
- Correct Answers
- Wrong Answers

### FR-12 Subscription
- Free Plan
- Pro Plan
- Enterprise Plan

---

# 3. ERD Design

## organizations

- id
- name
- slug
- logo_url
- owner_id

## organization_members

- id
- organization_id
- user_id
- role

## plans

- id
- name
- max_students
- max_exams
- max_questions
- price

## subscriptions

- id
- organization_id
- plan_id
- status

## question_banks

- id
- organization_id
- name
- description

## questions

- id
- organization_id
- bank_id
- type
- content
- explanation

## question_options

- id
- question_id
- content
- is_correct

## exams

- id
- organization_id
- title
- duration_minutes
- pass_score

## exam_questions

- id
- exam_id
- question_id
- score

## students

- id
- organization_id
- user_id
- full_name
- email

## exam_assignments

- id
- exam_id
- student_id
- start_time
- end_time

## exam_attempts

- id
- exam_id
- student_id
- score

## attempt_answers

- id
- attempt_id
- question_id
- answer_data

## audit_logs

- id
- organization_id
- user_id
- action

---

# 4. Permission Matrix

| Module | Owner | Admin | Teacher | Student |
|----------|----------|----------|----------|----------|
| Organization | CRUD | R | - | - |
| Members | CRUD | CRU | R | - |
| Question Bank | CRUD | CRUD | CRUD | - |
| Questions | CRUD | CRUD | CRUD | - |
| Exams | CRUD | CRUD | CRUD | R |
| Assignments | CRUD | CRUD | CRUD | R |
| Students | CRUD | CRUD | CRU | Self |
| Attempts | R | R | R | CR |
| Reports | R | R | R | Self |
| Billing | CRUD | R | - | - |

---

# 5. Database Standards

## Base Columns

All business tables:

- id UUID
- organization_id UUID
- created_by UUID
- created_at TIMESTAMP
- updated_at TIMESTAMP
- deleted_at TIMESTAMP NULL

## Soft Delete

Use:

deleted_at

Never hard delete.

## Index Strategy

```sql
CREATE INDEX idx_org_id
ON table_name(organization_id);
```

## Multi Tenant Strategy

All business tables must contain:

organization_id

---

# 6. Supabase RLS Strategy

Example:

```sql
organization_id IN (
  SELECT organization_id
  FROM organization_members
  WHERE user_id = auth.uid()
)
```

Apply to:

- questions
- question_banks
- exams
- students
- attempts

## Audit Log

Only INSERT.

No UPDATE.

No DELETE.

---

# 7. Subscription Rules

## Free

- 20 Students
- 5 Exams
- 100 Questions

## Pro

Configurable

## Validation

If quota exceeded:

HTTP 403

PLAN_LIMIT_EXCEEDED

---

# 8. Next.js Architecture

```text
src/
├── app
│   ├── (auth)
│   ├── dashboard
│   │   ├── questions
│   │   ├── exams
│   │   ├── students
│   │   ├── assignments
│   │   ├── reports
│   │   └── settings
│   └── exam
│       └── [assignmentId]
│
├── modules
│   ├── auth
│   ├── organizations
│   ├── subscriptions
│   ├── questions
│   ├── exams
│   ├── students
│   ├── assignments
│   └── reports
│
├── lib
├── services
├── hooks
├── types
└── components
```

---

# Future Roadmap

## Phase 2

LMS

- Courses
- Lessons
- Assignments
- Certificates

## Phase 3

CRM

- Leads
- Customers
- Sales Pipeline

