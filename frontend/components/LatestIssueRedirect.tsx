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
  const redirectScript = `window.location.replace(${JSON.stringify(targetPath)});`;

  return (
    <main className="page-frame py-16">
      <script dangerouslySetInnerHTML={{ __html: redirectScript }} />
      <noscript>
        <meta httpEquiv="refresh" content={`0;url=${targetPath}`} />
      </noscript>
      <a className="header-pill" href={targetPath}>
        {linkLabel}
      </a>
      <p className="mt-4 text-sm text-black/60">{message}</p>
    </main>
  );
}
