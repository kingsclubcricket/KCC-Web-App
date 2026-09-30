import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="login-screen">
      <section className="login-art">
        <div className="login-art-copy">
          <span className="eyebrow light">KCC CRICKET GROUND</span>
          <h1>Run every booking.<br />Know every rupee.</h1>
          <p>One secure workspace for client onboarding, ground schedules, payments, invoices, and daily upkeep.</p>
          <div className="login-stat-row"><div><strong>3</strong><span>Daily slots</span></div><div><strong>7 days</strong><span>Schedule view</span></div><div><strong>1 secure</strong><span>KCC account</span></div></div>
        </div>
      </section>
      <section className="login-panel"><LoginForm /></section>
    </main>
  );
}
