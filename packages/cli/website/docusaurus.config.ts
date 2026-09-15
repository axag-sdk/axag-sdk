import { axagLight, axagDark } from './src/theme/prism-themes';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'axag-cli',
  tagline: 'Scan, infer, review & apply AXAG annotations — the CLI companion for the AXAG Standard',
  favicon: 'img/favicon.svg',

  url: 'https://cli.axag.org',
  baseUrl: '/',

  organizationName: 'axag-cli',
  projectName: 'axag-cli',
  deploymentBranch: 'gh-pages',
  trailingSlash: false,

  onBrokenLinks: 'throw',

  headTags: [
    {
      tagName: 'script',
      attributes: { type: 'application/ld+json' },
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'axag-cli',
        applicationCategory: 'DeveloperApplication',
        operatingSystem: 'macOS, Linux, Windows',
        description:
          'CLI tool to scan websites, infer AXAG annotations, review interactively, and apply semantic contracts automatically.',
        url: 'https://cli.axag.org/',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        publisher: {
          '@type': 'Organization',
          name: 'AXAG Standard Contributors',
          url: 'https://axag.org',
        },
      }),
    },
  ],

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  themes: ['@docusaurus/theme-mermaid'],

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/axag-cli/axag-cli/tree/main/website/',
          showLastUpdateTime: true,
        },
        blog: false,
        theme: {
          customCss: ['./src/css/custom.css'],
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/axag-cli-social-card.png',

    docs: {
      sidebar: {
        hideable: true,
        autoCollapseCategories: true,
      },
    },

    codeBlock: {
      showCopyButton: true,
    },

    navbar: {
      title: 'axag-cli',
      logo: {
        alt: 'axag-cli Logo',
        src: 'img/axag-cli-logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          to: '/docs/commands/scan',
          label: 'Commands',
          position: 'left',
        },
        {
          to: '/docs/api-reference',
          label: 'API',
          position: 'left',
        },
        {
          href: 'https://axag.org',
          label: 'AXAG Standard',
          position: 'right',
        },
        {
          href: 'https://github.com/axag-cli/axag-cli',
          position: 'right',
          className: 'header-github-link',
          'aria-label': 'GitHub repository',
        },
      ],
    },

    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentation',
          items: [
            { label: 'Getting Started', to: '/docs/getting-started' },
            { label: 'Commands', to: '/docs/commands/scan' },
            { label: 'Configuration', to: '/docs/configuration' },
            { label: 'API Reference', to: '/docs/api-reference' },
          ],
        },
        {
          title: 'AXAG Ecosystem',
          items: [
            { label: 'AXAG Standard', href: 'https://axag.org' },
            { label: 'Specification', href: 'https://axag.org/docs/specification/overview' },
            { label: 'Use Cases', href: 'https://axag.org/docs/use-cases/overview' },
          ],
        },
        {
          title: 'Community',
          items: [
            { label: 'GitHub', href: 'https://github.com/axag-cli/axag-cli' },
            { label: 'Issues', href: 'https://github.com/axag-cli/axag-cli/issues' },
            { label: 'Discussions', href: 'https://github.com/axag-cli/axag-cli/discussions' },
          ],
        },
        {
          title: 'More',
          items: [
            { label: 'npm', href: 'https://www.npmjs.com/package/axag-cli' },
            { label: 'CI Integration', to: '/docs/ci-integration' },
            { label: 'Inference Engine', to: '/docs/inference-engine' },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} AXAG Standard Contributors. MIT License.`,
    },

    prism: {
      theme: axagLight,
      darkTheme: axagDark,
      defaultLanguage: 'bash',
      additionalLanguages: [
        'json',
        'typescript',
        'jsx',
        'tsx',
        'yaml',
        'markup',
        'css',
        'diff',
      ],
    },

    colorMode: {
      defaultMode: 'light',
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },

    metadata: [
      {
        name: 'description',
        content: 'axag-cli — Scan websites, infer AXAG annotations, review interactively, and apply semantic contracts automatically. The CLI companion for the AXAG Standard.',
      },
      {
        name: 'keywords',
        content: 'axag-cli, AXAG, CLI, semantic annotations, AI agents, web accessibility, MCP, agent experience, annotation tool, developer tools',
      },
      { property: 'og:type', content: 'website' },
      { property: 'og:site_name', content: 'axag-cli' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'robots', content: 'index, follow' },
      { name: 'author', content: 'AXAG Standard Contributors' },
    ],
  } satisfies Preset.ThemeConfig,
};

export default config;
