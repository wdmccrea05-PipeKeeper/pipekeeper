import React from "react";

function Button(props) {
  const { children, className = "", ...rest } = props;

  return (
    <button className={className} {...rest}>
      {children}
    </button>
  );
}

export { Button };
export default Button;