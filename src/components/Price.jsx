import React from 'react';

// The app's display fonts (Grift/Qrokinex) render the ₹ glyph inconsistently,
// so it always opts out to the browser's default font while the digits keep
// whatever font-family the surrounding text uses.
export default function Price({ value }) {
  const str = String(value ?? '');
  if (!str.startsWith('₹')) return str;
  return (
    <>
      <span className="price-symbol">₹</span>
      {str.slice(1)}
    </>
  );
}
