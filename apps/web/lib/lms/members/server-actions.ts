'use server';

import { randomBytes } from 'crypto';

import { revalidatePath } from 'next/cache';

import { enhanceAction } from '@kit/next/actions';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { LmsError, LMS_ERROR_CODES } from '~/lib/lms/errors';
import { getOrganizationContext } from '~/lib/lms/organizations/get-organization-context';
import { assertPermission } from '~/lib/lms/permissions/matrix';

import {
  AcceptInviteSchema,
  CancelInviteSchema,
  CreateInviteSchema,
  type CreateInviteInput,
} from './schemas/invite.schema';
import {
  RemoveMemberSchema,
  UpdateMemberRoleSchema,
  type RemoveMemberInput,
  type UpdateMemberRoleInput,
} from './schemas/member.schema';

const MEMBERS_PATH = '/home/members';

export async function loadMembers(userId: string) {
  const ctx = await getOrganizationContext(userId);
  assertPermission(ctx.membership.role, 'members', 'read');

  const client = getSupabaseServerClient();

  const [{ data: members, error: membersError }, { data: invites, error: invitesError }] =
    await Promise.all([
      client
        .from('organization_members')
        .select('id, user_id, role, status, created_at')
        .eq('organization_id', ctx.organization.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false }),
      client
        .from('organization_invites')
        .select('id, email, role, status, token, expires_at, created_at')
        .eq('organization_id', ctx.organization.id)
        .eq('status', 'pending')
        .is('deleted_at', null)
        .order('created_at', { ascending: false }),
    ]);

  if (membersError) throw membersError;
  if (invitesError) throw invitesError;

  return {
    context: ctx,
    members: members ?? [],
    invites: invites ?? [],
    currentUserId: userId,
    currentUserRole: ctx.membership.role,
  };
}

export async function loadInviteByToken(token: string) {
  const client = getSupabaseServerClient();

  const { data, error } = await client
    .from('organization_invites')
    .select(
      `
      id,
      email,
      role,
      status,
      expires_at,
      organization:organizations (name)
    `,
    )
    .eq('token', token)
    .eq('status', 'pending')
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    throw new LmsError(LMS_ERROR_CODES.NOT_FOUND, 'Invite not found');
  }

  return {
    invite: data,
    organizationName:
      data.organization && typeof data.organization === 'object' ?
        (data.organization as { name: string }).name
      : 'Organization',
  };
}

export const createInviteAction = enhanceAction(
  async (data: CreateInviteInput, user) => {
    const ctx = await getOrganizationContext(user.id);
    assertPermission(ctx.membership.role, 'members', 'create');

    const client = getSupabaseServerClient();
    const token = randomBytes(24).toString('hex');
    const expiresAt = new Date();

    expiresAt.setDate(expiresAt.getDate() + 7);

    const { data: invite, error } = await client
      .from('organization_invites')
      .insert({
        organization_id: ctx.organization.id,
        email: data.email.toLowerCase(),
        role: data.role,
        token,
        status: 'pending',
        invited_by: user.id,
        expires_at: expiresAt.toISOString(),
      })
      .select('id, token')
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new LmsError(
          LMS_ERROR_CODES.VALIDATION_ERROR,
          'A pending invite already exists for this email',
        );
      }

      throw error;
    }

    revalidatePath(MEMBERS_PATH);

    return {
      success: true,
      id: invite.id,
      token: invite.token,
    };
  },
  { schema: CreateInviteSchema },
);

export const cancelInviteAction = enhanceAction(
  async (data: { id: string }, user) => {
    const ctx = await getOrganizationContext(user.id);
    assertPermission(ctx.membership.role, 'members', 'delete');

    const client = getSupabaseServerClient();

    const { error } = await client
      .from('organization_invites')
      .update({ status: 'cancelled' })
      .eq('id', data.id)
      .eq('organization_id', ctx.organization.id)
      .eq('status', 'pending');

    if (error) throw error;

    revalidatePath(MEMBERS_PATH);

    return { success: true };
  },
  { schema: CancelInviteSchema },
);

export const acceptInviteAction = enhanceAction(
  async (data: { token: string }, user) => {
    const client = getSupabaseServerClient();

    const { data: memberId, error } = await client.rpc(
      'accept_organization_invite',
      { p_token: data.token },
    );

    if (error) {
      throw new LmsError(
        LMS_ERROR_CODES.VALIDATION_ERROR,
        error.message ?? 'Failed to accept invite',
      );
    }

    revalidatePath('/home');

    return { success: true, memberId };
  },
  { schema: AcceptInviteSchema },
);

export const updateMemberRoleAction = enhanceAction(
  async (data: UpdateMemberRoleInput, user) => {
    const ctx = await getOrganizationContext(user.id);
    assertPermission(ctx.membership.role, 'members', 'update');

    const client = getSupabaseServerClient();

    const { data: member, error: fetchError } = await client
      .from('organization_members')
      .select('id, user_id, role')
      .eq('id', data.memberId)
      .eq('organization_id', ctx.organization.id)
      .is('deleted_at', null)
      .single();

    if (fetchError || !member) {
      throw new LmsError(LMS_ERROR_CODES.NOT_FOUND, 'Member not found');
    }

    if (member.user_id === user.id) {
      throw new LmsError(
        LMS_ERROR_CODES.VALIDATION_ERROR,
        'You cannot change your own role',
      );
    }

    if (member.role === 'owner') {
      throw new LmsError(
        LMS_ERROR_CODES.VALIDATION_ERROR,
        'Cannot change the owner role',
      );
    }

    if (data.role === 'admin' && ctx.membership.role !== 'owner') {
      throw new LmsError(
        LMS_ERROR_CODES.PERMISSION_DENIED,
        'Only the owner can assign admin role',
      );
    }

    const { error } = await client
      .from('organization_members')
      .update({ role: data.role })
      .eq('id', data.memberId)
      .eq('organization_id', ctx.organization.id);

    if (error) throw error;

    await client.rpc('write_audit_log', {
      p_organization_id: ctx.organization.id,
      p_action: 'member.role_updated',
      p_entity_type: 'organization_members',
      p_entity_id: data.memberId,
      p_new_data: { role: data.role },
    });

    revalidatePath(MEMBERS_PATH);

    return { success: true };
  },
  { schema: UpdateMemberRoleSchema },
);

export const removeMemberAction = enhanceAction(
  async (data: RemoveMemberInput, user) => {
    const ctx = await getOrganizationContext(user.id);
    assertPermission(ctx.membership.role, 'members', 'delete');

    const client = getSupabaseServerClient();

    const { data: member, error: fetchError } = await client
      .from('organization_members')
      .select('id, user_id, role')
      .eq('id', data.memberId)
      .eq('organization_id', ctx.organization.id)
      .is('deleted_at', null)
      .single();

    if (fetchError || !member) {
      throw new LmsError(LMS_ERROR_CODES.NOT_FOUND, 'Member not found');
    }

    if (member.user_id === user.id) {
      throw new LmsError(
        LMS_ERROR_CODES.VALIDATION_ERROR,
        'You cannot remove yourself',
      );
    }

    if (member.role === 'owner') {
      throw new LmsError(
        LMS_ERROR_CODES.VALIDATION_ERROR,
        'Cannot remove the organization owner',
      );
    }

    const { error } = await client
      .from('organization_members')
      .update({
        deleted_at: new Date().toISOString(),
        status: 'suspended',
      })
      .eq('id', data.memberId)
      .eq('organization_id', ctx.organization.id);

    if (error) throw error;

    await client.rpc('write_audit_log', {
      p_organization_id: ctx.organization.id,
      p_action: 'member.removed',
      p_entity_type: 'organization_members',
      p_entity_id: data.memberId,
    });

    revalidatePath(MEMBERS_PATH);

    return { success: true };
  },
  { schema: RemoveMemberSchema },
);
