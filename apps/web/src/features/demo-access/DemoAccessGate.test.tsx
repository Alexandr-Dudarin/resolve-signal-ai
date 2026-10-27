import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DemoSession } from "@resolve-signal/contracts";
import { api } from "../../shared/api/api-client";
import { DEMO_SESSION_EXPIRED } from "../../shared/api/demo-session-events";
import { DemoAccessGate, useDemoAccess } from "./DemoAccessGate";

vi.mock("../../shared/api/api-client", () => ({ api: { demoSession: vi.fn(), loginDemo: vi.fn(), logoutDemo: vi.fn() } }));
const locked: DemoSession = { enabled: true, authenticated: false, expiresAt: null };
const active = (): DemoSession => ({ enabled: true, authenticated: true, expiresAt: new Date(Date.now() + 60000).toISOString() });
function Content() {
  const access = useDemoAccess();
  return <><p>Защищённые данные</p><button onClick={() => void access.logout()}>Выйти</button>{access.error ? <p role="alert">{access.error}</p> : null}</>;
}
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(["feedback"], "cached-private-content");
  const view = render(<QueryClientProvider client={client}><DemoAccessGate><Content /></DemoAccessGate></QueryClientProvider>);
  return { client, ...view };
}
beforeEach(() => { vi.resetAllMocks(); vi.mocked(api.demoSession).mockResolvedValue(locked); });
afterEach(() => vi.useRealTimers());

describe("demo access UX", () => {
  it("never mounts protected content before initial session verification", async () => {
    let resolve!: (session: DemoSession) => void;
    vi.mocked(api.demoSession).mockReturnValue(new Promise((r) => { resolve = r; }));
    setup();
    expect(screen.getByRole("status")).toHaveTextContent("Проверяем доступ");
    expect(screen.queryByText("Защищённые данные")).not.toBeInTheDocument();
    await act(async () => resolve(locked));
    expect(screen.getByLabelText("Код доступа")).toHaveAttribute("type", "password");
  });
  it("restores an authenticated session after reload/direct URL navigation", async () => {
    vi.mocked(api.demoSession).mockResolvedValue(active());
    setup();
    expect(await screen.findByText("Защищённые данные")).toBeInTheDocument();
    expect(api.loginDemo).not.toHaveBeenCalled();
  });
  it("logs in, clears the code, and clears cached data on logout", async () => {
    vi.mocked(api.loginDemo).mockResolvedValue(active());
    vi.mocked(api.logoutDemo).mockResolvedValue(locked);
    const { client } = setup();
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText("Код доступа"), "private-demo-code");
    await user.click(screen.getByRole("button", { name: "Открыть демо" }));
    expect(await screen.findByText("Защищённые данные")).toBeInTheDocument();
    client.setQueryData(["feedback"], "private-content");
    await user.click(screen.getByRole("button", { name: "Выйти" }));
    expect(await screen.findByText("Вы вышли из демо.")).toBeInTheDocument();
    expect(client.getQueryData(["feedback"])).toBeUndefined();
    expect(screen.getByLabelText("Код доступа")).toHaveValue("");
    expect(localStorage.length).toBe(0); expect(sessionStorage.length).toBe(0);
  });
  it("shows invalid-code and rate-limit messages without retries", async () => {
    vi.mocked(api.loginDemo).mockRejectedValueOnce(Object.assign(new Error(), { status: 401 }))
      .mockRejectedValueOnce({ demoLimit: { code: "DEMO_RATE_LIMIT_EXCEEDED", scope: "login_ip", retryAfterSeconds: 60 } });
    setup(); const user = userEvent.setup();
    await user.type(await screen.findByLabelText("Код доступа"), "wrong");
    await user.click(screen.getByRole("button", { name: "Открыть демо" }));
    expect(await screen.findByText("Неверный код доступа. Попробуйте ещё раз.")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Код доступа"), "wrong");
    await user.click(screen.getByRole("button", { name: "Открыть демо" }));
    expect(await screen.findByText(/Слишком много попыток входа.*1 мин/)).toBeInTheDocument();
    expect(api.loginDemo).toHaveBeenCalledTimes(2);
  });
  it("can retry a network failure without revealing content", async () => {
    vi.mocked(api.demoSession).mockRejectedValueOnce(new Error("network"));
    setup();
    expect(await screen.findByRole("alert")).toHaveTextContent("Не удалось проверить доступ");
    expect(screen.queryByText("Защищённые данные")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Повторить проверку" }));
    expect(await screen.findByLabelText("Код доступа")).toBeInTheDocument();
  });
  it("removes content and clears cache after an API 401", async () => {
    vi.mocked(api.demoSession).mockResolvedValue(active());
    const { client } = setup();
    await screen.findByText("Защищённые данные");
    act(() => window.dispatchEvent(new Event(DEMO_SESSION_EXPIRED)));
    expect(screen.queryByText("Защищённые данные")).not.toBeInTheDocument();
    expect(client.getQueryData(["feedback"])).toBeUndefined();
    expect(screen.getByRole("alert")).toHaveTextContent("Срок сессии истёк");
  });
  it("locks an idle tab at expiry and checks revoked sessions on focus", async () => {
    vi.mocked(api.demoSession).mockResolvedValue(active());
    setup(); await screen.findByText("Защищённые данные");
    vi.mocked(api.demoSession).mockResolvedValue(locked);
    fireEvent.focus(window);
    await waitFor(() => expect(screen.queryByText("Защищённые данные")).not.toBeInTheDocument());
  });
  it("expires without another API request", async () => {
    vi.useFakeTimers();
    vi.mocked(api.demoSession).mockResolvedValue(active());
    setup(); await act(async () => {});
    expect(screen.getByText("Защищённые данные")).toBeInTheDocument();
    await act(async () => vi.advanceTimersByTimeAsync(61000));
    expect(screen.queryByText("Защищённые данные")).not.toBeInTheDocument();
    expect(api.demoSession).toHaveBeenCalledTimes(1);
  });
  it("does not claim logout succeeded when the server is unreachable", async () => {
    vi.mocked(api.demoSession).mockResolvedValue(active());
    vi.mocked(api.logoutDemo).mockRejectedValue(new Error("network"));
    setup(); await screen.findByText("Защищённые данные");
    await userEvent.click(screen.getByRole("button", { name: "Выйти" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Не удалось завершить сессию");
  });
});
