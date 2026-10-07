import type { Instrumentation } from 'next'

// Next.js calls this for every error thrown on the server: Server Components,
// Route Handlers, Server Actions and Proxy. We store it in ErrorLog.
// Only path and method are kept from the request: headers can hold cookies.
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return // the database client needs Node.js
  const { logError } = await import('@/lib/logger')
  const err = error instanceof Error ? error : new Error(String(error))
  await logError({
    source: 'server',
    message: err.message,
    digest: typeof error === 'object' && error && 'digest' in error ? String(error.digest) : null,
    path: request.path,
    method: request.method,
    routeType: context.routeType,
    stack: err.stack,
  })
}
