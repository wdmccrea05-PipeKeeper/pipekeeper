import React from "react";

export default function Select(props) {
  const { children, className = "", ...rest } = props;

  return (
    <div className={className} {...rest}>
      {children}
    </div>
  );
}

export function SelectTrigger(props) {
  const { children, className = "", ...rest } = props;
  return (
    <div className={className} {...rest}>
      {children}
    </div>
  );
}

export function SelectContent(props) {
  const { children, className = "", ...rest } = props;
  return (
    <div className={className} {...rest}>
      {children}
    </div>
  );
}

export function SelectItem(props) {
  const { children, className = "", ...rest } = props;
  return (
    <div className={className} {...rest}>
      {children}
    </div>
  );
}

export function SelectValue(props) {
  const { children, className = "", ...rest } = props;
  return (
    <span className={className} {...rest}>
      {children}
    </span>
  );
}

export function SelectLabel(props) {
  const { children, className = "", ...rest } = props;
  return (
    <label className={className} {...rest}>
      {children}
    </label>
  );
}

export function SelectGroup(props) {
  const { children, className = "", ...rest } = props;
  return (
    <div className={className} {...rest}>
      {children}
    </div>
  );
}

export function SelectScrollUpButton(props) {
  const { children, className = "", ...rest } = props;
  return (
    <button className={className} {...rest}>
      {children}
    </button>
  );
}

export function SelectScrollDownButton(props) {
  const { children, className = "", ...rest } = props;
  return (
    <button className={className} {...rest}>
      {children}
    </button>
  );
}

export function SelectSeparator(props) {
  const { className = "", ...rest } = props;
  return <div className={className} {...rest} />;
}