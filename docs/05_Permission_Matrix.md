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
