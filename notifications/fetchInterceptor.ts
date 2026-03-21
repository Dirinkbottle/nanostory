import { getNotificationSessionId } from './client';

let installed = false;

export function installNotificationFetchInterceptor() {
  if (installed || typeof window === 'undefined') {
    return;
  }

  installed = true;
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const sessionId = getNotificationSessionId();
    if (!sessionId) {
      return originalFetch(input, init);
    }

    if (input instanceof Request) {
      const headers = new Headers(init?.headers || input.headers);
      headers.set('X-Notification-Session-Id', sessionId);
      const request = new Request(input, {
        ...init,
        headers
      });
      return originalFetch(request);
    }

    const headers = new Headers(init?.headers);
    headers.set('X-Notification-Session-Id', sessionId);
    return originalFetch(input, {
      ...init,
      headers
    });
  };
}
