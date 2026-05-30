# Assessment Engine Architecture

Version: 1.0  
Aligned with: Assessment Engine Specification v1.0

## Domain Hierarchy

```text
Organization
└── Subject (optional taxonomy)
    └── Topic (tree)
└── Question Bank
    └── Question Group (shared stimulus: passage, audio, case study…)
        └── Question
            ├── metadata (JSONB)
            ├── answer_schema (JSONB) — canonical grading input
            └── scoring_schema (JSONB)
└── Exam
    └── Exam Section (Part 1, Part 2…)
        └── Section Items → Question | Question Group
└── Attempt
    ├── Attempt Answers
    └── Attempt Logs (auto-save)
```

## Question Types (domain-agnostic)

| Category | Types |
|----------|-------|
| Choice | `single_choice`, `multiple_choice`, `true_false`, `yes_no` |
| Text | `fill_blank`, `short_answer`, `paragraph_answer` |
| Matching | `matching_pairs`, `matching_headings`, `matching_features`, `matching_information` |
| Ordering | `drag_drop_order`, `sequence_order` |
| Labeling | `image_labeling`, `diagram_labeling`, `map_labeling` |
| Open | `essay`, `file_upload`, `audio_response`, `coding`, `spreadsheet_task` |

Stored as `text` + validated in application layer (extensible without DB enum migrations).

## JSONB Contracts

### metadata

Per-question settings: calculator, time limit, attempts, media refs, rubric hints.

### answer_schema

Machine-readable correct answer(s). Examples in spec §9.

### scoring_schema

`simple` | `weighted` | `negative` | `rubric` | `manual` | `ai` | `hybrid`

## Grading Modes

| Mode | When |
|------|------|
| `auto` | Choice, text with accepted answers, matching, ordering |
| `manual` | Essay, file_upload, open-ended |
| `ai` | Future: essay/speaking (metadata flag) |
| `hybrid` | Auto + teacher review |

## Multi-Tenant

All business tables include `organization_id` + RLS via `get_auth_user_org_ids()`.

## LMS / CRM Future

- `exam_attempts` and scores are stable integration points for LMS assignments and CRM lead scoring.
- No schema change required for Course/Lesson links (add junction tables later).
