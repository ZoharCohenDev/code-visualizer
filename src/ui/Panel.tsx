import React from "react";

export default function Panel({
  title,
  subtitle,
  children,
  bodyRef,
  onBodyScroll,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  bodyRef?: React.Ref<HTMLDivElement>;
  onBodyScroll?: React.UIEventHandler<HTMLDivElement>;
}) {
  return (
    <div className="panel">
      <div className="panelHead">
        <div>
          <div className="panelTitle">{title}</div>
          {subtitle ? <div className="panelSub">{subtitle}</div> : null}
        </div>
      </div>

      <div className="panelBody" ref={bodyRef} onScroll={onBodyScroll}>
        {children}
      </div>
    </div>
  );
}
