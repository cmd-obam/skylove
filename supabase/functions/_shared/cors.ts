export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-api-version',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'Access-Control-Max-Age': '86400',
}

export function handleOptionsRequest() {
  return new Response('ok', {
    status: 200,
    headers: corsHeaders,
  })
}

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}

export function withCors(handler: (req: Request) => Promise<Response> | Response) {
  return async (req: Request) => {
    if (req.method === 'OPTIONS') {
      return handleOptionsRequest()
    }

    try {
      return await handler(req)
    } catch (error) {
      console.error('[edge-function] unexpected error', error)

      return jsonResponse(
        {
          error: 'unknown',
          message: error instanceof Error ? error.message : '알 수 없는 오류',
        },
        500,
      )
    }
  }
}
