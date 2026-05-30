import {
  BookOpen,
  ClipboardList,
  GraduationCap,
  TrendingUp,
} from 'lucide-react';

import { Badge } from '@kit/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import { Trans } from '@kit/ui/trans';

function PreviewStat({
  label,
  value,
  icon,
}: {
  label: React.ReactNode;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

export function MarketingHeroPreview() {
  return (
    <div className="relative w-full max-w-4xl">
      <div
        aria-hidden
        className="bg-primary/20 absolute -inset-4 -z-10 rounded-3xl blur-3xl"
      />

      <div className="bg-card rounded-2xl border p-4 shadow-2xl md:p-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold">Edutify</p>
            <p className="text-muted-foreground text-xs">
              <Trans i18nKey="marketing:heroPreviewWorkspace" />
            </p>
          </div>
          <Badge variant="secondary">
            <Trans i18nKey="marketing:heroPreviewBadge" />
          </Badge>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <PreviewStat
            label={<Trans i18nKey="marketing:heroPreviewStudents" />}
            value="128"
            icon={
              <GraduationCap className="text-muted-foreground size-4" />
            }
          />
          <PreviewStat
            label={<Trans i18nKey="marketing:heroPreviewExams" />}
            value="24"
            icon={
              <ClipboardList className="text-muted-foreground size-4" />
            }
          />
          <PreviewStat
            label={<Trans i18nKey="marketing:heroPreviewQuestions" />}
            value="1.2k"
            icon={<BookOpen className="text-muted-foreground size-4" />}
          />
          <PreviewStat
            label={<Trans i18nKey="marketing:heroPreviewPassRate" />}
            value="87%"
            icon={<TrendingUp className="text-muted-foreground size-4" />}
          />
        </div>

        <Card className="mt-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              <Trans i18nKey="marketing:heroPreviewRecentTitle" />
            </CardTitle>
            <CardDescription>
              <Trans i18nKey="marketing:heroPreviewRecentDescription" />
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <div className="bg-muted/50 flex items-center justify-between rounded-lg px-3 py-2 text-sm">
              <span>
                <Trans i18nKey="marketing:heroPreviewRecentItem1" />
              </span>
              <Badge>9.5/10</Badge>
            </div>
            <div className="bg-muted/50 flex items-center justify-between rounded-lg px-3 py-2 text-sm">
              <span>
                <Trans i18nKey="marketing:heroPreviewRecentItem2" />
              </span>
              <Badge variant="outline">8/10</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
