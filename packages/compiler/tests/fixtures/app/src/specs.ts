import { defineAction } from '@web-axag/core';

export const deactivateUser = defineAction({
  intent: 'user.deactivate',
  entity: 'user',
  actionType: 'write',
  description: 'Deactivate a user and revoke their sessions',
  riskLevel: 'critical',
  confirmationRequired: true,
  approvalRequired: true,
  approvalRoles: ['security_admin'],
  idempotent: true,
  scope: 'tenant',
  requiredParameters: [{ name: 'user_id', type: 'string', format: 'uuid' }],
  handler: async () => ({ ok: true }),
});
