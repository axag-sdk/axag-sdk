import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    {
      type: 'doc',
      id: 'getting-started',
      label: 'Getting Started',
    },
    {
      type: 'category',
      label: 'Commands',
      collapsed: false,
      items: [
        'commands/scan',
        'commands/apply',
        'commands/report',
        'commands/validate',
        'commands/init',
      ],
    },
    {
      type: 'doc',
      id: 'configuration',
      label: 'Configuration',
    },
    {
      type: 'doc',
      id: 'inference-engine',
      label: 'Inference Engine',
    },
    {
      type: 'doc',
      id: 'ci-integration',
      label: 'CI Integration',
    },
    {
      type: 'doc',
      id: 'api-reference',
      label: 'API Reference',
    },
  ],
};

export default sidebars;
