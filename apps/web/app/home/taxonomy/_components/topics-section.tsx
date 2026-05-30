'use client';

import { useState, useTransition } from 'react';

import { ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

import { Button } from '@kit/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@kit/ui/dialog';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import { Trans } from '@kit/ui/trans';

import {
  createTopicAction,
  deleteTopicAction,
  updateTopicAction,
} from '~/lib/lms/topics/server-actions';
import {
  buildTopicTree,
  type TopicRow,
  type TopicTreeNode,
} from '~/lib/lms/topics/topic-tree';

interface SubjectItem {
  id: string;
  name: string;
  code: string;
}

interface TopicsSectionProps {
  subjects: SubjectItem[];
  topics: TopicRow[];
}

function TopicTreeNodeView({
  node,
  depth,
  pending,
  onEdit,
  onDelete,
  onAddChild,
}: {
  node: TopicTreeNode;
  depth: number;
  pending: boolean;
  onEdit: (topic: TopicRow) => void;
  onDelete: (id: string) => void;
  onAddChild: (parentId: string) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 1);

  return (
    <div className={'flex flex-col'}>
      <div
        className={'flex items-center justify-between rounded-md border px-2 py-1.5'}
        style={{ marginLeft: depth * 16 }}
      >
        <div className={'flex items-center gap-1'}>
          {node.children.length > 0 ?
            <button
              type={'button'}
              className={'text-muted-foreground p-0.5'}
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ?
                <ChevronDown className={'size-4'} />
              : <ChevronRight className={'size-4'} />}
            </button>
          : <span className={'inline-block w-5'} />}
          <span className={'text-sm'}>{node.name}</span>
        </div>
        <div className={'flex gap-0.5'}>
          <Button
            variant={'ghost'}
            size={'icon'}
            className={'size-7'}
            disabled={pending}
            onClick={() => onAddChild(node.id)}
          >
            <Plus className={'size-3'} />
          </Button>
          <Button
            variant={'ghost'}
            size={'icon'}
            className={'size-7'}
            disabled={pending}
            onClick={() => onEdit(node)}
          >
            <Pencil className={'size-3'} />
          </Button>
          <Button
            variant={'ghost'}
            size={'icon'}
            className={'size-7'}
            disabled={pending}
            onClick={() => onDelete(node.id)}
          >
            <Trash2 className={'size-3'} />
          </Button>
        </div>
      </div>
      {expanded &&
        node.children.map((child) => (
          <TopicTreeNodeView
            key={child.id}
            node={child}
            depth={depth + 1}
            pending={pending}
            onEdit={onEdit}
            onDelete={onDelete}
            onAddChild={onAddChild}
          />
        ))}
    </div>
  );
}

export function TopicsSection({ subjects, topics }: TopicsSectionProps) {
  const { t } = useTranslation('lms');
  const [pending, startTransition] = useTransition();
  const [expandedSubjectId, setExpandedSubjectId] = useState<string | null>(
    subjects[0]?.id ?? null,
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [createSubjectId, setCreateSubjectId] = useState(subjects[0]?.id ?? '');
  const [createParentId, setCreateParentId] = useState<string | null>(null);
  const [newTopicName, setNewTopicName] = useState('');
  const [editTopic, setEditTopic] = useState<TopicRow | null>(null);
  const [editName, setEditName] = useState('');

  const openCreate = (subjectId: string, parentId: string | null = null) => {
    setCreateSubjectId(subjectId);
    setCreateParentId(parentId);
    setNewTopicName('');
    setCreateOpen(true);
  };

  const onCreate = () => {
    if (!newTopicName.trim() || !createSubjectId) return;

    startTransition(async () => {
      try {
        await createTopicAction({
          subjectId: createSubjectId,
          parentId: createParentId,
          name: newTopicName.trim(),
        });
        toast.success(t('toast.topicCreated'));
        setCreateOpen(false);
      } catch {
        toast.error(t('toast.topicCreateFailed'));
      }
    });
  };

  const onUpdate = () => {
    if (!editTopic || !editName.trim()) return;

    startTransition(async () => {
      try {
        await updateTopicAction({ id: editTopic.id, name: editName.trim() });
        toast.success(t('toast.topicUpdated'));
        setEditTopic(null);
      } catch {
        toast.error(t('toast.topicUpdateFailed'));
      }
    });
  };

  const onDelete = (id: string) => {
    if (!window.confirm('Delete this topic?')) return;

    startTransition(async () => {
      try {
        await deleteTopicAction({ id });
        toast.success(t('toast.topicDeleted'));
      } catch {
        toast.error(t('toast.topicDeleteFailed'));
      }
    });
  };

  return (
    <div className={'flex flex-col gap-3'}>
      {subjects.length === 0 ?
        <p className={'text-muted-foreground text-sm'}>
          <Trans i18nKey={'lms:taxonomy.emptySubjects'} />
        </p>
      : subjects.map((subject) => {
          const tree = buildTopicTree(topics, subject.id);
          const isExpanded = expandedSubjectId === subject.id;

          return (
            <div key={subject.id} className={'rounded-md border'}>
              <button
                type={'button'}
                className={
                  'hover:bg-muted/50 flex w-full items-center justify-between px-3 py-2 text-left'
                }
                onClick={() =>
                  setExpandedSubjectId(isExpanded ? null : subject.id)
                }
              >
                <span className={'font-medium'}>
                  {subject.name}{' '}
                  <span className={'text-muted-foreground text-xs'}>
                    ({subject.code})
                  </span>
                </span>
                <div className={'flex items-center gap-2'}>
                  <Button
                    type={'button'}
                    variant={'outline'}
                    size={'sm'}
                    onClick={(e) => {
                      e.stopPropagation();
                      openCreate(subject.id, null);
                    }}
                  >
                    <Plus className={'mr-1 size-3'} />
                    <Trans i18nKey={'lms:taxonomy.addTopic'} />
                  </Button>
                  {isExpanded ?
                    <ChevronDown className={'size-4'} />
                  : <ChevronRight className={'size-4'} />}
                </div>
              </button>
              {isExpanded && (
                <div className={'flex flex-col gap-2 border-t p-3'}>
                  {tree.length === 0 ?
                    <p className={'text-muted-foreground text-sm'}>
                      <Trans i18nKey={'lms:taxonomy.emptyTopics'} />
                    </p>
                  : tree.map((node) => (
                      <TopicTreeNodeView
                        key={node.id}
                        node={node}
                        depth={0}
                        pending={pending}
                        onEdit={(topic) => {
                          setEditTopic(topic);
                          setEditName(topic.name);
                        }}
                        onDelete={onDelete}
                        onAddChild={(parentId) =>
                          openCreate(subject.id, parentId)
                        }
                      />
                    ))
                  }
                </div>
              )}
            </div>
          );
        })
      }

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <Trans i18nKey={'lms:taxonomy.addTopic'} />
            </DialogTitle>
          </DialogHeader>
          <div className={'flex flex-col gap-4'}>
            <div className={'flex flex-col gap-2'}>
              <Label>
                <Trans i18nKey={'lms:taxonomy.topicName'} />
              </Label>
              <Input
                value={newTopicName}
                onChange={(e) => setNewTopicName(e.target.value)}
              />
            </div>
            {createParentId && (
              <p className={'text-muted-foreground text-sm'}>
                <Trans i18nKey={'lms:taxonomy.subTopicHint'} />
              </p>
            )}
            <Button onClick={onCreate} disabled={pending || !newTopicName.trim()}>
              <Trans i18nKey={'lms:common.create'} />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editTopic != null}
        onOpenChange={(open) => {
          if (!open) setEditTopic(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <Trans i18nKey={'lms:taxonomy.editTopic'} />
            </DialogTitle>
          </DialogHeader>
          <div className={'flex flex-col gap-4'}>
            <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            <Button onClick={onUpdate} disabled={pending || !editName.trim()}>
              <Trans i18nKey={'lms:common.save'} />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
