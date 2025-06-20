// Service Worker for Expense Tracker PWA
const CACHE_NAME = 'expense-tracker-v1.0.0';
const STATIC_CACHE_NAME = 'expense-tracker-static-v1.0.0';
const DYNAMIC_CACHE_NAME = 'expense-tracker-dynamic-v1.0.0';

// Files to cache immediately
const STATIC_FILES = [
    '/',
    '/static/js/bundle.js',
    '/static/css/main.css',
    '/manifest.json',
    '/favicon.ico',
    '/logo192.png',
    '/logo512.png',
    // Add other static assets
];

// API endpoints that should be cached
const API_CACHE_PATTERNS = [
    // Firebase endpoints will be cached dynamically
];

// Install event - cache static files
self.addEventListener('install', event => {
    console.log('Service Worker: Installing...');

    event.waitUntil(
        caches.open(STATIC_CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Caching static files');
                return cache.addAll(STATIC_FILES.map(url => new Request(url, { credentials: 'same-origin' })));
            })
            .catch(error => {
                console.error('Service Worker: Error caching static files', error);
            })
    );

    // Force the service worker to become active immediately
    self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    console.log('Service Worker: Activating...');

    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        // Delete old caches
                        if (cacheName !== STATIC_CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
                            console.log('Service Worker: Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                // Claim all clients immediately
                return self.clients.claim();
            })
    );
});

// Fetch event - serve cached files or fetch from network
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Skip chrome-extension requests
    if (url.protocol === 'chrome-extension:') {
        return;
    }

    // Handle different types of requests
    if (isStaticAsset(request)) {
        // Static assets - cache first strategy
        event.respondWith(cacheFirst(request));
    } else if (isAPIRequest(request)) {
        // API requests - network first strategy
        event.respondWith(networkFirst(request));
    } else if (isNavigationRequest(request)) {
        // Navigation requests - network first with fallback to cached index.html
        event.respondWith(navigationHandler(request));
    } else {
        // Other requests - network first strategy
        event.respondWith(networkFirst(request));
    }
});

// Cache first strategy - good for static assets
async function cacheFirst(request) {
    try {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }

        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(STATIC_CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        console.error('Cache first strategy failed:', error);
        // Return a fallback response or throw the error
        throw error;
    }
}

// Network first strategy - good for API requests and dynamic content
async function networkFirst(request) {
    try {
        const networkResponse = await fetch(request);

        if (networkResponse.ok) {
            // Cache successful responses
            const cache = await caches.open(DYNAMIC_CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        console.log('Network first: Network failed, trying cache for:', request.url);

        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }

        // If it's an API request, return a meaningful offline response
        if (isAPIRequest(request)) {
            return new Response(
                JSON.stringify({
                    error: 'Network unavailable',
                    offline: true,
                    message: 'You are offline. Some features may not be available.'
                }),
                {
                    status: 503,
                    statusText: 'Service Unavailable',
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }

        throw error;
    }
}

// Navigation handler - for page requests
async function navigationHandler(request) {
    try {
        const networkResponse = await fetch(request);
        return networkResponse;
    } catch (error) {
        console.log('Navigation: Network failed, serving cached index.html');

        // Try to serve cached index.html for navigation requests
        const cachedResponse = await caches.match('/');
        if (cachedResponse) {
            return cachedResponse;
        }

        // If no cached index.html, return offline page
        return new Response(
            `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Offline - Expense Tracker</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              text-align: center; 
              padding: 50px; 
              background: #f9fafb;
            }
            .container { 
              max-width: 400px; 
              margin: 0 auto; 
              background: white; 
              padding: 40px; 
              border-radius: 8px; 
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            h1 { color: #374151; margin-bottom: 20px; }
            p { color: #6b7280; line-height: 1.6; }
            .icon { font-size: 48px; margin-bottom: 20px; }
            button { 
              background: #4f46e5; 
              color: white; 
              border: none; 
              padding: 12px 24px; 
              border-radius: 6px; 
              cursor: pointer; 
              font-size: 16px;
              margin-top: 20px;
            }
            button:hover { background: #4338ca; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">📊</div>
            <h1>You're Offline</h1>
            <p>Expense Tracker is not available right now. Please check your internet connection and try again.</p>
            <button onclick="window.location.reload()">Try Again</button>
          </div>
        </body>
      </html>
      `,
            {
                status: 200,
                headers: { 'Content-Type': 'text/html' }
            }
        );
    }
}

// Helper functions
function isStaticAsset(request) {
    const url = new URL(request.url);
    return url.pathname.startsWith('/static/') ||
        url.pathname.endsWith('.js') ||
        url.pathname.endsWith('.css') ||
        url.pathname.endsWith('.png') ||
        url.pathname.endsWith('.jpg') ||
        url.pathname.endsWith('.jpeg') ||
        url.pathname.endsWith('.svg') ||
        url.pathname.endsWith('.ico') ||
        url.pathname.endsWith('.woff') ||
        url.pathname.endsWith('.woff2');
}

function isAPIRequest(request) {
    const url = new URL(request.url);
    return url.hostname.includes('firebase') ||
        url.pathname.startsWith('/api/') ||
        url.hostname.includes('googleapis.com');
}

function isNavigationRequest(request) {
    return request.mode === 'navigate' ||
        (request.method === 'GET' && request.headers.get('accept').includes('text/html'));
}

// Background sync for offline actions
self.addEventListener('sync', event => {
    console.log('Service Worker: Background sync triggered', event.tag);

    if (event.tag === 'expense-sync') {
        event.waitUntil(syncExpenses());
    }
});

async function syncExpenses() {
    try {
        // Get pending expenses from IndexedDB
        const pendingExpenses = await getPendingExpenses();

        // Sync each pending expense
        for (const expense of pendingExpenses) {
            try {
                // Attempt to sync the expense
                await syncExpense(expense);
                // Remove from pending if successful
                await removePendingExpense(expense.id);
            } catch (error) {
                console.error('Failed to sync expense:', expense.id, error);
            }
        }
    } catch (error) {
        console.error('Background sync failed:', error);
    }
}

// Placeholder functions for IndexedDB operations
async function getPendingExpenses() {
    // Implementation would get pending expenses from IndexedDB
    return [];
}

async function syncExpense(expense) {
    // Implementation would sync expense to Firebase
    console.log('Syncing expense:', expense);
}

async function removePendingExpense(expenseId) {
    // Implementation would remove expense from IndexedDB
    console.log('Removing pending expense:', expenseId);
}

// Push notification handler
self.addEventListener('push', event => {
    console.log('Service Worker: Push notification received');

    const options = {
        body: event.data ? event.data.text() : 'New update available!',
        icon: '/logo192.png',
        badge: '/badge-72x72.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: 'Open App',
                icon: '/icon-open.png'
            },
            {
                action: 'close',
                title: 'Close',
                icon: '/icon-close.png'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification('Expense Tracker', options)
    );
});

// Notification click handler
self.addEventListener('notificationclick', event => {
    console.log('Service Worker: Notification clicked', event);

    event.notification.close();

    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// Message handler for communication with main app
self.addEventListener('message', event => {
    console.log('Service Worker: Message received', event.data);

    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// Error handler
self.addEventListener('error', event => {
    console.error('Service Worker error:', event.error);
});

// Unhandled rejection handler
self.addEventListener('unhandledrejection', event => {
    console.error('Service Worker unhandled rejection:', event.reason);
    event.preventDefault();
});