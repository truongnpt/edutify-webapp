'use client';

import type { ReactNode } from 'react';

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

import { cn } from '@kit/ui/utils';

interface SortableListProps<T extends { id: string }> {
  items: T[];
  disabled?: boolean;
  className?: string;
  onReorder: (ids: string[]) => void;
  children: (item: T, dragHandle: ReactNode) => ReactNode;
}

function DragHandle({
  id,
  disabled,
}: {
  id: string;
  disabled?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useSortable({
    id,
    disabled,
  });

  return (
    <button
      type={'button'}
      ref={setNodeRef}
      className={
        disabled ?
          'text-muted-foreground cursor-not-allowed p-1'
        : 'text-muted-foreground hover:text-foreground cursor-grab p-1 active:cursor-grabbing'
      }
      aria-label={'Drag to reorder'}
      disabled={disabled}
      style={{ opacity: isDragging ? 0.6 : 1 }}
      {...attributes}
      {...listeners}
    >
      <GripVertical className={'size-4'} />
    </button>
  );
}

function SortableItemShell({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  const { setNodeRef, transform, transition, isDragging } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.85 : 1,
      }}
    >
      {children}
    </div>
  );
}

export function SortableList<T extends { id: string }>({
  items,
  disabled,
  className,
  onReorder,
  children,
}: SortableListProps<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const ids = items.map((item) => item.id);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    onReorder(arrayMove(ids, oldIndex, newIndex));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className={cn('flex flex-col gap-4', className)}>
          {items.map((item) => (
            <SortableItemShell key={item.id} id={item.id}>
              {children(
                item,
                <DragHandle id={item.id} disabled={disabled} />,
              )}
            </SortableItemShell>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
