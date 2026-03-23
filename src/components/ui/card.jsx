import React from "react";

export default function Card(props) {
  const { children, className = "", ...rest } = props;

  return (
    <div className={className} {...rest}>
      {children}
    </div>
  );
}

export function CardHeader(props) {
  const { children, className = "", ...rest } = props;
  return (
    <div className={className} {...rest}>
      {children}
    </div>
  );
}

export function CardContent(props) {
  const { children, className = "", ...rest } = props;
  return (
    <div className={className} {...rest}>
      {children}
    </div>
  );
}

export function CardTitle(props) {
  const { children, className = "", ...rest } = props;
  return (
    <h3 className={className} {...rest}>
      {children}
    </h3>
  );
}

export function CardFooter(props) {
  const { children, className = "", ...rest } = props;
  return (
    <div className={className} {...rest}>
      {children}
    </div>
  );
}

export function CardDescription(props) {
  const { children, className = "", ...rest } = props;
  return (
    <p className={className} {...rest}>
      {children}
    </p>
  );
}