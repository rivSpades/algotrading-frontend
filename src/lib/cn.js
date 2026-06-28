/**
 * Merge class names (Tailwind-friendly).
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}
