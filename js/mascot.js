// Талисман приложения — мультяшный «Srpski coach». mascot({ mouth, eyes, brow, blush }) → SVG.
// head: true — только голова (для аватарок), иначе по пояс.
(() => {
const SKIN = '#f1cdb6', SKIN_D = '#e2b49b', HAIR = '#3b2a22', HAIR_L = '#4f3a2f', SHIRT = '#1d2130';
function hero(o) {
  const { brow = 'flat', eyes = 'open', mouth = 'neutral', talk = 0, look = 0, blush = 0 } = o;
  // брови: смещение по высоте и наклон внутреннего края
  const B = { flat: [0, 0], up: [-16, 0], angry: [6, 12], relax: [-4, -6], tired: [4, -4] }[brow];
  const browL = `<g transform="translate(0 ${B[0]}) rotate(${B[1]} 236 268)"><rect x="196" y="258" width="82" height="17" rx="8.5" fill="${HAIR}"/></g>`;
  const browR = `<g transform="translate(0 ${B[0]}) rotate(${-B[1]} 364 268)"><rect x="322" y="258" width="82" height="17" rx="8.5" fill="${HAIR}"/></g>`;
  const eye = (cx) => {
    if (eyes === 'closed') return `<path d="M${cx - 26} 312 q26 16 52 0" fill="none" stroke="${HAIR}" stroke-width="7" stroke-linecap="round"/>`;
    if (eyes === 'happy') return `<path d="M${cx - 26} 318 q26 -20 52 0" fill="none" stroke="${HAIR}" stroke-width="7" stroke-linecap="round"/>`;
    const lid = eyes === 'half' ? `<path d="M${cx - 30} 300 h60 v14 h-60z" fill="${SKIN}"/><path d="M${cx - 30} 313 q30 -4 60 0" stroke="${HAIR}" stroke-width="5" fill="none"/>` : '';
    return `<ellipse cx="${cx}" cy="312" rx="30" ry="19" fill="#fff"/><circle cx="${cx + look}" cy="313" r="14" fill="#6b4a33"/><circle cx="${cx + look}" cy="313" r="7" fill="#1d130d"/><circle cx="${cx + look + 4}" cy="308" r="4" fill="#fff"/>` +
      `<path d="M${cx - 31} 306 q31 -22 62 0" fill="none" stroke="${HAIR}" stroke-width="4" stroke-linecap="round"/>` + lid;
  };
  const M = {
    neutral: `<path d="M270 448 q30 6 60 0" fill="none" stroke="#b5645a" stroke-width="9" stroke-linecap="round"/>`,
    flat: `<path d="M272 452 h56" fill="none" stroke="#b5645a" stroke-width="9" stroke-linecap="round"/>`,
    smile: `<path d="M258 438 q42 40 84 0" fill="none" stroke="#b5645a" stroke-width="9" stroke-linecap="round"/>`,
    grin: `<path d="M256 432 q44 6 88 0 q-8 52 -44 52 q-36 0 -44 -52z" fill="#7a2f2c"/><path d="M262 434 q38 6 76 0 v10 q-38 6 -76 0z" fill="#fff"/>`,
    o: `<ellipse cx="300" cy="454" rx="20" ry="26" fill="#7a2f2c"/>`,
  };
  let m = M[mouth] || M.neutral;
  if (talk > 0) { const h = 10 + talk * 34; m = `<path d="M262 440 q38 -6 76 0 q-6 ${h} -38 ${h} q-32 0 -38 -${h}z" fill="#7a2f2c"/><path d="M276 ${448 + h * 0.55} q24 -12 48 0" fill="#d9706a"/>`; }
  return `<svg viewBox="0 0 600 760" width="600" height="760">
    <path d="M40 760 q10 -150 150 -190 l60 -18 q50 40 100 0 l60 18 q140 40 150 190z" fill="${SHIRT}"/>
    <path d="M250 552 q50 40 100 0" fill="none" stroke="#2a3044" stroke-width="10"/>
    <rect x="252" y="470" width="96" height="92" rx="30" fill="${SKIN_D}"/>
    <path d="M238 560 q62 70 124 0" fill="none" stroke="#3b2f2a" stroke-width="3"/>
    <ellipse cx="160" cy="330" rx="26" ry="40" fill="${SKIN_D}"/><ellipse cx="440" cy="330" rx="26" ry="40" fill="${SKIN_D}"/>
    <path d="M168 270 q0 -120 132 -120 q132 0 132 120 v70 q0 150 -132 168 q-132 -18 -132 -168z" fill="${SKIN}"/>
    <path d="M186 380 q14 110 114 126 q100 -16 114 -126 q-20 70 -114 82 q-94 -12 -114 -82z" fill="#8a6a58" opacity=".22"/>
    <path d="M262 422 q38 -14 76 0 q-38 8 -76 0z" fill="#8a6a58" opacity=".25"/>
    <ellipse cx="214" cy="386" rx="30" ry="15" fill="#e88f86" opacity="${0.18 + blush * 0.4}"/><ellipse cx="386" cy="386" rx="30" ry="15" fill="#e88f86" opacity="${0.18 + blush * 0.4}"/>
    <path d="M156 300 q-14 -170 150 -182 q150 -6 150 150 l-6 40 q-10 -70 -60 -96 q-70 40 -190 34 q-30 20 -36 70z" fill="${HAIR}"/>
    <path d="M190 200 q70 -70 220 -40 q-60 -10 -130 30 q-50 22 -90 10z" fill="${HAIR_L}"/>
    <path d="M230 186 q120 -40 200 24" fill="none" stroke="${HAIR_L}" stroke-width="10" stroke-linecap="round"/>
    ${browL}${browR}${eye(236)}${eye(364)}
    <path d="M300 320 q-6 50 -18 74 q18 10 36 0" fill="none" stroke="${SKIN_D}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
    ${m}
  </svg>`;
}
  window.mascot = (o = {}) => {
    const svg = hero(o);
    return o.head ? svg.replace('viewBox="0 0 600 760" width="600" height="760"', 'viewBox="122 96 356 430" class="mascot" aria-hidden="true"')
      : svg.replace('viewBox="0 0 600 760" width="600" height="760"', 'viewBox="0 0 600 760" class="mascot" aria-hidden="true"');
  };
})();
