/// <reference types="@sveltejs/kit" />

import { build, files, version } from '$service-worker';

// Create a unique cache name for this deployment
const CACHE = `cache-${version}`;
const ASSETS = [
  ...build, // the app itself
  ...files  // everything in `static`
];

// Install event - cache all assets
self.addEventListener('install', (event) => {
  async function addFilesToCache() {
    const cache = await caches.open(CACHE);
    await cache.addAll(ASSETS);
  }
  event.waitUntil(addFilesToCache());
});

// Activate event - delete old caches
self.addEventListener('activate', (event) => {
  async function deleteOldCaches() {
    for (const key of await caches.keys()) {
      if (key !== CACHE) await caches.delete(key);
    }
  }
  event.waitUntil(deleteOldCaches());
});

// Fetch event - serve cached assets if available, otherwise fetch from network
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  async function respond() {
    const url = new URL(event.request.url);
    const cache = await caches.open(CACHE);

    // `build`/`files` can always be served from the cache
    if (ASSETS.includes(url.pathname)) {
      const response = await cache.match(url.pathname);
      if (response) return response;
    }

    // For everything else, try the network first, but fall back to the cache if we're offline
    try {
      const response = await fetch(event.request);

      // If we're offline, fetch can return a value that is not a Response
      // instead of throwing - and we can't pass this non-Response to respondWith
      if (!(response instanceof Response)) {
        throw new Error('Invalid response from fetch');
      }

      // Cache the response if it's successful
      if (response.status === 200) {
        cache.put(event.request, response.clone());
      }
      return response;
    } catch (err) {
      const response = await cache.match(event.request);
      if (response) return response;
      throw err;
    }
  }

  event.respondWith(respond());
});