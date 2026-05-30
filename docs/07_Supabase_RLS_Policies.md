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
