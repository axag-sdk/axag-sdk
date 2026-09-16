import { z } from 'zod';

export const InviteUser = z
  .object({
    email: z.email().max(254).describe('Work email'),
    role: z.enum(['admin', 'member']).default('member'),
    seats: z.number().int().min(1).max(500),
    note: z.string().optional(),
    tags: z.array(z.string()).optional(),
  })
  .describe('Invite a user to the workspace');

export const NotAnObject = z.string();

export default InviteUser;
