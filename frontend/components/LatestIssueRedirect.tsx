"use client";

import { useEffect } from "react";

interface LatestIssueRedirectProps {
  targetPath: string;
  linkLabel: string;
  message: string;
}

export default function LatestIssueRedirect({
  targetPath,
  linkLabel,
  message,
}: LatestIssueRedirectProps) {
  useEffect(() => {
    window.location.replace(targetPath);
  }, [targetPath]);

  return (
    <main className="page-frame py-16" aria-live="polite">
      <p className="text-sm text-black/60">{message}</p>
      <noscript>
        <a className="header-pill mt-4 inline-flex" href={targetPath}>
          {linkLabel}
        </a>
      </noscript>
    </main>
  );
}
