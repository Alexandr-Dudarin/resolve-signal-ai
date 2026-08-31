import { Link } from "react-router-dom";
import styles from "./NotFoundPage.module.css";

export function NotFoundPage() {
  return <section className={styles.page}><span>404</span><h1>Страница не найдена</h1><p>Запрошенной страницы нет в этом рабочем пространстве.</p><Link to="/">Вернуться к обзору</Link></section>;
}
