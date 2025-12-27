import type { ReactNode } from "react";

export default function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="panel">
      <div className="panelHead">
        <div className="panelTitle">{title}</div>
        {subtitle ? <div className="panelSub">{subtitle}</div> : null}
      </div>
      <div className="panelBody">{children}</div>
    </div>
  );
}
