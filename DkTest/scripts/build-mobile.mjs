// The server's .env may contain NODE_ENV=development. Set this before Vite resolves
// configuration so Android ships matching production React and JSX runtimes.
process.env.NODE_ENV = 'production';
await import('./check-release.mjs');
const { build } = await import('vite');
await build({ mode: 'mobile' });
