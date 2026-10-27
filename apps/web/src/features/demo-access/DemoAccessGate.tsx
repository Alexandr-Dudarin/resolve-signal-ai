import { createContext, useCallback, useContext, useEffect, useRef, useState, type FormEvent, type PropsWithChildren } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { DemoSession } from "@resolve-signal/contracts";
import { api } from "../../shared/api/api-client";
import { DEMO_SESSION_EXPIRED } from "../../shared/api/demo-session-events";
import { demoLimitMessage } from "../../shared/lib/demo-limit";
import { Button } from "../../shared/ui/button";
import styles from "./DemoAccessGate.module.css";

const AccessContext = createContext({ enabled: false, logout: async () => {}, busy: false, error: "" });
export const useDemoAccess = () => useContext(AccessContext);

export function DemoAccessGate({ children }: PropsWithChildren) {
  const client = useQueryClient();
  const [session, setSession] = useState<DemoSession | null>(null);
  const [state, setState] = useState<"loading" | "locked" | "open" | "error">("loading");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const generation = useRef(0);

  const lock = useCallback((reason: string) => {
    generation.current++;
    setSession(null); setState("locked"); setMessage(reason); setCode(""); setBusy(false);
    void client.cancelQueries();
    client.clear();
  }, [client]);

  const check = useCallback(async () => {
    const current = ++generation.current;
    try {
      const result = await api.demoSession();
      if (current !== generation.current) return;
      if (!result.authenticated) { lock("Введите код доступа к демо."); return; }
      setSession(result); setState("open"); setMessage("");
    } catch {
      if (current !== generation.current) return;
      void client.cancelQueries(); client.clear();
      setState("error"); setSession(null); setMessage("Не удалось проверить доступ. Сервер может запускаться после паузы. Попробуйте ещё раз.");
    }
  }, [client, lock]);

  useEffect(() => {
    void check();
    const expired = () => lock("Срок сессии истёк. Введите код доступа ещё раз.");
    window.addEventListener(DEMO_SESSION_EXPIRED, expired);
    return () => {
      generation.current++;
      window.removeEventListener(DEMO_SESSION_EXPIRED, expired);
    };
  }, [check, lock]);

  useEffect(() => {
    if (state !== "open" || busy) return;
    const focused = () => { void check(); };
    window.addEventListener("focus", focused);
    return () => window.removeEventListener("focus", focused);
  }, [state, busy, check]);

  useEffect(() => {
    if (!session?.expiresAt) return;
    const timer = window.setTimeout(() => lock("Срок сессии истёк. Введите код доступа ещё раз."), Math.max(0, Date.parse(session.expiresAt) - Date.now()));
    return () => window.clearTimeout(timer);
  }, [session, lock]);

  async function login(event: FormEvent) {
    event.preventDefault();
    const current = ++generation.current;
    setBusy(true); setMessage("");
    const submittedCode = code;
    setCode("");
    try {
      const result = await api.loginDemo(submittedCode);
      if (current !== generation.current) return;
      if (!result.authenticated) { lock("Не удалось войти. Проверьте код доступа."); return; }
      client.clear(); setSession(result); setState("open");
    } catch (error) {
      if (current !== generation.current) return;
      setMessage(demoLimitMessage(error) ?? (error instanceof Error && "status" in error && error.status === 401
        ? "Неверный код доступа. Попробуйте ещё раз."
        : "Не удалось войти. Проверьте соединение и повторите попытку."));
    } finally { if (current === generation.current) setBusy(false); }
  }

  async function logout() {
    const current = ++generation.current;
    setBusy(true); setMessage("");
    try { await api.logoutDemo(); if (current === generation.current) lock("Вы вышли из демо."); }
    catch { if (current === generation.current) setMessage("Не удалось завершить сессию. Повторите выход."); }
    finally { if (current === generation.current) setBusy(false); }
  }

  if (state === "open" && session) return (
    <AccessContext.Provider value={{ enabled: session.enabled, logout, busy, error: message }}>{children}</AccessContext.Provider>
  );
  return (
    <main className={styles.screen}>
      <section className={styles.card} aria-labelledby="demo-title">
        <span className={styles.brand}>ResolveSignal AI</span>
        <h1 id="demo-title">Добро пожаловать в демо</h1>
        <p>Общее демонстрационное пространство: обращения и изменения видны всем участникам. Используйте только вымышленные данные, без персональной и конфиденциальной информации.</p>
        {state === "loading" ? <p role="status">Проверяем доступ…</p> : state === "error" ? <>
          <p role="alert">{message}</p><Button onClick={() => { setState("loading"); void check(); }}>Повторить проверку</Button>
        </> : <form onSubmit={(event) => void login(event)}>
          <label htmlFor="demo-code">Код доступа</label>
          <input id="demo-code" type="password" autoComplete="off" spellCheck={false} autoCapitalize="none" maxLength={128} value={code} onChange={(event) => setCode(event.target.value)} disabled={busy} required aria-describedby="demo-help" />
          <small id="demo-help">Код можно получить у автора проекта. Сессия ограничена по времени.</small>
          {message ? <p role="alert">{message}</p> : null}
          <Button type="submit" disabled={busy || !code.trim()}>{busy ? "Входим…" : "Открыть демо"}</Button>
        </form>}
      </section>
    </main>
  );
}
