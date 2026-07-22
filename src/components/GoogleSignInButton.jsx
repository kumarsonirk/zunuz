import React, { useEffect, useRef, useState } from 'react';

// Renders Google's own "Sign in with Google" button via Google Identity Services
// (script loaded in index.html) and forwards the resulting ID token credential.
// The button itself renders inside a Google-controlled iframe, so its fill/hover
// can't be restyled directly — instead we wrap it in a card with its own
// background that's visible before hover, and a distinct shade on hover.
export default function GoogleSignInButton({ onCredential, text = 'continue_with' }) {
  const buttonRef = useRef(null);
  const [hovered, setHovered] = useState(false);

  // The caller (Login/Signup pages) defines its onCredential handler inline,
  // so it's a new function reference on every keystroke-driven re-render.
  // Keeping the latest one in a ref (instead of the effect's dependency
  // array) means the button is initialized/rendered exactly once, instead of
  // Google's iframe getting torn down and re-injected on every render.
  const onCredentialRef = useRef(onCredential);
  useEffect(() => { onCredentialRef.current = onCredential; }, [onCredential]);

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    const render = () => {
      if (!buttonRef.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => onCredentialRef.current(response.credential),
      });
      window.google.accounts.id.renderButton(buttonRef.current, {
        type: 'standard',
        theme: 'filled_black',
        size: 'large',
        shape: 'pill',
        width: 336,
        text,
      });
    };

    if (window.google?.accounts?.id) {
      render();
      return;
    }

    // The GIS <script> tag is async/defer, so it may not have finished
    // loading yet when this effect first runs — poll briefly instead of
    // giving up silently (which would leave the button permanently missing
    // for that visit on a slow connection).
    let attempts = 0;
    const interval = setInterval(() => {
      attempts += 1;
      if (window.google?.accounts?.id) {
        clearInterval(interval);
        render();
      } else if (attempts > 50) { // ~10s at 200ms
        clearInterval(interval);
      }
    }, 200);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

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
          minHeight: '44px',
          minWidth: '336px',
        }}
      >
        <div ref={buttonRef} />
      </div>
    </div>
  );
}
