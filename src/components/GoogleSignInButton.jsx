import { useEffect, useRef } from 'react';

// Renders Google's own "Sign in with Google" button via Google Identity Services
// (script loaded in index.html) and forwards the resulting ID token credential.
// The button itself renders inside a Google-controlled iframe, so its fill/hover
// can't be restyled directly — it's Google's light "outline" pill (to sit on
// the cream storefront), sized to the column it's in, inside a soft wrapper
// that lifts on hover.
export default function GoogleSignInButton({ onCredential, text = 'continue_with' }) {
  const buttonRef = useRef(null);

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
      // GIS takes a fixed pixel width (200–400) — fit the column.
      const width = Math.max(200, Math.min(400, Math.floor(buttonRef.current.parentElement.clientWidth - 8)));
      window.google.accounts.id.renderButton(buttonRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        shape: 'pill',
        width,
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
  }, [text]);

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) return null;

  return (
    <div className="flex min-h-[48px] w-full justify-center rounded-full bg-white p-1 shadow-[0_10px_24px_-18px_rgba(17,17,16,0.5)] transition-[translate,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_30px_-18px_rgba(17,17,16,0.55)]">
      <div ref={buttonRef} />
    </div>
  );
}
