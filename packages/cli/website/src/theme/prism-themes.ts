/**
 * Custom Prism themes for axag-cli documentation.
 * Reused from the AXAG Standard docs with the same purple palette.
 */

import type { PrismTheme } from 'prism-react-renderer';

export const axagLight: PrismTheme = {
  plain: {
    color: '#24292f',
    backgroundColor: '#f6f8fa',
  },
  styles: [
    { types: ['comment', 'prolog', 'doctype', 'cdata'], style: { color: '#6a737d', fontStyle: 'italic' as const } },
    { types: ['punctuation'], style: { color: '#6a737d' } },
    { types: ['operator'], style: { color: '#d73a49' } },
    { types: ['namespace'], style: { opacity: 0.8 } },
    { types: ['tag'], style: { color: '#22863a' } },
    { types: ['attr-name'], style: { color: '#6f42c1', fontWeight: 'bold' as const } },
    { types: ['attr-value', 'string', 'char'], style: { color: '#032f62' } },
    { types: ['number'], style: { color: '#005cc5' } },
    { types: ['boolean', 'constant'], style: { color: '#005cc5' } },
    { types: ['keyword'], style: { color: '#d73a49', fontWeight: 'bold' as const } },
    { types: ['builtin', 'class-name'], style: { color: '#6f42c1' } },
    { types: ['function'], style: { color: '#6f42c1' } },
    { types: ['property'], style: { color: '#005cc5' } },
    { types: ['regex', 'important', 'variable'], style: { color: '#e36209' } },
    { types: ['selector'], style: { color: '#22863a' } },
    { types: ['inserted'], style: { color: '#22863a', backgroundColor: '#f0fff4' } },
    { types: ['deleted'], style: { color: '#b31d28', backgroundColor: '#ffeef0' } },
    { types: ['symbol'], style: { color: '#e36209' } },
    { types: ['template-string'], style: { color: '#032f62' } },
    { types: ['atrule'], style: { color: '#d73a49' } },
  ],
};

export const axagDark: PrismTheme = {
  plain: {
    color: '#e1e4e8',
    backgroundColor: '#1e1e2e',
  },
  styles: [
    { types: ['comment', 'prolog', 'doctype', 'cdata'], style: { color: '#6a9955', fontStyle: 'italic' as const } },
    { types: ['punctuation'], style: { color: '#808080' } },
    { types: ['operator'], style: { color: '#d4d4d4' } },
    { types: ['namespace'], style: { opacity: 0.8 } },
    { types: ['tag'], style: { color: '#569cd6' } },
    { types: ['attr-name'], style: { color: '#9cdcfe', fontWeight: 'bold' as const } },
    { types: ['attr-value', 'string', 'char'], style: { color: '#ce9178' } },
    { types: ['number'], style: { color: '#b5cea8' } },
    { types: ['boolean', 'constant'], style: { color: '#569cd6' } },
    { types: ['keyword'], style: { color: '#c586c0', fontWeight: 'bold' as const } },
    { types: ['builtin', 'class-name'], style: { color: '#4ec9b0' } },
    { types: ['function'], style: { color: '#dcdcaa' } },
    { types: ['property'], style: { color: '#9cdcfe' } },
    { types: ['regex', 'important', 'variable'], style: { color: '#d7ba7d' } },
    { types: ['selector'], style: { color: '#d7ba7d' } },
    { types: ['inserted'], style: { color: '#b5cea8', backgroundColor: 'rgba(0, 64, 0, 0.3)' } },
    { types: ['deleted'], style: { color: '#ce9178', backgroundColor: 'rgba(64, 0, 0, 0.3)' } },
    { types: ['symbol'], style: { color: '#d7ba7d' } },
    { types: ['template-string'], style: { color: '#ce9178' } },
    { types: ['atrule'], style: { color: '#c586c0' } },
  ],
};
