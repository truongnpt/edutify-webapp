import { cn } from '../../lib/utils';

interface HeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  logo?: React.ReactNode;
  navigation?: React.ReactNode;
  actions?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = function ({
  className,
  logo,
  navigation,
  actions,
  ...props
}) {
  return (
    <div
      className={cn(
        'site-header bg-background/80 dark:bg-background/50 sticky top-0 z-10 w-full py-1 backdrop-blur-md',
        className,
      )}
      {...props}
    >
      <div className="container">
        <div className="grid h-14 grid-cols-2 md:grid-cols-5 lg:grid-cols-3 items-center">
          <div className={'mx-0'}>{logo}</div>
          <div className="order-last md:order-none flex items-center justify-end gap-x-2 md:col-span-2 lg:col-span-1"><div className="md:hidden">{actions}</div>{navigation} </div>
          <div className="flex items-center justify-end gap-x-2 hidden md:block md:col-span-2 lg:col-span-1">{actions}</div>
        </div>
      </div>
    </div>
  );
};
