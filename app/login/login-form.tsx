"use client";

import { useActionState } from "react";
import Image from "next/image";
import { login, type LoginState } from "./actions";

const initialState: LoginState = { error: "" };

export function LoginForm() {
  const [state, action, pending] = useActionState(login, initialState);
  return (
    <form action={action} className="login-card">
      <Image src="/kcc-logo.jpeg" alt="KCC Cricket Ground" className="login-logo" width={92} height={92} priority />
      <div className="login-heading">
        <span className="eyebrow">SECURE ADMIN PORTAL</span>
        <h2>Welcome to KCC</h2>
        <p>Sign in to manage ground operations.</p>
      </div>
      <label>Email address<input name="email" type="email" defaultValue="kingsclubcricket@gmail.com" autoComplete="username" readOnly required /></label>
      <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
      <button className="primary-button login-button" type="submit" disabled={pending}>{pending ? "Signing in…" : "Sign in securely"}<span>→</span></button>
      <p className="secure-note"><span>●</span> Protected by encrypted authentication and database policies</p>
    </form>
  );
}
