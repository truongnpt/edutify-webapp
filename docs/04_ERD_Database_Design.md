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
