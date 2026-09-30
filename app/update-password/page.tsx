"use client";

import { createBrowserClient } from "@supabase/ssr";
import Image from "next/image";
import { FormEvent, useMemo, useState } from "react";

export default function UpdatePasswordPage() {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    return url && key ? createBrowserClient(url, key) : null;
  }, []);

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") || "");
    const confirmation = String(formData.get("confirmation") || "");

    if (password.length < 12) {
      setMessage("Use at least 12 characters for the KCC admin password.");
      return;
    }
    if (password !== confirmation) {
      setMessage("The passwords do not match.");
      return;
    }
    if (!supabase) {
      setMessage("Secure authentication is still being configured.");
      return;
    }

    setPending(true);
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      setMessage("Open the latest Supabase invitation or recovery link, then set your password here.");
      setPending(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setMessage(error.message);
      setPending(false);
      return;
    }

    await supabase.auth.signOut();
    window.location.assign("/login?password=updated");
  }

  return (
    <main className="login-screen">
      <section className="login-art">
        <div className="login-art-copy">
          <span className="eyebrow light">KCC CRICKET GROUND</span>
          <h1>Secure your account.<br />Run every booking.</h1>
          <p>Create the password used by the single KCC administrator account.</p>
        </div>
      </section>
      <section className="login-panel">
        <form className="login-card" onSubmit={updatePassword}>
          <Image className="login-logo" src="/kcc-logo.jpeg" alt="KCC Cricket Ground" width={92} height={92} priority />
          <div className="login-heading">
            <span className="eyebrow">SECURE ADMIN PORTAL</span>
            <h2>Set your KCC password</h2>
            <p>Use the invitation or recovery link sent to the KCC Gmail account.</p>
          </div>
          <label>New password<input name="password" type="password" minLength={12} autoComplete="new-password" required /></label>
          <label>Confirm password<input name="confirmation" type="password" minLength={12} autoComplete="new-password" required /></label>
          {message && <p className="form-error" role="alert">{message}</p>}
          <button className="primary-button login-button" type="submit" disabled={pending}>
            {pending ? "Saving securely…" : "Set password"}<span>→</span>
          </button>
        </form>
      </section>
    </main>
  );
}
