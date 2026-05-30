'use client';

import { useRef, useState, useTransition } from 'react';

import { FileSpreadsheet, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import * as XLSX from 'xlsx';

import { Button } from '@kit/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@kit/ui/dialog';
import { Trans } from '@kit/ui/trans';

import { importStudentsAction } from '~/lib/lms/students/server-actions';

function parseStudentRows(buffer: ArrayBuffer) {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    return [];
  }

  const sheet = workbook.Sheets[sheetName];

  if (!sheet) {
    return [];
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);

  return rows
    .map((row) => {
      const fullName =
        row.fullName ??
        row['Full Name'] ??
        row['Họ tên'] ??
        row['Ho ten'] ??
        row.name ??
        '';
      const email = row.email ?? row.Email ?? row['E-mail'] ?? '';

      return {
        fullName: String(fullName).trim(),
        email: String(email).trim().toLowerCase(),
      };
    })
    .filter((row) => row.fullName && row.email.includes('@'));
}

export function StudentImportDialog() {
  const { t } = useTranslation('lms');
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [parsedRows, setParsedRows] = useState<
    Array<{ fullName: string; email: string }>
  >([]);

  const handleFile = async (file: File) => {
    const buffer = await file.arrayBuffer();
    const rows = parseStudentRows(buffer);
    setParsedRows(rows);
    setPreviewCount(rows.length);

    if (rows.length === 0) {
      toast.error(t('toast.importNoValidRows'));
    }
  };

  const onImport = () => {
    if (parsedRows.length === 0) return;

    startTransition(async () => {
      try {
        const result = await importStudentsAction({ students: parsedRows });
        toast.success(
          t('toast.studentsImported', {
            imported: result.imported,
            skippedPart:
              result.skipped ?
                t('toast.studentsImportedSkipped', { skipped: result.skipped })
              : '',
          }),
        );
        setOpen(false);
        setParsedRows([]);
        setPreviewCount(null);
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : t('toast.importFailed'),
        );
      }
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);

        if (!next) {
          setParsedRows([]);
          setPreviewCount(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant={'outline'}>
          <Upload className={'mr-2 size-4'} />
          <Trans i18nKey={'lms:students.import'} />
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <Trans i18nKey={'lms:students.importTitle'} />
          </DialogTitle>
          <DialogDescription>
            <Trans i18nKey={'lms:students.importDescription'} />
          </DialogDescription>
        </DialogHeader>

        <div className={'flex flex-col gap-4'}>
          <div
            className={
              'border-muted-foreground/25 flex flex-col items-center gap-3 rounded-lg border border-dashed p-8'
            }
          >
            <FileSpreadsheet className={'text-muted-foreground size-10'} />
            <input
              ref={inputRef}
              type={'file'}
              accept={'.xlsx,.xls,.csv'}
              className={'hidden'}
              onChange={(e) => {
                const file = e.target.files?.[0];

                if (file) void handleFile(file);
              }}
            />
            <Button
              type={'button'}
              variant={'outline'}
              onClick={() => inputRef.current?.click()}
              disabled={pending}
            >
              <Trans i18nKey={'lms:students.chooseFile'} />
            </Button>
            {previewCount != null && (
              <p className={'text-muted-foreground text-sm'}>
                <Trans
                  i18nKey={'lms:students.importPreview'}
                  values={{ count: previewCount }}
                />
              </p>
            )}
          </div>

          <Button
            onClick={onImport}
            disabled={pending || parsedRows.length === 0}
          >
            <Trans i18nKey={'lms:students.importConfirm'} />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
