# Trạng thái triển khai LMS / Assessment Engine

Version: 1.4  
Cập nhật: 2026-05-30  
Phạm vi: Phase 1 — Test Platform (`apps/web`)

Tài liệu này mô tả các phần **đã triển khai** và **chưa triển khai** so với spec trong `docs/LMS_SaaS_Documentation.md`, `docs/architecture/assessment_engine_specification.md` và backlog `docs/10_MVP_Sprint_Backlog.md`.

---

## Tóm tắt nhanh

| Hạng mục | Tiến độ ước lượng |
|----------|-------------------|
| Database + RLS | ~90% (schema đầy đủ, soft delete RLS đã fix) |
| Question Bank | ~100% (21/21 loại trong registry có UI tạo) |
| Exam Taking & Grading | ~95% (21/21 loại + chấm rubric từng tiêu chí) |
| Organization & Auth | ~95% |
| Student & Assignment | ~100% |
| Reports & Dashboard | ~75% (dashboard + reports cơ bản ✅) |
| Subscription & Billing | ~90% (CK + Stripe checkout + webhook) |
| Phase 2 LMS / Phase 3 CRM | 0% |

**Sprint backlog:** A → K hoàn thành (trừ Phase 2 LMS). Xem [Gợi ý phát triển tiếp](#gợi-ý-phát-triển-tiếp).

---

## Đã triển khai

### Tổ chức & thành viên

| Tính năng | Route / File | Ghi chú |
|-----------|--------------|---------|
| Tạo org tự động khi đăng ký | Migration `setup_user_organization` trigger | Owner mặc định |
| Cài đặt tổ chức (tên, logo) | `/home/organization` | |
| Hiển thị plan hiện tại | Organization settings | Free / Pro / Enterprise |
| Organization context | `lib/lms/organizations/get-organization-context.ts` | Org + subscription + role |
| Mời thành viên | `/home/members` | Token + link 7 ngày |
| Chấp nhận lời mời | `/join/[token]` | RPC `accept_organization_invite` |
| Auth cơ bản | Makerkit | Register, login, forgot password |
| Chuyển đổi tổ chức | `/home/organization` | Cookie `lms_active_org_id` |
| Audit logs | `/home/audit-logs` | Owner/admin |
| Quản lý vai trò thành viên | `/home/members` | Đổi role, xóa member, ma trận quyền |

### Học sinh — Sprint A.1 + F.2 ✅

| Tính năng | Route / File | Ghi chú |
|-----------|--------------|---------|
| Danh sách học sinh | `/home/students` | |
| Thêm / sửa / xóa học sinh | Dialog create/edit | Quota theo plan |
| Import Excel | `student-import-dialog.tsx` | Cột fullName / Họ tên, email |
| Quota học sinh | RPC `check_student_quota` | |

### Cổng học sinh — Sprint A.3 ✅

| Tính năng | Route / File | Ghi chú |
|-----------|--------------|---------|
| Danh sách bài được giao | `/home/my-exams` | Role `student` trong sidebar |
| Liên kết tài khoản ↔ học sinh | RPC `link_student_account` | Theo email giáo viên đã thêm |
| Bắt đầu / tiếp tục / xem kết quả | `MyExamsList` | Gọi `startAttemptAction` |
| Navigation theo role | `lms-navigation.config.tsx` | Học sinh chỉ thấy Home + Bài được giao |

### Giao bài thi — Sprint A.2 ✅

| Tính năng | Route / File | Ghi chú |
|-----------|--------------|---------|
| Danh sách giao bài | `/home/assignments` | Trạng thái upcoming/active/ended |
| Giao bài (bulk) | Dialog create | Chọn đề + nhiều học sinh + thời gian |
| Giao bài từ Exam Builder | `/home/exams/[examId]` | Khi đề đã published |
| Xóa giao bài | Soft delete RPC | |
| Validate khi làm bài | `startAttemptAction` | Cửa sổ thời gian, resume in-progress |

### Ngân hàng câu hỏi

| Tính năng | Route / File | Ghi chú |
|-----------|--------------|---------|
| CRUD ngân hàng câu hỏi | `/home/questions` | |
| CRUD câu hỏi + edit UI | `/home/questions/[bankId]` | `question-form-dialog.tsx` |
| Workflow draft → published → archived | Questions panel | Sprint F.6 |
| Quota câu hỏi theo plan | RPC `check_question_quota` | |
| Soft delete | RPC `soft_delete_org_row` | |
| Question groups (tab) | `question-groups-panel.tsx` | Sprint H.2 |
| Gán câu vào nhóm | Question form + groups panel | `question_group_id` |
| Metadata / scoring | Question form | Calculator, time limit, negative marking, **rubric** |

**Loại câu hỏi có UI tạo (21/21 — đủ registry Phase 1):**

| Nhóm | Loại |
|------|------|
| Choice | `single_choice`, `multiple_choice`, `true_false`, `yes_no` |
| Text | `fill_blank`, `short_answer`, `paragraph_answer` |
| Matching | `matching_pairs`, `matching_headings`, `matching_features`, `matching_information` |
| Ordering | `sequence_order`, `drag_drop_order` |
| Labeling | `image_labeling`, `diagram_labeling`, `map_labeling` |
| Open | `essay`, `file_upload`, `audio_response`, `coding`, `spreadsheet_task` |

### Taxonomy — Sprint D.1 + H.1 ✅

| Tính năng | Route / File | Ghi chú |
|-----------|--------------|---------|
| CRUD môn học | `/home/taxonomy` | Bảng `subjects` |
| CRUD thẻ | `/home/taxonomy` | Bảng `tags` |
| Gắn tag câu hỏi | Question form | `question_tags` junction |
| CRUD chủ đề (cây) | `topics-section.tsx` | Parent/child theo subject |

### Đề thi — Sprint E + F + G ✅

| Tính năng | Route / File | Ghi chú |
|-----------|--------------|---------|
| Danh sách đề thi | `/home/exams` | Tạo / xóa |
| Exam Builder | `/home/exams/[examId]` | |
| Cập nhật metadata đề | Exam Builder | Title, mô tả, thời gian, điểm đạt |
| Thêm / sửa / xóa section | Exam Builder | Sprint E.1 |
| Thêm câu hỏi / question group vào section | Exam Builder | |
| Reorder section / item (DnD) | `@dnd-kit` | Sprint G.4 |
| Publish đề thi | `publishExamAction` | Validate có section + câu hỏi |
| Preview làm bài (giáo viên) | `startPreviewAttemptAction` | Metadata `is_preview: true` |
| Gán subject | Dropdown môn học | Sprint G.1 |
| Trạng thái archived / closed | `updateExamStatusAction` | Sprint G.2 |
| Giới hạn lượt làm | `exams.max_attempts` | Sprint F.4 |
| Quota đề thi theo plan | RPC `check_exam_quota` | |

### Làm bài & chấm điểm

| Tính năng | Route / File | Ghi chú |
|-----------|--------------|---------|
| Làm bài | `/exam/take/[attemptId]` | ~15/24 loại có UI |
| Auto-save (10 giây) | `exam-taking-panel.tsx` | |
| Nộp bài | `submitAttemptAction` | |
| Timer + auto-submit | `exam-timer.tsx` | Hết giờ → submit tự động |
| Anti-cheat cơ bản | `logAttemptEventAction` | Tab switch, chặn copy |
| Upload file (`file_upload`) | Bucket `attempt_uploads` | Sprint H.3, max 10MB |
| Chấm tự động | `grading-engine.ts` | Xem bảng bên dưới |
| Kết quả chi tiết | `exam-results-view.tsx` | FR-11 |
| Chấm thủ công | `/home/grading` | Essay, paragraph, file_upload |
| Attempt logs | `attempt_logs` table | auto-save, submit, anti_cheat |

**Grading engine — auto-grade:**

| Nhóm | Loại |
|------|------|
| Choice | `single_choice`, `multiple_choice`, `true_false`, `yes_no` |
| Text | `fill_blank`, `short_answer` |
| Matching | `matching_pairs`, `matching_headings`, `matching_features`, `matching_information` |
| Ordering | `sequence_order`, `drag_drop_order` |

**Chấm thủ công (manual):** `essay`, `paragraph_answer`, `file_upload`, và các loại open khác.

### Dashboard & báo cáo — Sprint B + E ✅

| Tính năng | Route / File | Ghi chú |
|-----------|--------------|---------|
| Dashboard LMS | `/home` | `LmsDashboard` — thống kê GV/HS |
| Cảnh báo quota ≥80% | `quota-banner.tsx` | Sprint E.3 |
| Báo cáo kết quả | `/home/reports` | Theo đề + học sinh |

### Billing — Sprint D.3 + K.2 ✅

| Tính năng | Route / File | Ghi chú |
|-----------|--------------|---------|
| Nâng cấp gói (CK) | `/home/billing` | Tab chuyển khoản → upload biên lai |
| Thanh toán Stripe | `/home/billing` | Tab Stripe → Checkout Session |
| Webhook Stripe | `/api/billing/stripe/webhook` | `checkout.session.completed`, `subscription.deleted` |
| Customer Portal | `/home/billing` | `createStripePortalAction` — hủy/đổi thẻ |
| Admin duyệt CK | `/home/admin/payments` | Approve → subscription active |
| Migration Stripe | `20260530300000_stripe_billing.sql` | `payment_method`, `stripe_*` columns |

### Chấm điểm rubric — Sprint K.1 ✅

| Tính năng | File | Ghi chú |
|-----------|------|---------|
| Chấm từng tiêu chí | `grading-panel.tsx` | Input điểm/criterion, auto-sum tổng |
| Lưu rubric scores | `grading-feedback.ts` | JSON trong `feedback` |
| Validate server | `grading-server-actions.ts` | Kiểm tra max/criterion + tổng |

### i18n toast — Sprint K.3 ✅

| Tính năng | File | Ghi chú |
|-----------|------|---------|
| Toast en/vi | `public/locales/*/lms.json` | ~90 keys trong `toast.*` |
| Toàn bộ panel LMS | `app/home/**`, `app/exam/**`, `app/join/**` | Không còn hardcode toast tiếng Anh |

### Hạ tầng kỹ thuật

| Thành phần | Vị trí | Ghi chú |
|------------|--------|---------|
| Migrations LMS core | `20260530100000_lms_core_schema.sql` | |
| Assessment Engine | `20260530120000_assessment_engine.sql` | |
| Fix soft delete RLS | `20260530130000_fix_soft_delete_rls.sql` | |
| Student quota / link account | `20260530140000`, `20260530160000` | |
| Invites + payments | `20260530200000_sprint_d_invites_payments.sql` | |
| Stripe billing | `20260530300000_stripe_billing.sql` | |
| Max attempts | `20260530210000_sprint_f_exam_max_attempts.sql` | |
| Attempt uploads bucket | `20260530220000_sprint_h_attempt_uploads.sql` | |
| Permission matrix | `lib/lms/permissions/matrix.ts` | Server-side; chưa UI quản lý role |
| Question type registry | `lib/lms/assessment/question-types.ts` | 24 loại, app layer |
| i18n LMS (en/vi) | `public/locales/*/lms.json` | Toast + UI chính; validation server vẫn EN |
| Navigation | `lms-navigation.config.tsx` | Questions, Exams, Students, Assignments, Reports, Taxonomy, Members, Billing, Grading |

---

## Chưa triển khai

### 1. Quản lý người dùng & tổ chức

| Mục | Ghi chú |
|-----|---------|
| UI gán quyền tùy chỉnh từng user | Ma trận quyền read-only có; chưa override per-user |

### 2. Loại câu hỏi

**21/21 loại** trong `question-types.ts` có form tạo. Các loại Phase 2 (video_response, sql_query, …) chưa có trong registry.

### 3. Metadata & scoring nâng cao

_(Rubric per-criterion grading đã xong Sprint K.)_

### 4. Billing & subscription

| Mục | Ghi chú |
|-----|---------|
| Stripe Customer Portal | ✅ `/home/billing` — nút *Quản lý gói* |
| Cấu hình env / webhook | Xem `docs/PRODUCTION.md` §3.1 Stripe |

### 5. Phase 2 & 3 (theo BA)

| Phase | Mục |
|-------|-----|
| Phase 2 — LMS | Course, Lesson, enrollment |
| Phase 3 — CRM | Lead scoring từ điểm thi |

### 6. Khác

| Mục | Ghi chú |
|-----|---------|
| Cập nhật `10_MVP_Sprint_Backlog.md` | Chưa sync với sprint A–K |

---

## Ma trận FR (SRS) vs thực tế

| FR | Mô tả | Trạng thái |
|----|-------|------------|
| FR-01 | Authentication | ✅ Makerkit |
| FR-02 | Organization Management | ✅ Cài đặt org + multi-org switch |
| FR-03 | Member Management | ✅ Invite + accept link |
| FR-04 | Question Bank CRUD | ✅ |
| FR-05 | Question CRUD (multi-type) | ✅ 21/21 loại registry |
| FR-06 | Exam Management | ✅ Builder đầy đủ UX chính |
| FR-07 | Student Management | ✅ CRUD + import Excel |
| FR-08 | Exam Assignment | ✅ Giao bài + portal học sinh |
| FR-09 | Exam Taking | ✅ Auto-save, timer, anti-cheat, file upload |
| FR-10 | Auto Grading | ⚠️ Auto + manual open; **rubric per-criterion** ✅ |
| FR-11 | Result Management | ✅ Tổng điểm + chi tiết từng câu |
| FR-12 | Subscription | ⚠️ Quota + CK + **Stripe checkout** ✅ |

---

## Cấu trúc code hiện tại

```text
apps/web/
├── app/home/
│   ├── organization/          ✅ + org switcher
│   ├── audit-logs/            ✅ Sprint I
│   ├── members/               ✅ Mời thành viên
│   ├── taxonomy/              ✅ Subjects, tags, topics tree
│   ├── questions/             ✅ 16 loại + metadata/scoring form
│   ├── exams/                 ✅ List + exam builder (DnD)
│   ├── students/              ✅ CRUD + import Excel
│   ├── assignments/           ✅ Giao bài
│   ├── grading/               ✅ Chấm thủ công
│   ├── my-exams/              ✅ Cổng học sinh
│   ├── reports/               ✅ Báo cáo kết quả
│   ├── billing/               ✅ Nâng cấp CK
│   ├── admin/payments/        ✅ Duyệt thanh toán
│   ├── _components/           ✅ quota-banner, dashboard
│   └── page.tsx               ✅ LMS dashboard
├── app/exam/take/[attemptId]/ ✅ Timer, 15 loại UI, file upload
├── app/join/[token]/          ✅ Accept invite
└── lib/lms/
    ├── assessment/            ✅ Registry + grading engine
    ├── organizations/         ✅ Context
    ├── questions/             ✅ CRUD + schemas
    ├── question-groups/       ✅ Sprint H
    ├── topics/                ✅ Sprint H
    ├── subjects/, tags/       ✅ Taxonomy
    ├── exams/                 ✅ Builder actions
    ├── attempts/              ✅ Taking + grading + upload
    ├── students/              ✅ CRUD + import
    ├── assignments/           ✅
    ├── dashboard/             ✅
    ├── reports/               ✅
    ├── quota/                 ✅
    ├── billing/               ✅
    ├── permissions/           ✅ Matrix (server)
    └── soft-delete.ts         ✅
```

---

## Gợi ý phát triển tiếp

### Sprint backlog (A → H) — hoàn thành

```text
Sprint A — Luồng học sinh                           ✅
  1. CRUD học sinh                                  ✅
  2. Giao đề thi (assignments)                      ✅
  3. Cổng học sinh /home/my-exams                   ✅

Sprint B — Kết quả & thời gian                     ✅
  4. Timer auto-submit                              ✅
  5. Kết quả chi tiết                               ✅
  6. Dashboard LMS                                  ✅

Sprint C — Nội dung & chấm điểm                    ✅
  7. Edit câu hỏi                                   ✅
  8. Matching / ordering UI + grading               ✅
  9. Chấm tay essay                                 ✅

Sprint D — Mở rộng                                  ✅
  10. Subjects / Tags                               ✅
  11. Member invite                                 ✅
  12. Billing (chuyển khoản)                        ✅

Sprint E — Exam UX & báo cáo                        ✅
  13. Edit / delete section                         ✅
  14. Trang /home/reports                           ✅
  15. Cảnh báo quota                                ✅

Sprint F — Nội dung & vận hành                     ✅
  16. Reorder (nút ↑↓, sau nâng cấp DnD)           ✅
  17. Import học sinh Excel                         ✅
  18. yes_no + short_answer                         ✅
  19. max_attempts + anti-cheat                     ✅
  20. Workflow draft → published                    ✅

Sprint G — Exam polish                              ✅
  21. Gán subject                                   ✅
  22. archived / closed                             ✅
  23. paragraph_answer                              ✅
  24. Drag & drop reorder                           ✅

Sprint H — Taxonomy & nhóm câu                      ✅
  25. Topics tree                                   ✅
  26. Question groups tab                           ✅
  27. file_upload                                   ✅
  28. i18n en/vi (batch mới)                        ✅

Sprint I — Loại câu & org polish                    ✅ Done
  29–34. (xem trên)                                 ✅

Sprint J — Open types & quản lý team               ✅ Done
  36. audio_response, coding, spreadsheet_task      ✅
  37. Rubric scoring UI                             ✅
  38. Member role UI + permissions matrix           ✅
  39. i18n toast (batch)                            ✅
```

Sprint K — Rubric, Stripe, i18n                    ✅ Done
  41. Rubric per-criterion grading score            ✅
  42. Stripe billing (checkout + webhook)            ✅
  43. i18n toàn bộ toast                            ✅
```

### Sprint L — gợi ý tiếp theo

```text
  44. Phase 2 LMS (Course, Lesson)
  45. Stripe Customer Portal                            ✅
  46. i18n validation messages (server/Zod)
```

---

## Lệnh dev thường dùng

```bash
cd apps/web
pnpm supabase:reset      # Apply toàn bộ migrations (local)
pnpm supabase:typegen    # Regenerate types sau migration
pnpm typecheck
pnpm run dev
```

---

## Tài liệu liên quan

- [LMS SaaS Documentation](./LMS_SaaS_Documentation.md)
- [MVP Sprint Backlog](./10_MVP_Sprint_Backlog.md)
- [Assessment Engine Architecture](./11_Assessment_Engine_Architecture.md)
- [Assessment Engine Specification](./architecture/assessment_engine_specification.md)
- [Question Types Specification](./architecture/assessment-question-types-specification.md)
- [Permission Matrix](./05_Permission_Matrix.md)
- [Supabase RLS Policies](./07_Supabase_RLS_Policies.md)
