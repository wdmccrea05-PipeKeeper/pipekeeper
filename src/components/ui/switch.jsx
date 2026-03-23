import React from "react";

export default function Switch(props) {
  const { children, className = "", ...rest } = props;

  return (
    <input type="checkbox" className={className} {...rest} />
  );
}

export { Switch };