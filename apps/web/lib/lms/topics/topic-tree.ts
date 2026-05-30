export type TopicRow = {
  id: string;
  subject_id: string;
  parent_id: string | null;
  name: string;
};

export type TopicTreeNode = TopicRow & { children: TopicTreeNode[] };

export function buildTopicTree(topics: TopicRow[], subjectId: string): TopicTreeNode[] {
  const filtered = topics.filter((t) => t.subject_id === subjectId);
  const byParent = new Map<string | null, TopicRow[]>();

  for (const topic of filtered) {
    const key = topic.parent_id;
    const list = byParent.get(key) ?? [];
    list.push(topic);
    byParent.set(key, list);
  }

  const build = (parentId: string | null): TopicTreeNode[] =>
    (byParent.get(parentId) ?? [])
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((topic) => ({
        ...topic,
        children: build(topic.id),
      }));

  return build(null);
}
