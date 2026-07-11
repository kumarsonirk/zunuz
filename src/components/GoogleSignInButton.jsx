import React, { useEffect, useRef, useState } from 'react';

// Renders Google's own "Sign in with Google" button via Google Identity Services
// (script loaded in index.html) and forwards the resulting ID token credential.
// The button itself renders inside a Google-controlled iframe, so its fill/hover
// can't be restyled directly — instead we wrap it in a card with its own
// background that's visible before hover, and a distinct shade on hover.
export default function GoogleSignInButton({ onCredential, text = 'continue_with' }) {
  const buttonRef = useRef(null);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId || !window.google?.accounts?.id || !buttonRef.current) return;

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (response) => onCredential(response.credential),
    });
    window.google.accounts.id.renderButton(buttonRef.current, {
      type: 'standard',
      theme: 'filled_black',
      size: 'large',
      shape: 'pill',
      width: 336,
      text,
    });
  }, [onCredential, text]);

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) return null;

  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          borderRadius: '999px',
          padding: '4px',
          background: hovered ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.1)',
          transition: 'background 0.15s ease',
        }}
      >
        <div ref={buttonRef} />
      </div>
    </div>
  );
}
