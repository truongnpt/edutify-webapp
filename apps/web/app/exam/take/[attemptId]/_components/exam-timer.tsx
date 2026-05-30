'use client';

import { useEffect, useState } from 'react';

import { Clock } from 'lucide-react';

import { Trans } from '@kit/ui/trans';

function formatRemaining(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

interface ExamTimerProps {
  expiresAt: string;
  onExpire: () => void;
}

export function ExamTimer({ expiresAt, onExpire }: ExamTimerProps) {
  const [remainingMs, setRemainingMs] = useState(() =>
    Math.max(0, new Date(expiresAt).getTime() - Date.now()),
  );
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const tick = () => {
      const next = Math.max(0, new Date(expiresAt).getTime() - Date.now());
      setRemainingMs(next);

      if (next <= 0 && !expired) {
        setExpired(true);
        onExpire();
      }
    };

    tick();
    const interval = setInterval(tick, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, expired, onExpire]);

  const urgent = remainingMs <= 5 * 60 * 1000;

  return (
    <span
      className={
        urgent ?
          'flex items-center gap-1 font-mono text-sm font-semibold text-destructive'
        : 'text-muted-foreground flex items-center gap-1 font-mono text-sm'
      }
    >
      <Clock className={'size-4'} />
      <Trans i18nKey={'lms:attempt.timeRemaining'} />: {formatRemaining(remainingMs)}
    </span>
  );
}
