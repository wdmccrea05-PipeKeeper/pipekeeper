import React from "react";

export default function Input(props) {
  const { children, className = "", ...rest } = props;

  return <input className={className} {...rest}>{children}</input>;
}

export { Input };