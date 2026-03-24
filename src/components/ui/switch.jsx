import React from "react";

export default function Switch({ checked, onCheckedChange, disabled = false, className = "", ...rest }) {
  const handleChange = (e) => {
    onCheckedChange?.(e.target.checked);
  };

  return (
    <label className={`relative inline-flex items-center cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={handleChange}
        disabled={disabled}
        className="sr-only"
        {...rest}
      />
      <div className={`w-11 h-6 rounded-full transition-colors ${
        checked ? 'bg-[#A35C5C]' : 'bg-[#3a3a3a]'
      } ${disabled ? 'opacity-50' : ''}`}>
        <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`} />
      </div>
    </label>
  );
}

export { Switch };