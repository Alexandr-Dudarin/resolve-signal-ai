import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Sparkles } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { CreateFeedbackSchema, feedbackSources, type CreateFeedbackInput, type FeedbackSource } from "@resolve-signal/contracts";
import type { z } from "zod";
import { api } from "../../shared/api/api-client";
import { feedbackSourceLabels } from "../../shared/config/presentation";
import { Button } from "../../shared/ui/button";
import { Checkbox } from "../../shared/ui/checkbox";
import { Select } from "../../shared/ui/select";
import styles from "./CreateFeedbackForm.module.css";

const sourceOptions = feedbackSources.map((value) => ({
  value,
  label: feedbackSourceLabels[value],
  description: value === "manual" ? "Создано в ResolveSignal" : undefined,
}));

const ratingLabel = (rating: number) => {
  if (rating === 1) return "1 звезда";
  if (rating < 5) return `${rating} звезды`;
  return "5 звёзд";
};

const ratingOptions = [
  { value: "", label: "Без оценки" },
  ...[1, 2, 3, 4, 5].map((rating) => ({ value: String(rating), label: ratingLabel(rating) })),
];

const validationMessages = {
  authorName: "Имя клиента не должно превышать 100 символов.",
  customerRef: "Идентификатор клиента не должен превышать 120 символов.",
  text: "Введите от 5 до 5 000 символов.",
} as const;

export function CreateFeedbackForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [analyzeAfterCreate, setAnalyzeAfterCreate] = useState(true);
  type FormInput = z.input<typeof CreateFeedbackSchema>;
  const form = useForm<FormInput, unknown, CreateFeedbackInput>({
    resolver: zodResolver(CreateFeedbackSchema),
    defaultValues: { source: "manual", text: "", authorName: "", customerRef: "" },
  });
  const mutation = useMutation({
    mutationFn: async (input: CreateFeedbackInput) => {
      const created = await api.createFeedback(input);
      let analysisFailed = false;
      if (analyzeAfterCreate) {
        try {
          await api.analyze(created.id);
        } catch {
          analysisFailed = true;
        }
      }
      return { created, analysisFailed };
    },
    onSuccess: async ({ created, analysisFailed }) => {
      await queryClient.invalidateQueries({ queryKey: ["feedback"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      navigate(`/feedback/${created.id}`, {
        state: analysisFailed ? { analysisFailed: true } : undefined,
      });
    },
  });

  return (
    <form className={styles.form} onSubmit={form.handleSubmit((values) => mutation.mutate(values))} noValidate>
      <div className={styles.grid}>
        <label className={styles.field}><span>Источник</span><Controller control={form.control} name="source" render={({ field }) => <Select value={field.value ?? "manual"} onChange={(value) => field.onChange(value as FeedbackSource)} ariaLabel="Источник обращения" layout="form" dropdownWidth="trigger" options={sourceOptions} />} /></label>
        <label className={styles.field}><span>Оценка <small>Необязательно</small></span><Controller control={form.control} name="rating" render={({ field }) => <Select value={field.value ? String(field.value) : ""} onChange={(value) => field.onChange(value ? Number(value) : undefined)} ariaLabel="Оценка клиента" layout="form" dropdownWidth="trigger" options={ratingOptions} />} /></label>
        <label className={styles.field}><span>Имя клиента <small>Необязательно</small></span><input {...form.register("authorName")} placeholder="Например, София Волкова" aria-invalid={Boolean(form.formState.errors.authorName)} aria-describedby={form.formState.errors.authorName ? "author-name-error" : undefined} />{form.formState.errors.authorName ? <em id="author-name-error" className={styles.validationError}>{validationMessages.authorName}</em> : null}</label>
        <label className={styles.field}><span>Идентификатор клиента <small>Необязательно</small></span><input {...form.register("customerRef")} placeholder="Например, CUS-184" aria-invalid={Boolean(form.formState.errors.customerRef)} aria-describedby={form.formState.errors.customerRef ? "customer-ref-error" : undefined} />{form.formState.errors.customerRef ? <em id="customer-ref-error" className={styles.validationError}>{validationMessages.customerRef}</em> : null}</label>
        <label className={`${styles.field} ${styles.full}`}><span>Текст обращения</span><textarea {...form.register("text")} rows={7} placeholder="Введите или вставьте текст обращения…" aria-invalid={Boolean(form.formState.errors.text)} aria-describedby="feedback-text-help" /><div id="feedback-text-help" className={styles.fieldMeta}>{form.formState.errors.text ? <em>{validationMessages.text}</em> : <small>От 5 до 5 000 символов. Используйте только необходимые персональные данные.</small>}<span>{form.watch("text")?.length ?? 0}/5000</span></div></label>
      </div>
      <div className={styles.aiOption}><div className={styles.aiIcon}><Sparkles aria-hidden="true" /></div><Checkbox checked={analyzeAfterCreate} onChange={setAnalyzeAfterCreate} description="Запускает детерминированный AI-анализ и сохраняет структурированный результат.">Запустить AI-анализ после создания</Checkbox><span>AI-демо</span></div>
      {mutation.isError ? <p className={styles.error} role="alert">Не удалось создать обращение. Проверьте работу API и базы данных, затем повторите попытку.</p> : null}
      <footer><Button type="button" variant="secondary" onClick={() => navigate("/feedback")}>Отмена</Button><Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Создаём…" : <>Добавить обращение <ArrowRight /></>}</Button></footer>
    </form>
  );
}
