import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getDoc, listPublishableSlugs, buildDocTree } from '@/lib/docs';
import { MarkdocContent } from '@/components/markdoc/MarkdocContent';
import type { DocTreeNode } from '@/lib/docs';

// Fully static: generate every known doc at build; 404 anything else.
export const dynamicParams = false;
// Time-based safety net so content self-heals even if a webhook is missed.
export const revalidate = 3600;

type Params = { slug?: string[] };

export async function generateStaticParams(): Promise<Params[]> {
  const slugs = await listPublishableSlugs();
  return [
    { slug: [] }, // the /docs index
    ...slugs.map((slug) => ({ slug: slug.split('/') })),
  ];
}

function resolveSlug(slug?: string[]): string {
  return (slug ?? []).join('/');
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const entrySlug = resolveSlug(slug);
  if (!entrySlug) return { title: 'Documentation' };

  const doc = await getDoc(entrySlug);
  if (!doc) return {};

  const url = `/docs/${entrySlug}`;
  return {
    title: doc.meta.title,
    description: doc.meta.description || undefined,
    alternates: { canonical: url },
    openGraph: {
      title: doc.meta.title,
      description: doc.meta.description || undefined,
      url,
      type: 'article',
    },
    twitter: { card: 'summary_large_image', title: doc.meta.title },
  };
}

function flattenTree(nodes: DocTreeNode[]): DocTreeNode[] {
  return nodes.flatMap((n) => [n, ...flattenTree(n.children)]);
}

/** The /docs index lists top-level sections when there's no specific slug. */
async function DocsIndex() {
  const tree = await buildDocTree();
  const links = flattenTree(tree).filter((n) => n.slug);
  return (
    <article className="docs-content">
      <h1>Documentation</h1>
      <p>Select a page from the sidebar to get started.</p>
      <ul>
        {links.slice(0, 20).map((n) => (
          <li key={n.slug}>
            <a href={`/docs/${n.slug}`}>{n.label}</a>
          </li>
        ))}
      </ul>
    </article>
  );
}

export default async function DocPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const entrySlug = resolveSlug(slug);

  if (!entrySlug) return <DocsIndex />;

  const doc = await getDoc(entrySlug);
  if (!doc) notFound();

  return (
    <article className="docs-content">
      <h1>{doc.meta.title}</h1>
      {doc.meta.description && (
        <p style={{ color: 'var(--ds-muted)', fontSize: '1.05rem' }}>
          {doc.meta.description}
        </p>
      )}
      <MarkdocContent node={doc.node} />
    </article>
  );
}
