import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '~/lib/database.types';

import { LmsError, LMS_ERROR_CODES } from './errors';

type SoftDeleteTable =
  | 'question_banks'
  | 'questions'
  | 'question_options'
  | 'exams'
  | 'exam_sections'
  | 'exam_section_items'
  | 'students'
  | 'exam_assignments'
  | 'subjects'
  | 'tags'
  | 'topics'
  | 'question_groups';

type SoftDeleteByColumn =
  | { table: 'questions'; column: 'bank_id' }
  | { table: 'question_options'; column: 'question_id' }
  | { table: 'exam_sections'; column: 'exam_id' }
  | { table: 'exam_section_items'; column: 'section_id' };

export async function softDeleteOrgRow(
  client: SupabaseClient<Database>,
  table: SoftDeleteTable,
  rowId: string,
  organizationId: string,
) {
  const { data, error } = await client.rpc('soft_delete_org_row', {
    p_table_name: table,
    p_row_id: rowId,
    p_organization_id: organizationId,
  });

  if (error) {
    throw error;
  }

  if (!data) {
    throw new LmsError(LMS_ERROR_CODES.NOT_FOUND, 'Record not found');
  }
}

export async function softDeleteOrgRowsByColumn(
  client: SupabaseClient<Database>,
  config: SoftDeleteByColumn,
  columnValue: string,
  organizationId: string,
) {
  const { error } = await client.rpc('soft_delete_org_rows_by_column', {
    p_table_name: config.table,
    p_organization_id: organizationId,
    p_column_name: config.column,
    p_column_value: columnValue,
  });

  if (error) {
    throw error;
  }
}
