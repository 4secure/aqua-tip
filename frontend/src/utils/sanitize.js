import DOMPurify from 'dompurify';

// Register hook once at module scope — NOT inside a component.
// Forces rel="noopener noreferrer" and removes target on all anchor elements.
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('rel', 'noopener noreferrer');
    node.removeAttribute('target');
  }
});

export function sanitizeHtml(dirty, options = {}) {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'br', 'code', 'a'],
    ALLOWED_ATTR: ['href', 'rel'],
    ...options,
  });
}
