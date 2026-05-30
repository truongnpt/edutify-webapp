'use client';

import { useEffect, useTransition } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { useFieldArray, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Button } from '@kit/ui/button';
import { Checkbox } from '@kit/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@kit/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@kit/ui/form';
import { Input } from '@kit/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { Textarea } from '@kit/ui/textarea';
import { Trans } from '@kit/ui/trans';

import {
  CreateQuestionSchema,
  UpdateQuestionSchema,
  type CreateQuestionInput,
  type UpdateQuestionInput,
} from '~/lib/lms/questions/schemas/question.schema';
import {
  createQuestionAction,
  updateQuestionAction,
} from '~/lib/lms/questions/server-actions';
import {
  QUESTION_TYPE_LABELS,
  getDefaultMatchingPairs,
  getDefaultOptions,
  getDefaultOrderingItems,
  isAcceptedAnswersType,
  isCodingType,
  isFixedOptionType,
  isLabelingType,
  isMatchingOrLabelingType,
  isOpenFileType,
  isOpenTextType,
  isOrderingType,
} from '~/lib/lms/questions/question-form-utils';

type QuestionFormValues = CreateQuestionInput | UpdateQuestionInput;

interface QuestionFormDialogProps {
  bankId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  initialValues?: UpdateQuestionInput;
  availableTags?: Array<{ id: string; name: string }>;
  availableGroups?: Array<{ id: string; title: string }>;
}

export function QuestionFormDialog({
  bankId,
  open,
  onOpenChange,
  mode,
  initialValues,
  availableTags = [],
  availableGroups = [],
}: QuestionFormDialogProps) {
  const { t } = useTranslation('lms');
  const [pending, startTransition] = useTransition();
  const isEdit = mode === 'edit';

  const form = useForm<QuestionFormValues>({
    resolver: zodResolver(isEdit ? UpdateQuestionSchema : CreateQuestionSchema),
    defaultValues: {
      bankId,
      type: 'single_choice',
      content: '',
      explanation: '',
      difficulty: 'medium',
      options: getDefaultOptions('single_choice'),
      matchingPairs: getDefaultMatchingPairs(),
      orderingItems: getDefaultOrderingItems(),
      tagIds: [],
    },
  });

  const selectedTagIds = form.watch('tagIds') ?? [];

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: 'options',
  });

  const {
    fields: matchingFields,
    append: appendMatching,
    remove: removeMatching,
    replace: replaceMatching,
  } = useFieldArray({
    control: form.control,
    name: 'matchingPairs',
  });

  const {
    fields: orderingFields,
    append: appendOrdering,
    remove: removeOrdering,
    move: moveOrdering,
    replace: replaceOrdering,
  } = useFieldArray({
    control: form.control,
    name: 'orderingItems',
  });

  const {
    fields: rubricFields,
    append: appendRubric,
    remove: removeRubric,
    replace: replaceRubric,
  } = useFieldArray({
    control: form.control,
    name: 'rubricCriteria',
  });

  const questionType = form.watch('type');
  const scoringMode = form.watch('scoringMode');

  useEffect(() => {
    if (!open) return;

    if (isEdit && initialValues) {
      form.reset(initialValues);
    } else if (!isEdit) {
      form.reset({
        bankId,
        type: 'single_choice',
        content: '',
        explanation: '',
        difficulty: 'medium',
        options: getDefaultOptions('single_choice'),
        matchingPairs: getDefaultMatchingPairs(),
        orderingItems: getDefaultOrderingItems(),
        tagIds: [],
        allowCalculator: false,
        scoringMode: 'simple',
        questionScore: 1,
        wrongScore: 0,
        mediaUrl: '',
        codeLanguage: '',
        rubricCriteria: [{ content: '' }],
      });
    }
  }, [open, isEdit, initialValues, bankId, form]);

  const handleTypeChange = (type: CreateQuestionInput['type']) => {
    form.setValue('type', type);

    if (isMatchingOrLabelingType(type)) {
      replaceMatching(getDefaultMatchingPairs());
    } else if (isOrderingType(type)) {
      replaceOrdering(getDefaultOrderingItems());
    } else {
      replace(getDefaultOptions(type));
    }
  };

  const onSubmit = (data: QuestionFormValues) => {
    startTransition(async () => {
      try {
        if (isEdit && 'id' in data) {
          await updateQuestionAction(data as UpdateQuestionInput);
          toast.success(t('toast.questionUpdated'));
        } else {
          await createQuestionAction(data as CreateQuestionInput);
          toast.success(t('toast.questionCreated'));
        }

        onOpenChange(false);
      } catch (error) {
        const message =
          error instanceof Error && error.message.includes('PLAN_LIMIT')
            ? t('toast.questionLimitReached')
          : isEdit ? t('toast.questionUpdateFailed')
          : t('toast.questionCreateFailed');
        toast.error(message);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={'max-h-[90vh] overflow-y-auto sm:max-w-2xl'}>
        <DialogHeader>
          <DialogTitle>
            {isEdit ?
              <Trans i18nKey={'lms:questions.editQuestion'} />
            : <Trans i18nKey={'lms:questions.createQuestion'} />}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className={'flex flex-col gap-4'}
          >
            <FormField
              control={form.control}
              name={'type'}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    <Trans i18nKey={'lms:questions.typeLabel'} />
                  </FormLabel>
                  <Select
                    value={field.value}
                    disabled={isEdit}
                    onValueChange={(v) =>
                      handleTypeChange(v as CreateQuestionInput['type'])
                    }
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(QUESTION_TYPE_LABELS).map(
                        ([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name={'content'}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    <Trans i18nKey={'lms:questions.contentLabel'} />
                  </FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={4} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name={'difficulty'}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    <Trans i18nKey={'lms:questions.difficultyLabel'} />
                  </FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={'easy'}>Easy</SelectItem>
                      <SelectItem value={'medium'}>Medium</SelectItem>
                      <SelectItem value={'hard'}>Hard</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {questionType === 'coding' && (
              <FormField
                control={form.control}
                name={'codeLanguage'}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <Trans i18nKey={'lms:questions.codeLanguageLabel'} />
                    </FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={'javascript, python, sql...'} />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}

            {isLabelingType(questionType) && (
              <FormField
                control={form.control}
                name={'mediaUrl'}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <Trans i18nKey={'lms:questions.mediaUrlLabel'} />
                    </FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={'https://...'} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {isMatchingOrLabelingType(questionType) && (
              <div className={'flex flex-col gap-3'}>
                <div className={'flex items-center justify-between'}>
                  <FormLabel>
                    {isLabelingType(questionType) ?
                      <Trans i18nKey={'lms:questions.labelingPairsLabel'} />
                    : <Trans i18nKey={'lms:questions.matchingPairsLabel'} />}
                  </FormLabel>
                  <Button
                    type={'button'}
                    variant={'outline'}
                    size={'sm'}
                    onClick={() => appendMatching({ left: '', right: '' })}
                  >
                    <Plus className={'mr-1 size-4'} />
                    <Trans i18nKey={'lms:questions.addPair'} />
                  </Button>
                </div>

                {matchingFields.map((field, index) => (
                  <div key={field.id} className={'flex items-start gap-2'}>
                    <FormField
                      control={form.control}
                      name={`matchingPairs.${index}.left`}
                      render={({ field: leftField }) => (
                        <FormItem className={'flex-1'}>
                          <FormControl>
                            <Input
                              {...leftField}
                              placeholder={
                                isLabelingType(questionType) ? 'Label' : 'Left'
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`matchingPairs.${index}.right`}
                      render={({ field: rightField }) => (
                        <FormItem className={'flex-1'}>
                          <FormControl>
                            <Input
                              {...rightField}
                              placeholder={
                                isLabelingType(questionType) ? 'Target' : 'Right'
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {matchingFields.length > 2 && (
                      <Button
                        type={'button'}
                        variant={'ghost'}
                        size={'icon'}
                        onClick={() => removeMatching(index)}
                      >
                        <Trash2 className={'size-4'} />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {isOrderingType(questionType) && (
              <div className={'flex flex-col gap-3'}>
                <div className={'flex items-center justify-between'}>
                  <FormLabel>
                    <Trans i18nKey={'lms:questions.orderingItemsLabel'} />
                  </FormLabel>
                  <Button
                    type={'button'}
                    variant={'outline'}
                    size={'sm'}
                    onClick={() => appendOrdering({ content: '' })}
                  >
                    <Plus className={'mr-1 size-4'} />
                    <Trans i18nKey={'lms:questions.addItem'} />
                  </Button>
                </div>

                {orderingFields.map((field, index) => (
                  <div key={field.id} className={'flex items-start gap-2'}>
                    <span className={'text-muted-foreground pt-2 text-sm'}>
                      {index + 1}.
                    </span>
                    <FormField
                      control={form.control}
                      name={`orderingItems.${index}.content`}
                      render={({ field: itemField }) => (
                        <FormItem className={'flex-1'}>
                          <FormControl>
                            <Input {...itemField} placeholder={'Item'} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type={'button'}
                      variant={'ghost'}
                      size={'icon'}
                      disabled={index === 0}
                      onClick={() => moveOrdering(index, index - 1)}
                    >
                      <ArrowUp className={'size-4'} />
                    </Button>
                    <Button
                      type={'button'}
                      variant={'ghost'}
                      size={'icon'}
                      disabled={index === orderingFields.length - 1}
                      onClick={() => moveOrdering(index, index + 1)}
                    >
                      <ArrowDown className={'size-4'} />
                    </Button>
                    {orderingFields.length > 2 && (
                      <Button
                        type={'button'}
                        variant={'ghost'}
                        size={'icon'}
                        onClick={() => removeOrdering(index)}
                      >
                        <Trash2 className={'size-4'} />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {isAcceptedAnswersType(questionType) && (
              <div className={'flex flex-col gap-3'}>
                <div className={'flex items-center justify-between'}>
                  <FormLabel>
                    <Trans
                      i18nKey={
                        questionType === 'short_answer' ?
                          'lms:questions.acceptedAnswersLabel'
                        : 'lms:questions.optionsLabel'
                      }
                    />
                  </FormLabel>
                  <Button
                    type={'button'}
                    variant={'outline'}
                    size={'sm'}
                    onClick={() =>
                      append({
                        content: '',
                        isCorrect: true,
                        sortOrder: fields.length,
                      })
                    }
                  >
                    <Plus className={'mr-1 size-4'} />
                    <Trans i18nKey={'lms:questions.addAnswer'} />
                  </Button>
                </div>

                {fields.map((field, index) => (
                  <div key={field.id} className={'flex items-start gap-2'}>
                    <FormField
                      control={form.control}
                      name={`options.${index}.content`}
                      render={({ field: contentField }) => (
                        <FormItem className={'flex-1'}>
                          <FormControl>
                            <Input
                              {...contentField}
                              placeholder={`Answer ${index + 1}`}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {fields.length > 1 && (
                      <Button
                        type={'button'}
                        variant={'ghost'}
                        size={'icon'}
                        onClick={() => remove(index)}
                      >
                        <Trash2 className={'size-4'} />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {!isMatchingOrLabelingType(questionType) &&
              !isOrderingType(questionType) &&
              !isAcceptedAnswersType(questionType) &&
              !isOpenTextType(questionType) &&
              !isOpenFileType(questionType) && (
                <div className={'flex flex-col gap-3'}>
                  <div className={'flex items-center justify-between'}>
                    <FormLabel>
                      <Trans i18nKey={'lms:questions.optionsLabel'} />
                    </FormLabel>
                    {questionType !== 'true_false' &&
                      !isFixedOptionType(questionType) && (
                      <Button
                        type={'button'}
                        variant={'outline'}
                        size={'sm'}
                        onClick={() =>
                          append({
                            content: '',
                            isCorrect: false,
                            sortOrder: fields.length,
                          })
                        }
                      >
                        <Plus className={'mr-1 size-4'} />
                        Add option
                      </Button>
                    )}
                  </div>

                  {fields.map((field, index) => (
                    <div key={field.id} className={'flex items-start gap-2'}>
                      <FormField
                        control={form.control}
                        name={`options.${index}.isCorrect`}
                        render={({ field: checkField }) => (
                          <FormItem className={'pt-2'}>
                            <FormControl>
                              <Checkbox
                                checked={checkField.value}
                                onCheckedChange={checkField.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`options.${index}.content`}
                        render={({ field: contentField }) => (
                          <FormItem className={'flex-1'}>
                            <FormControl>
                              <Input
                                {...contentField}
                                placeholder={`Option ${index + 1}`}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {fields.length > 2 &&
                        !isFixedOptionType(questionType) && (
                        <Button
                          type={'button'}
                          variant={'ghost'}
                          size={'icon'}
                          onClick={() => remove(index)}
                        >
                          <Trash2 className={'size-4'} />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}

            {availableGroups.length > 0 && (
              <FormField
                control={form.control}
                name={'questionGroupId'}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <Trans i18nKey={'lms:questions.groupLabel'} />
                    </FormLabel>
                    <Select
                      value={field.value ?? 'none'}
                      onValueChange={(value) =>
                        field.onChange(value === 'none' ? null : value)
                      }
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={'none'}>
                          <Trans i18nKey={'lms:questionGroups.noGroup'} />
                        </SelectItem>
                        {availableGroups.map((group) => (
                          <SelectItem key={group.id} value={group.id}>
                            {group.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            )}

            {availableTags.length > 0 && (
              <div className={'flex flex-col gap-2'}>
                <FormLabel>
                  <Trans i18nKey={'lms:taxonomy.tagsTitle'} />
                </FormLabel>
                <div className={'flex flex-wrap gap-2'}>
                  {availableTags.map((tag) => {
                    const checked = selectedTagIds.includes(tag.id);

                    return (
                      <label
                        key={tag.id}
                        className={
                          checked ?
                            'cursor-pointer rounded-full border border-primary bg-primary/10 px-3 py-1 text-sm'
                          : 'cursor-pointer rounded-full border px-3 py-1 text-sm'
                        }
                      >
                        <input
                          type={'checkbox'}
                          className={'mr-2'}
                          checked={checked}
                          onChange={(e) => {
                            const next =
                              e.target.checked ?
                                [...selectedTagIds, tag.id]
                              : selectedTagIds.filter((id) => id !== tag.id);
                            form.setValue('tagIds', next);
                          }}
                        />
                        {tag.name}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div className={'rounded-md border p-4'}>
              <p className={'mb-3 text-sm font-medium'}>
                <Trans i18nKey={'lms:questions.advancedSettingsTitle'} />
              </p>
              <div className={'flex flex-col gap-4'}>
                <FormField
                  control={form.control}
                  name={'allowCalculator'}
                  render={({ field }) => (
                    <FormItem className={'flex items-center gap-2 space-y-0'}>
                      <FormControl>
                        <Checkbox
                          checked={field.value ?? false}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className={'font-normal'}>
                        <Trans i18nKey={'lms:questions.allowCalculatorLabel'} />
                      </FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={'timeLimitSeconds'}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <Trans i18nKey={'lms:questions.timeLimitLabel'} />
                      </FormLabel>
                      <FormControl>
                        <Input
                          type={'number'}
                          min={0}
                          value={field.value ?? ''}
                          onChange={(e) => {
                            const val = e.target.value;

                            field.onChange(val === '' ? undefined : Number(val));
                          }}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <div className={'grid gap-4 sm:grid-cols-3'}>
                  <FormField
                    control={form.control}
                    name={'scoringMode'}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          <Trans i18nKey={'lms:questions.scoringModeLabel'} />
                        </FormLabel>
                        <Select value={field.value ?? 'simple'} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value={'simple'}>
                              <Trans i18nKey={'lms:questions.scoringSimple'} />
                            </SelectItem>
                            <SelectItem value={'negative'}>
                              <Trans i18nKey={'lms:questions.scoringNegative'} />
                            </SelectItem>
                            <SelectItem value={'rubric'}>
                              <Trans i18nKey={'lms:questions.scoringRubric'} />
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={'questionScore'}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          <Trans i18nKey={'lms:questions.questionScoreLabel'} />
                        </FormLabel>
                        <FormControl>
                          <Input
                            type={'number'}
                            min={0}
                            step={0.5}
                            value={field.value ?? 1}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  {scoringMode === 'negative' && (
                    <FormField
                      control={form.control}
                      name={'wrongScore'}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            <Trans i18nKey={'lms:questions.wrongScoreLabel'} />
                          </FormLabel>
                          <FormControl>
                            <Input
                              type={'number'}
                              max={0}
                              step={0.5}
                              value={field.value ?? 0}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  )}
                </div>
                {scoringMode === 'rubric' && (
                  <div className={'flex flex-col gap-3'}>
                    <div className={'flex items-center justify-between'}>
                      <FormLabel>
                        <Trans i18nKey={'lms:questions.rubricCriteriaLabel'} />
                      </FormLabel>
                      <Button
                        type={'button'}
                        variant={'outline'}
                        size={'sm'}
                        onClick={() => appendRubric({ content: '' })}
                      >
                        <Plus className={'mr-1 size-4'} />
                        <Trans i18nKey={'lms:questions.addCriterion'} />
                      </Button>
                    </div>
                    {rubricFields.map((field, index) => (
                      <div key={field.id} className={'flex items-start gap-2'}>
                        <FormField
                          control={form.control}
                          name={`rubricCriteria.${index}.content`}
                          render={({ field: criterionField }) => (
                            <FormItem className={'flex-1'}>
                              <FormControl>
                                <Input {...criterionField} placeholder={`Criterion ${index + 1}`} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        {rubricFields.length > 1 && (
                          <Button
                            type={'button'}
                            variant={'ghost'}
                            size={'icon'}
                            onClick={() => removeRubric(index)}
                          >
                            <Trash2 className={'size-4'} />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <FormField
              control={form.control}
              name={'explanation'}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    <Trans i18nKey={'lms:questions.explanationLabel'} />
                  </FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type={'submit'} disabled={pending}>
              {isEdit ?
                <Trans i18nKey={'lms:common.save'} />
              : <Trans i18nKey={'lms:common.create'} />}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
