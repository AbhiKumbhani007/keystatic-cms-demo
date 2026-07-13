import 'server-only';
import { cache } from 'react';
import type { Node } from '@markdoc/markdoc';
import { getReader } from './reader';

export type DocMeta = {
  slug: string; // full slug, e.g. "guides/getting-started/install"
  title: string;
  navLabel: string;
  description: string;
  order: number;
  draft: boolean;
  hidden: boolean;
};

export type DocTreeNode = {
  segment: string;
  label: string;
  order: number;
  slug?: string; // set when a real doc exists at this exact path
  children: DocTreeNode[];
};

export type ResolvedDoc = {
  meta: DocMeta;
  node: Node;
};

function humanize(segment: string): string {
  return segment
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Load frontmatter for every doc (bodies are left lazy — cheap). */
const loadAllMeta = cache(async (): Promise<DocMeta[]> => {
  const reader = getReader();
  const entries = await reader.collections.docs.all();
  return entries.map(({ slug, entry }) => ({
    slug,
    title: entry.title,
    navLabel: entry.navLabel || entry.title,
    description: entry.description ?? '',
    order: entry.order ?? 0,
    draft: entry.draft ?? false,
    hidden: entry.hidden ?? false,
  }));
});

/** Slugs of every publishable (non-draft) doc — used by generateStaticParams. */
export async function listPublishableSlugs(): Promise<string[]> {
  const all = await loadAllMeta();
  return all.filter((d) => !d.draft).map((d) => d.slug);
}

/** Read one doc + resolve its Markdoc content. Drafts are treated as absent. */
export const getDoc = cache(async (slug: string): Promise<ResolvedDoc | null> => {
  const reader = getReader();
  const entry = await reader.collections.docs.read(slug, {
    resolveLinkedFiles: true,
  });
  if (!entry || entry.draft) return null;

  // With `resolveLinkedFiles: true` the content field is resolved eagerly, so
  // `body` is `{ node }` directly (not a lazy async function).
  const { node } = entry.body;
  return {
    meta: {
      slug,
      title: entry.title,
      navLabel: entry.navLabel || entry.title,
      description: entry.description ?? '',
      order: entry.order ?? 0,
      draft: entry.draft ?? false,
      hidden: entry.hidden ?? false,
    },
    node: node as unknown as Node,
  };
});

function sortTree(nodes: DocTreeNode[]): void {
  nodes.sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
  for (const node of nodes) sortTree(node.children);
}

/**
 * Build the nested sidebar tree from doc slugs. Hierarchy is encoded in the
 * slug path (e.g. "guides/setup"): each "/" is a level. Drafts and
 * hidden-from-sidebar docs are excluded. Intermediate folders without their own
 * doc get a humanized label.
 */
export const buildDocTree = cache(async (): Promise<DocTreeNode[]> => {
  const all = await loadAllMeta();
  const visible = all.filter((d) => !d.draft && !d.hidden);

  const root: DocTreeNode = { segment: '', label: '', order: 0, children: [] };

  for (const doc of visible) {
    const segments = doc.slug.split('/');
    let level = root.children;

    segments.forEach((segment, i) => {
      let node = level.find((n) => n.segment === segment);
      if (!node) {
        node = {
          segment,
          label: humanize(segment),
          order: Number.MAX_SAFE_INTEGER,
          children: [],
        };
        level.push(node);
      }
      if (i === segments.length - 1) {
        node.slug = doc.slug;
        node.label = doc.navLabel;
        node.order = doc.order;
      }
      level = node.children;
    });
  }

  sortTree(root.children);
  return root.children;
});
