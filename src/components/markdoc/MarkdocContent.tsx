import Markdoc, { type Node } from '@markdoc/markdoc';
import * as React from 'react';
import { transformMarkdoc } from '@/lib/markdoc';
import { Callout } from './Callout';
import { CodeBlock } from './CodeBlock';
import { Tabs, Tab } from './Tabs';

const components = {
  Callout,
  CodeBlock,
  Tabs,
  Tab,
};

/**
 * Renders a Keystatic `markdoc` field's AST node (from `await entry.body()`)
 * to React on the server. The node is transformed with our schema
 * (`markdocConfig`) into a plain renderable tree, then rendered with the
 * custom component map.
 */
export function MarkdocContent({ node }: { node: Node }) {
  const tree = transformMarkdoc(node);
  return <>{Markdoc.renderers.react(tree, React, { components })}</>;
}
