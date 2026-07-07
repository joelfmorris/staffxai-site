'use client';

import { useState, useRef } from 'react';

// Design tokens — eucalyptus palette
const T = {
  ground:      '#F7F4F0',
  white:       '#FFFFFF',
  text:        '#1C1916',
  muted:       '#6E665E',
  accent:      '#4A7C6B',
  accentPale:  '#EAF0EE',
  border:      '#E3DDD5',
} as const;

const inputBase: React.CSSProperties = {
  borderColor: T.border,
  background:  T.ground,
  color:       T.text,
};

function ChevronDown() {
  return (
    <svg
      className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"
      width="16" height="16" viewBox="0 0 16 16" fill="none"
    >
      <path d="M4 6l4 4 4-4" stroke={T.muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function InputField({ id, label, ...props }: { id: string; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium mb-1.5" style={{ color: T.text }}>
        {label}
      </label>
      <input
        id={id}
        name={id}
        className="w-full px-4 py-3 rounded-xl border text-base outline-none transition-colors"
        style={inputBase}
        onFocus={e => (e.currentTarget.style.borderColor = T.accent)}
        onBlur={e => (e.currentTarget.style.borderColor = T.border)}
        {...props}
      />
    </div>
  );
}

function SelectField({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium mb-1.5" style={{ color: T.text }}>
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          name={id}
          required
          defaultValue=""
          className="w-full px-4 py-3 rounded-xl border text-base outline-none transition-colors appearance-none"
          style={inputBase}
          onFocus={e => (e.currentTarget.style.borderColor = T.accent)}
          onBlur={e => (e.currentTarget.style.borderColor = T.border)}
        >
          {children}
        </select>
        <ChevronDown />
      </div>
    </div>
  );
}

export default function SmilePage() {
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess]       = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const [firstName, setFirstName]   = useState('');
  const formRef = useRef<HTMLElement>(null);

  function scrollToForm() {
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(false);
    const fd = new FormData(e.currentTarget);
    const body = {
      firstName:         fd.get('firstName') as string,
      mobile:            fd.get('mobile') as string,
      email:             fd.get('email') as string,
      treatmentInterest: fd.get('treatmentInterest') as string,
      timeline:          fd.get('timeline') as string,
    };
    setFirstName(body.firstName);
    try {
      const res = await fetch('/api/dental-enquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      setSuccess(true);
    } catch {
      setSubmitError(true);
    } finally {
      setSubmitting(false);
    }
  }

  const steps = [
    {
      svg: <path d="M8 6h8a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H9l-3 3V8a2 2 0 0 1 2-2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />,
      title: 'Free consultation',
      body:  'Meet your clinician, ask every question you have, and understand your options — with no obligation.',
    },
    {
      svg: <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />,
      title: 'Your personal plan',
      body:  'A treatment plan built around your timeline, your circumstances, and your options — laid out clearly.',
    },
    {
      svg: <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />,
      title: 'Treatment at your pace',
      body:  "Begin when you're ready. Flexible scheduling and payment plans mean there's no rush.",
    },
  ];

  return (
    <div style={{ background: T.ground }} className="min-h-screen">

      {/* ── HERO ──────────────────────────────────── */}
      <section className="pt-28 pb-20 px-6">
        <div className="max-w-[560px] mx-auto">
          <p
            className="font-mono text-xs uppercase tracking-[0.18em] mb-6"
            style={{ color: T.accent }}
          >
            Collins Street Dental Studio
          </p>
          <h1
            className="font-display leading-[1.06] mb-6"
            style={{ color: T.text, fontSize: 'clamp(2.6rem, 8vw, 4.2rem)' }}
          >
            Your smile,<br />restored.
          </h1>
          <p
            className="leading-relaxed mb-10 max-w-[440px]"
            style={{ fontSize: '1.1rem', color: T.muted }}
          >
            Dental implants with care, clarity and payment plans that make sense.
          </p>
          <button
            onClick={scrollToForm}
            className="inline-block text-white font-medium rounded-pill transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
            style={{ background: T.accent, fontSize: '1rem', padding: '1rem 2rem' }}
          >
            Book a free consultation
          </button>
        </div>
      </section>

      {/* ── TRUST STRIP ───────────────────────────── */}
      <section style={{ background: T.accentPale }} className="py-5 px-6">
        <div className="max-w-[800px] mx-auto">
          <ul className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-4 sm:gap-0 list-none m-0 p-0">
            {[
              'AHPRA-registered practitioners',
              'Payment plans available',
              'Melbourne CBD locals for 20 years',
            ].map((item, i) => (
              <li key={i} className="flex items-center">
                {i > 0 && (
                  <span
                    className="hidden sm:block w-px h-4 mx-6"
                    style={{ background: T.accent, opacity: 0.35 }}
                  />
                )}
                <span
                  className="font-mono text-[0.71rem] uppercase tracking-[0.16em]"
                  style={{ color: T.accent }}
                >
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── GALLERY ───────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-[720px] mx-auto">
          <p
            className="font-mono text-xs uppercase tracking-[0.18em] mb-3"
            style={{ color: T.accent }}
          >
            Our patients
          </p>
          <h2
            className="font-display leading-tight mb-12"
            style={{ color: T.text, fontSize: 'clamp(1.8rem, 5vw, 2.8rem)' }}
          >
            Smiles we&rsquo;ve had the<br className="hidden sm:block" /> privilege to restore.
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-5">
            {(['Smile restoration', 'Single implant', 'Full arch restoration', 'Smile renewal'] as const).map((caption, i) => (
              <figure key={i} className="m-0">
                <div
                  className="aspect-[4/3] rounded-card flex flex-col items-center justify-center gap-3"
                  style={{ background: T.border }}
                >
                  <svg width="38" height="38" viewBox="0 0 32 32" fill="none">
                    <circle cx="16" cy="16" r="13" stroke={T.accent} strokeWidth="1.5" strokeOpacity="0.4"/>
                    <circle cx="11.5" cy="13.5" r="1.5" fill={T.accent} fillOpacity="0.4"/>
                    <circle cx="20.5" cy="13.5" r="1.5" fill={T.accent} fillOpacity="0.4"/>
                    <path d="M10 19 C11.5 22.5 20.5 22.5 22 19" stroke={T.accent} strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.4"/>
                  </svg>
                  <span
                    className="font-mono text-center px-4"
                    style={{ fontSize: '0.6rem', color: T.muted, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.65 }}
                  >
                    Real patient photo<br />— placeholder
                  </span>
                </div>
                <figcaption className="mt-2" style={{ fontSize: '0.8rem', color: T.muted }}>
                  {caption}
                </figcaption>
              </figure>
            ))}
          </div>
          <p className="mt-5" style={{ fontSize: '0.75rem', color: T.muted, opacity: 0.65 }}>
            Consented patient photos will be displayed here once provided. All photography requires written patient consent.
          </p>
        </div>
      </section>

      {/* ── WHAT TO EXPECT ────────────────────────── */}
      <section className="py-20 px-6" style={{ background: T.white }}>
        <div className="max-w-[720px] mx-auto">
          <p
            className="font-mono text-xs uppercase tracking-[0.18em] mb-3"
            style={{ color: T.accent }}
          >
            The journey
          </p>
          <h2
            className="font-display leading-tight mb-16"
            style={{ color: T.text, fontSize: 'clamp(1.8rem, 5vw, 2.8rem)' }}
          >
            What to expect.
          </h2>
          <div className="flex flex-col sm:flex-row gap-10 sm:gap-8">
            {steps.map((step, i) => (
              <div key={i} className="flex sm:flex-col gap-5 sm:gap-4 flex-1 sm:items-center sm:text-center">
                <div
                  className="flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center"
                  style={{ background: T.accentPale }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={T.accent}>
                    {step.svg}
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-base mb-1.5" style={{ color: T.text }}>
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: T.muted }}>
                    {step.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PAYMENT PLANS ─────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-[560px] mx-auto">
          <p
            className="font-mono text-xs uppercase tracking-[0.18em] mb-3"
            style={{ color: T.accent }}
          >
            Payment plans
          </p>
          <h2
            className="font-display leading-tight mb-6"
            style={{ color: T.text, fontSize: 'clamp(1.8rem, 5vw, 2.8rem)' }}
          >
            Finance that works<br />for you.
          </h2>
          <p className="leading-[1.8] mb-4" style={{ fontSize: '1rem', color: T.muted }}>
            We believe restoring your smile shouldn&rsquo;t be held back by upfront cost. We work with several
            payment plan providers to find an arrangement that suits your circumstances — whether
            you&rsquo;re ready to start soon or planning carefully over time.
          </p>
          <p className="leading-[1.8]" style={{ fontSize: '1rem', color: T.muted }}>
            Your clinician will walk through the available options with you at your free consultation.
          </p>
        </div>
      </section>

      {/* ── ENQUIRY FORM ──────────────────────────── */}
      <section
        id="enquiry-form"
        ref={formRef}
        className="py-20 px-6"
        style={{ background: T.white }}
      >
        <div className="max-w-[480px] mx-auto">
          <p
            className="font-mono text-xs uppercase tracking-[0.18em] mb-3"
            style={{ color: T.accent }}
          >
            Get in touch
          </p>
          <h2
            className="font-display leading-tight mb-2"
            style={{ color: T.text, fontSize: 'clamp(1.8rem, 5vw, 2.8rem)' }}
          >
            {success
              ? <>Thanks, {firstName}.</>
              : <>Start with a free<br />consultation.</>}
          </h2>

          {success ? (
            <p className="mt-6 leading-[1.8]" style={{ fontSize: '1.05rem', color: T.muted }}>
              Check your phone — our assistant will text you within a minute to arrange your consultation.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
              <InputField id="firstName" label="First name"      type="text"  required placeholder="Your first name" />
              <InputField id="mobile"    label="Mobile number"   type="tel"   required placeholder="04xx xxx xxx" />
              <InputField id="email"     label="Email address"   type="email" required placeholder="your@email.com" />

              <SelectField id="treatmentInterest" label="What are you interested in?">
                <option value="" disabled>Select an option</option>
                <option value="single-tooth">Single tooth</option>
                <option value="several-teeth">Several teeth</option>
                <option value="full-smile">Full smile restoration</option>
                <option value="not-sure">Not sure yet</option>
              </SelectField>

              <SelectField id="timeline" label="Your timeline">
                <option value="" disabled>Select an option</option>
                <option value="asap">As soon as possible</option>
                <option value="1-3-months">1–3 months</option>
                <option value="researching">Just researching</option>
              </SelectField>

              {submitError && (
                <p className="text-sm" style={{ color: '#B94A3B' }}>
                  Something went wrong. Please try again or call us directly.
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full text-white font-medium rounded-pill transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-60 mt-2"
                style={{ background: T.accent, fontSize: '1rem', padding: '1rem' }}
              >
                {submitting ? 'Sending…' : 'Request free consultation'}
              </button>

              <p className="text-xs text-center" style={{ color: T.muted, opacity: 0.7 }}>
                No commitment required. We&rsquo;ll be in touch within 1 business day.
              </p>
            </form>
          )}
        </div>
      </section>

      {/* ── PRACTICE FOOTER ───────────────────────── */}
      <footer
        className="py-12 px-6"
        style={{ background: T.ground, borderTop: `1px solid ${T.border}` }}
      >
        <div className="max-w-[720px] mx-auto flex flex-col sm:flex-row justify-between gap-6">
          <div>
            <p
              className="font-mono text-[0.71rem] uppercase tracking-[0.16em] mb-3"
              style={{ color: T.accent }}
            >
              Collins Street Dental Studio
            </p>
            <p className="text-sm mb-1" style={{ color: T.muted }}>Level X, XXX Collins Street, Melbourne VIC 3000</p>
            <p className="text-sm"      style={{ color: T.muted }}>(03) XXXX XXXX · hello@collinsstdental.com.au</p>
          </div>
          <div className="sm:text-right max-w-xs">
            <p className="text-xs leading-relaxed" style={{ color: T.muted, opacity: 0.7 }}>
              Your details are used only to arrange your consultation. We do not share your information with third parties.
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
}
