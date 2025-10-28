export async function onRequest(context) {
  const url = new URL(context.request.url);
  
  const workerUrl = 'https://agents-starter.c28b89ed17355a8554949df804a3d70e.workers.dev' + url.pathname + url.search;
  
  return fetch(workerUrl, {
    method: context.request.method,
    headers: context.request.headers,
    body: context.request.body
  });
}