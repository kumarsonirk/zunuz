// True when the element sits in a horizontally scrolling (snap) strip — the
// phone layout of the card rows. Entrance animations must not scale those
// cards: snap points follow the cards' transformed size, so a card growing
// from 0.7 → 1 made the strip scroll sideways and slide back (a visible jolt).
export const inSwipeStrip = (el) => !!el?.parentElement && /auto|scroll/.test(getComputedStyle(el.parentElement).overflowX);
