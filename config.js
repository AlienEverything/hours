// GitHub Pages reads the shared backend when accessible, with a dated snapshot fallback.
// Administration opens on the backend so its secure cookie stays first-party.
const githubPages = location.hostname === 'alieneverything.github.io';
window.ATHAR_CONFIG = {
  apiBaseUrl: githubPages ? 'https://athar-school-hours.toughechidna2.chatgpt.site' : '',
  snapshotUrl: githubPages ? './records.json' : ''
};
