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

├── modules
│   ├── auth
│   ├── organizations
│   ├── subscriptions
│   ├── questions
│   ├── exams
│   ├── students
│   ├── assignments
│   └── reports

├── lib
│   ├── supabase
│   ├── permissions
│   ├── billing
│   └── validations

├── types
├── hooks
├── services
└── components

Rất tốt. Nếu xác định đây là một sản phẩm SaaS nghiêm túc thì trước khi code NextJS + Supabase, bạn nên hoàn thiện 3 tài liệu kỹ thuật sau:

1. ERD (Entity Relationship Diagram)
2. Permission Matrix
3. Database Schema + RLS Design

Đây là những tài liệu mà Tech Lead, Backend, Frontend và QA đều sẽ dùng.

---

## 1. ERD (Entity Relationship Diagram)

# ERD - LMS SaaS Test Platform

## Organizations

organizations
├── organization_members
├── question_banks
├── questions
├── exams
├── students
├── subscriptions
└── audit_logs

---

organizations

id (PK)
name
slug
logo_url
plan_id
owner_id
created_at
updated_at

---

organization_members

id (PK)
organization_id (FK)
user_id
role
status
created_at

---

subscriptions

id (PK)
organization_id (FK)
plan_id
status
started_at
expired_at

---

plans

id (PK)
name
max_students
max_exams
max_questions
price

---

question_banks

id (PK)
organization_id (FK)
name
description

---

questions

id (PK)
organization_id (FK)
bank_id (FK)

type
content
explanation
difficulty

created_by
created_at

---

question_options

id (PK)
question_id (FK)

content
is_correct

---

exams

id (PK)
organization_id (FK)

title
description

duration_minutes
pass_score

status

created_by

---

exam_questions

id (PK)

exam_id (FK)
question_id (FK)

score
sort_order

---

students

id (PK)

organization_id (FK)

user_id

full_name
email

status

---

exam_assignments

id (PK)

exam_id (FK)
student_id (FK)

start_time
end_time

assigned_by

---

exam_attempts

id (PK)

exam_id (FK)
student_id (FK)

score

status

started_at
submitted_at

---

attempt_answers

id (PK)

attempt_id (FK)
question_id (FK)

answer_data

is_correct

score

---

audit_logs

id (PK)

organization_id (FK)

user_id

action

entity_type

entity_id

old_data

new_data

created_at

---

# 2. Permission Matrix

Đây là phần rất quan trọng vì SaaS sẽ ngày càng phức tạp.

# Permission Matrix

Legend

C = Create
R = Read
U = Update
D = Delete

---

Organization

Owner    CRUD
Admin    R
Teacher  -
Student  -

---

Members

Owner    CRUD
Admin    CRU
Teacher  R
Student  -

---

Question Bank

Owner    CRUD
Admin    CRUD
Teacher  CRUD
Student  -

---

Questions

Owner    CRUD
Admin    CRUD
Teacher  CRUD
Student  -

---

Exams

Owner    CRUD
Admin    CRUD
Teacher  CRUD
Student  R

---

Assignments

Owner    CRUD
Admin    CRUD
Teacher  CRUD
Student  R

---

Students

Owner    CRUD
Admin    CRUD
Teacher  CRU
Student  Self

---

Exam Attempts

Owner    R
Admin    R
Teacher  R
Student  CR

---

Reports

Owner    R
Admin    R
Teacher  R
Student  Self

---

Subscription

Owner    CRUD
Admin    R
Teacher  -
Student  -

---

Billing

Owner    CRUD
Admin    R
Teacher  -
Student  -

---

## 3. Database Schema & RLS Design

Đây là phần mình khuyên bạn nên làm chuẩn ngay từ đầu.

# Database Schema Standards

## Base Columns

Mọi bảng nghiệp vụ phải có:

id UUID PRIMARY KEY

organization_id UUID

created_by UUID

created_at TIMESTAMP

updated_at TIMESTAMP

deleted_at TIMESTAMP NULL

---

## Index Strategy

CREATE INDEX idx_org_id
ON table_name(organization_id);

CREATE INDEX idx_created_at
ON table_name(created_at);

---

## Soft Delete

KHÔNG xóa vật lý.

Sử dụng:

deleted_at

Ví dụ:

WHERE deleted_at IS NULL

---

## RLS Strategy

Bật RLS cho toàn bộ bảng nghiệp vụ.

---

organizations

User chỉ được xem organization của mình.

---

questions

Policy:

organization_id IN
(
SELECT organization_id
FROM organization_members
WHERE user_id = auth.uid()
)

---

question_banks

Policy:

organization_id IN
(
SELECT organization_id
FROM organization_members
WHERE user_id = auth.uid()
)

---

students

Policy:

organization_id IN
(
SELECT organization_id
FROM organization_members
WHERE user_id = auth.uid()
)

---

exams

Policy:

organization_id IN
(
SELECT organization_id
FROM organization_members
WHERE user_id = auth.uid()
)

---

exam_attempts

Teacher:

Được xem tất cả attempts
trong organization.

Student:

Chỉ được xem attempt của chính mình.

---

Audit Log

Không cho UPDATE.

Không cho DELETE.

Chỉ INSERT.

---

Subscription Check Middleware

Mọi request ghi dữ liệu phải kiểm tra:

Current Usage
<
Plan Limit

Ví dụ:

Current Students
<
Max Students

Current Exams
<
Max Exams

Current Questions
<
Max Questions

Nếu vượt giới hạn:

HTTP 403

PLAN_LIMIT_EXCEEDED

## Kiến trúc thư mục Next.js đề xuất

```txt
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

├── modules
│   ├── auth
│   ├── organizations
│   ├── subscriptions
│   ├── questions
│   ├── exams
│   ├── students
│   ├── assignments
│   └── reports

├── lib
│   ├── supabase
│   ├── permissions
│   ├── billing
│   └── validations

├── types
├── hooks
├── services
└── components
```

### Gợi ý nâng cấp ngay từ bản V1

Đừng lưu role trực tiếp trong bảng users.

Nên thiết kế:

```txt
users
organization_members
roles
permissions
role_permissions
```

Mặc dù hiện tại chỉ có 4 role (Owner, Admin, Teacher, Student), nhưng sau này bạn có thể thêm:

* Course Manager
* HR Manager
* Trainer
* Sales
* CRM Agent

mà không cần thay đổi database.

Đây là hướng kiến trúc mà các nền tảng SaaS lớn thường áp dụng để tránh phải refactor toàn bộ hệ thống khi sản phẩm phát triển.
