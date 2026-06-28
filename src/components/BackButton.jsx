/**
 * Back navigation — returns to location.state.from or a sensible default parent route.
 */

import { ArrowLeft } from 'lucide-react';
import { useNavigateBack } from '../lib/navigation';

export default function BackButton({
  to,
  label = 'Back',
  className = 'flex items-center gap-2 text-ink-secondary hover:text-ink mb-6 transition-colors',
  iconClassName = 'w-5 h-5',
}) {
  const { goBack } = useNavigateBack(to);

  return (
    <button type="button" onClick={goBack} className={className}>
      <ArrowLeft className={iconClassName} />
      {label}
    </button>
  );
}
