import React from "react";

export default function Dialog(props) {
  const { children, className = "", ...rest } = props;

  return (
    <div className={className} {...rest}>
      {children}
    </div>
  );
}

export function DialogTrigger(props) {
  const { children, className = "", ...rest } = props;
  return (
    <button className={className} {...rest}>
      {children}
    </button>
  );
}

export function DialogContent(props) {
  const { children, className = "", ...rest } = props;
  return (
    <div className={className} {...rest}>
      {children}
    </div>
  );
}

export function DialogHeader(props) {
  const { children, className = "", ...rest } = props;
  return (
    <div className={className} {...rest}>
      {children}
    </div>
  );
}

export function DialogFooter(props) {
  const { children, className = "", ...rest } = props;
  return (
    <div className={className} {...rest}>
      {children}
    </div>
  );
}

export function DialogTitle(props) {
  const { children, className = "", ...rest } = props;
  return (
    <h2 className={className} {...rest}>
      {children}
    </h2>
  );
}

export function DialogDescription(props) {
  const { children, className = "", ...rest } = props;
  return (
    <p className={className} {...rest}>
      {children}
    </p>
  );
}

export function DialogPortal(props) {
  const { children, ...rest } = props;
  return <>{children}</>;
}

export function DialogOverlay(props) {
  const { className = "", ...rest } = props;
  return <div className={className} {...rest} />;
}

export function DialogClose(props) {
  const { children, className = "", ...rest } = props;
  return (
    <button className={className} {...rest}>
      {children}
    </button>
  );
}