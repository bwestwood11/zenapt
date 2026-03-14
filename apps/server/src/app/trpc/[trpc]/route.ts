import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { NextRequest } from 'next/server';
import { createContext } from '../../../lib/context';
import { appRouter } from '../../../routers';

function handler(req: NextRequest) {
  return fetchRequestHandler({
    endpoint: '/trpc',
    req,
    router: appRouter,
    createContext: () => createContext(req)
  });
}
export { handler as GET, handler as POST };
