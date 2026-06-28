"use client";

import Script from "next/script";

export default function CalendlyWidget() {
  return (
    <>
      <link
        rel="stylesheet"
        href="https://assets.calendly.com/assets/external/widget.css"
      />
      <div
        className="calendly-inline-widget"
        data-url="https://calendly.com/joel-staffxai/30min"
        style={{ minWidth: "320px", height: "700px" }}
      />
      <Script
        src="https://assets.calendly.com/assets/external/widget.js"
        strategy="afterInteractive"
      />
    </>
  );
}
