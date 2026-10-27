import { createContext, useCallback, useContext, useEffect, useRef, useState, type FormEvent, type PropsWithChildren } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { DemoSession } from "@resolve-signal/contracts";
import { api } from "../../shared/api/api-client";
import { DEMO_SESSION_EXPIRED } from "../../shared/api/demo-session-events";
import { demoLimitMessage } from "../../shared/lib/demo-limit";
import { Button } from "../../shared/ui/button";
import styles from "./DemoAccessGate.module.css";

const AccessContext = createContext({ enabled: false, mode: "code" as "code" | "guest", authenticated: false, ensureSession: async () => {}, logout: async () => {}, busy: false, error: "" });
export const useDemoAccess = () => useContext(AccessContext);

export function DemoAccessGate({ children }: PropsWithChildren) {
  const client = useQueryClient();
  const [session, setSession] = useState<DemoSession | null>(null);
  const [state, setState] = useState<"loading" | "locked" | "open" | "error">("loading");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const generation = useRef(0);
  const mode = useRef<"code" | "guest">("code");
  const starting = useRef<Promise<void> | null>(null);

  const lock = useCallback((reason: string) => {
    generation.current++;
    if (mode.current === "guest") {
      setSession({ mode: "guest", enabled: true, authenticated: false, expiresAt: null });
      setState("open");
      setMessage("Гостевой сеанс завершён. Общие обращения доступны для просмотра. При создании обращения начнётся новый сеанс; прежние записи останутся только для чтения.");
    } else {
      setSession(null); setState("locked"); setMessage(reason);
    }
    setCode(""); setBusy(false);
    void client.cancelQueries();
    client.clear();
  }, [client]);

  const check = useCallback(async () => {
    const current = ++generation.current;
    try {
      const result = await api.demoSession();
      if (current !== generation.current) return;
      mode.current = result.mode ?? "code";
      if (result.mode !== "guest" && !result.authenticated) { lock("Введите код доступа к демо."); return; }
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

  async function ensureSession() {
    if (mode.current !== "guest" || session?.authenticated) return;
    if (starting.current) return starting.current;
    const current = ++generation.current;
    const task = (async () => {
      setBusy(true); setMessage("");
      try {
        await api.startGuest();
        // Do not create data if the browser/proxy did not retain the HttpOnly cookie.
        const result = await api.demoSession();
        if (result.mode !== "guest" || !result.authenticated || current !== generation.current) {
          throw new Error("Не удалось сохранить гостевой сеанс. Разрешите cookie для этого сайта и повторите попытку.");
        }
        setSession(result);
        await client.invalidateQueries({ queryKey: ["feedback"] });
      } catch (error) {
        if (current === generation.current) setMessage(demoLimitMessage(error) ?? (error instanceof Error ? error.message : "Не удалось начать гостевой сеанс. Повторите попытку."));
        throw error;
      } finally {
        if (current === generation.current) setBusy(false);
        starting.current = null;
      }
    })();
    starting.current = task;
    return task;
  }

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
    <AccessContext.Provider value={{ enabled: session.enabled, mode: session.mode ?? "code", authenticated: session.authenticated, ensureSession, logout, busy, error: message }}>{children}</AccessContext.Provider>
  );
  // Mode is server-owned: keep the initial loading view neutral so guest mode
  // never flashes the code-access screen, even during a Render cold start.
  if (state === "loading") return <main className={styles.screen} aria-busy="true"><p role="status">Открываем демо…</p></main>;
  return (
    <main className={styles.screen}>
      <section className={styles.card} aria-labelledby="demo-title">
        <span className={styles.brand}>ResolveSignal AI</span>
        <h1 id="demo-title">Добро пожаловать в демо</h1>
        <p>Общее демонстрационное пространство: обращения и изменения видны всем участникам. Используйте только вымышленные данные, без персональной и конфиденциальной информации.</p>
        {state === "error" ? <>
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
