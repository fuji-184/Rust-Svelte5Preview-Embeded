import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			// fallback: 'index.html'
			pages: 'build',
			assets: 'build',
			fallback: undefined,
			precompress: true,
			strict: false
		})
	}
};

export default config;
