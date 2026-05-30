import Link from 'next/link';

import { cn } from '@kit/ui/utils';
import appConfig from '~/config/app.config';
import Image from 'next/image';

const logo = {
  width: 280,
  height: 85,
  src: '/images/logo/edutify-logo.png',
};

function LogoImage({
  className,
  width = logo.width,
  height = logo.height,
}: {
  className?: string;
  width?: number;
  height?: number;
}) {
  return (
    <Image
      alt={appConfig.name}
      className={cn(
        'h-9 w-auto max-w-[min(100%,220px)] object-contain object-left sm:h-10 lg:h-11',
        className,
      )}
      height={height}
      priority
      src={logo.src}
      width={width}
    />
  );
}

export function AppLogo({
  href,
  label,
  className,
}: {
  href?: string | null;
  className?: string;
  label?: string;
}) {
  if (href === null) {
    return <LogoImage className={className} />;
  }

  return (
    <Link aria-label={label ?? 'Home Page'} href={href ?? '/'}>
      <LogoImage className={className} />
    </Link>
  );
}
