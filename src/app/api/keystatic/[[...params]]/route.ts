import { makeRouteHandler } from '@keystatic/next/route-handler';
import config from '@/keystatic.config';

// Handles Keystatic's GitHub OAuth flow and commits in github storage mode.
export const { POST, GET } = makeRouteHandler({ config });
