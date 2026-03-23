import React from "react";

function Card(props) {
  const { children, className = "", ...rest } = props;

  return (
    <div className={className} {...rest}>
      {children}
    </div>
  );
}

function CardHeader(props) {
  const { children, className = "", ...rest } = props;
  return (
    <div className={className} {...rest}>
      {children}
    </div>
  );
}

function CardContent(props) {
  const { children, className = "", ...rest } = props;
  return (
    <div className={className} {...rest}>
      {children}
    </div>
  );
}

function CardTitle(props) {
  const { children, className = "", ...rest } = props;
  return (
    <h3 className={className} {...rest}>
      {children}
    </h3>
  );
}

function CardFooter(props) {
  const { children, className = "", ...rest } = props;
  return (
    <div className={className} {...rest}>
      {children}
    </div>
  );
}

function CardDescription(props) {
  const { children, className = "", ...rest } = props;
  return (
    <p className={className} {...rest}>
      {children}
    </p>
  );
}

export { Card, CardHeader, CardContent, CardTitle, CardFooter, CardDescription };
export default Card;