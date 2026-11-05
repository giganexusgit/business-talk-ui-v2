export async function GET() {
  return new Response('google-site-verification: googlefcd93c599d067042.html\n', {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
