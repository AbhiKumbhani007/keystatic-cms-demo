import { config, collection, fields } from '@keystatic/core';
import { wrapper, repeating } from '@keystatic/core/content-components';

/**
 * Custom Markdoc components available in the editor. These MUST stay aligned
 * with the render-side tags in `src/lib/markdoc.ts` (same tag names/attributes).
 * The object key becomes the Markdoc tag name ({% callout %}, {% tabs %}, {% tab %}).
 */
const docComponents = {
  callout: wrapper({
    label: 'Callout',
    schema: {
      type: fields.select({
        label: 'Type',
        options: [
          { label: 'Note', value: 'note' },
          { label: 'Tip', value: 'tip' },
          { label: 'Warning', value: 'warning' },
          { label: 'Danger', value: 'danger' },
        ],
        defaultValue: 'note',
      }),
      title: fields.text({ label: 'Title' }),
    },
  }),
  tabs: repeating({
    label: 'Tabs',
    children: ['tab'],
    schema: {},
  }),
  tab: wrapper({
    label: 'Tab',
    schema: {
      label: fields.text({ label: 'Tab label' }),
    },
  }),
};

/**
 * Storage mode:
 * - dev  -> `local`  : writes markdown straight to disk for instant iteration.
 * - prod -> `github` : every save auto-commits to the connected GitHub repo,
 *                      making GitHub the single source of truth for both the
 *                      admin UI and direct edits to the md files.
 *
 * The GitHub App credentials are provisioned on first run of the admin UI in
 * github mode and stored as env vars (see .env.example).
 */
const isDev = process.env.NODE_ENV === 'development';

// Storage kind defaults to `local`: editors authenticate with our own
// email/password gate (no GitHub accounts), Keystatic writes markdown to disk,
// and a server-side watcher auto-commits + pushes to GitHub as a bot user via a
// PAT (see src/lib/git.ts + src/lib/auto-commit.ts). Set
// KEYSTATIC_STORAGE_KIND=github only if you switch to per-editor GitHub OAuth.
const storageKind =
  (process.env.KEYSTATIC_STORAGE_KIND as 'local' | 'github' | undefined) ??
  'local';
void isDev;

const repo = {
  owner: process.env.NEXT_PUBLIC_GITHUB_REPO_OWNER ?? 'your-org',
  name: process.env.NEXT_PUBLIC_GITHUB_REPO_NAME ?? 'your-docs-repo',
};

export default config({
  storage: storageKind === 'local' ? { kind: 'local' } : { kind: 'github', repo },

  ui: {
    brand: { name: 'Docs Platform' },
    navigation: {
      Content: ['docs'],
    },
  },

  collections: {
    docs: collection({
      label: 'Docs',
      slugField: 'title',
      // `**` unlocks nested slugs (slashes) => nested folders on disk.
      // e.g. slug "guides/getting-started/install" =>
      //      src/content/docs/guides/getting-started/install/index.mdoc
      path: 'src/content/docs/**',
      format: { contentField: 'body' },
      entryLayout: 'content',
      columns: ['title', 'order'],
      schema: {
        title: fields.slug({
          name: { label: 'Title' },
          slug: {
            label: 'Slug / path',
            description:
              'Use slashes to nest, e.g. "guides/getting-started/install". ' +
              'Follow the existing folder names exactly — there is no folder picker.',
          },
        }),
        navLabel: fields.text({
          label: 'Sidebar label',
          description: 'Optional. Overrides the title in the sidebar navigation.',
        }),
        description: fields.text({
          label: 'Description',
          description: 'Used for SEO meta description and the docs list.',
          multiline: true,
        }),
        order: fields.integer({
          label: 'Sidebar order',
          description: 'Lower numbers appear first within their group.',
          defaultValue: 0,
        }),
        draft: fields.checkbox({
          label: 'Draft',
          description: 'Draft pages are excluded from the published site.',
          defaultValue: false,
        }),
        hidden: fields.checkbox({
          label: 'Hide from sidebar',
          description: 'Page is reachable by URL but not listed in the sidebar.',
          defaultValue: false,
        }),
        body: fields.markdoc({
          label: 'Content',
          components: docComponents,
          options: {
            image: {
              directory: 'public/images/docs',
              publicPath: '/images/docs/',
            },
          },
        }),
      },
    }),
  },
});
