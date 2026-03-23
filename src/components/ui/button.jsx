import React from "react";

export default function Button(props) {
  const { children, className = "", ...rest } = props;

  return (
    <button className={className} {...rest}>
      {children}
    </button>
  );
}