import Markdoc, { type Config, type Node } from '@markdoc/markdoc';

/**
 * Turn a heading's text content into a URL-safe anchor id (for deep links /
 * a future table of contents).
 */
export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function headingText(node: Node): string {
  let text = '';
  for (const child of node.walk()) {
    if (child.type === 'text' && typeof child.attributes.content === 'string') {
      text += child.attributes.content;
    }
  }
  return text;
}

/**
 * Markdoc schema: custom tags ({% callout %}, {% tabs %}) plus a heading node
 * override that injects anchor ids. Extend `tags`/`nodes` here to add more
 * authoring components — remember to also register a matching React component
 * in `markdocComponents` (see components/markdoc).
 */
export const markdocConfig: Config = {
  nodes: {
    heading: {
      children: ['inline'],
      attributes: {
        level: { type: Number, required: true },
        id: { type: String },
      },
      transform(node, config) {
        const attributes = node.transformAttributes(config);
        const children = node.transformChildren(config);
        const id = slugifyHeading(headingText(node));
        return new Markdoc.Tag(
          `h${node.attributes.level}`,
          { ...attributes, id },
          children,
        );
      },
    },
    fence: {
      render: 'CodeBlock',
      attributes: {
        content: { type: String, render: false },
        language: { type: String },
      },
    },
  },
  tags: {
    callout: {
      render: 'Callout',
      attributes: {
        type: {
          type: String,
          default: 'note',
          matches: ['note', 'tip', 'warning', 'danger'],
        },
        title: { type: String },
      },
    },
    tabs: {
      render: 'Tabs',
    },
    tab: {
      render: 'Tab',
      attributes: {
        label: { type: String },
      },
    },
  },
};

export function transformMarkdoc(node: Node) {
  return Markdoc.transform(node, markdocConfig);
}
