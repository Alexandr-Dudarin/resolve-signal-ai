import { CreateFeedbackForm } from "../../features/create-feedback/CreateFeedbackForm";
import { PageHeader } from "../../shared/ui/page-header";

export function FeedbackCreatePage() {
  return <><PageHeader eyebrow="Ручной ввод" title="Добавить обращение" description="Добавьте обращение клиента и при необходимости сразу запустите AI-анализ." /><CreateFeedbackForm /></>;
}
