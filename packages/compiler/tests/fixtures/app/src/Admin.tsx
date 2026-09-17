import { defineAction } from '@web-axag/core';
import { deactivateUser } from './specs.js';

const exportUsers = defineAction({
  intent: 'user.export',
  actionType: 'read',
  description: 'Export the user list as CSV',
  riskLevel: 'low',
  idempotent: true,
});

export const Admin = ({ rowSpec }: { rowSpec: unknown }) => (
  <section>
    <button axag={deactivateUser}>Deactivate</button>
    <button axag={exportUsers}>Export</button>
    <button axag={rowSpec}>Row action</button>
  </section>
);
