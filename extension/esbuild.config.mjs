import { build, context } from 'esbuild';

const isWatch = process.argv.includes('--watch');
const isProd = process.env.NODE_ENV === 'production';

const sharedOptions = {
  bundle: true,
  sourcemap: !isProd,
  minify: isProd,
  logLevel: 'info',
};

const extensionConfig = {
  ...sharedOptions,
  entryPoints: ['src/extension.ts'],
  outfile: 'dist/extension.cjs',
  platform: 'node',
  format: 'cjs',
  target: 'node18',
  external: ['vscode'],
};

const webviewConfig = {
  ...sharedOptions,
  entryPoints: ['webview/index.tsx'],
  outfile: 'dist/webview.js',
  platform: 'browser',
  format: 'iife',
  target: 'es2022',
  jsx: 'automatic',
  loader: { '.css': 'css' },
};

const webviewCssConfig = {
  ...sharedOptions,
  entryPoints: ['webview/styles.css'],
  outfile: 'dist/webview.css',
  loader: { '.css': 'css' },
};

async function run() {
  if (isWatch) {
    const ctxs = await Promise.all([
      context(extensionConfig),
      context(webviewConfig),
      context(webviewCssConfig),
    ]);
    await Promise.all(ctxs.map((c) => c.watch()));
    console.log('[watch] esbuild watching for changes...');
  } else {
    await Promise.all([
      build(extensionConfig),
      build(webviewConfig),
      build(webviewCssConfig),
    ]);
    console.log('[build] complete');
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
