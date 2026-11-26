const paths={
  mark:'<path d="M3 18.5 12 3v15.5z" fill="currentColor" stroke="none"/><path d="M14 7.5v11h7z" fill="currentColor" opacity=".68" stroke="none"/><path d="M2 21q4-2 8 0t8 0l4-.5"/>',
  compass:'<circle cx="12" cy="12" r="8.4"/><path d="m16 7-2.5 6.5L7 17l3-7z"/>',sun:'<circle cx="12" cy="12" r="3.7"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  moon:'<path d="M19.8 15.3A8.3 8.3 0 0 1 8.7 4.2a8.5 8.5 0 1 0 11.1 11.1Z"/>',
  sound:'<path d="m4 10 4 0 5-4v12l-5-4H4zM16 8q4 4 0 8m3-11q7 7 0 14"/>',mute:'<path d="m4 10 4 0 5-4v12l-5-4H4zM16 9l5 6m0-6-5 6"/>',
  settings:'<path d="m10 3 4 0 .7 2.1 2 .9 2.1-.5 2 3.5-1.5 1.7v2.5l1.5 1.5-2 3.6-2.2-.5-2 .9L14 21h-4l-.7-1.9-2-.9-2.2.5-2-3.6 1.5-1.5v-2.5L3.1 9.4l2-3.5 2.1.5 2-.9z"/><circle cx="12" cy="12" r="3"/>',
  build:'<path d="m2 9 10-5 10 5-10 5zM2 13l10 5 10-5M2 17l10 5 10-5"/>',bag:'<path d="M6 9q0-3 3-3h6q3 0 3 3l1 10q0 2-3 2H8q-3 0-3-2zM9 6q0-5 3-5t3 5M8 14h8v4H8z"/>',
  log:'<path d="M5 3h13q2 0 2 2v15H6q-2 0-2-2V5q0-2 2-2zm2 0v17m3-12h6m-6 4h5"/>',
  water:'<path d="M12 2c-1.4 3.3-6.6 7.6-6.6 12a6.6 6.6 0 0 0 13.2 0C18.6 9.6 13.4 5.3 12 2Z"/><path d="M8.6 14.8q.5 2.4 3 2.8"/>',
  fish:'<path d="M3 12c4-5 9-6 14-1l4-3v8l-4-3c-5 5-10 4-14-1Z"/><path d="M8 12h.1m4-4 2-3 2 4"/>',
  bench:'<path d="M3 10h18v4H3zM6 14v7m12-7v7M6 18h12M6 9l3-6 4 2-2 4m3 0 4-4"/>',
  lighthouse:'<path d="M8 21l1.6-11h4.8L16 21M6 21h12M8 10h8V6H8Zm0-4 4-3 4 3M12 7v2m-6 -2H3m15 0h3M11.3 21v-3h1.4v3"/>',
  wood:'<path d="m2 14 11-10 8 5-11 11-8-4z" fill="#c39b70"/><path d="m2 14 8 4L21 8m-11 10v2M7 13l7-6"/>',
  fiber:'<path d="M7 21q7-9 9-18M10 15Q2 14 4 8q6 0 6 7Zm3-4q-3-6 1-9 4 4-1 9Zm-3 6q2-7 10-8 0 7-10 8Z" fill="#8eaa87"/>',
  scrap:'<path d="m3 12 8-7 10 4v5l-8 6-10-4z" fill="#9aabb0"/><path d="m3 12 10 4 8-7m-8 7v4m-5-8 4-3 4 1"/>',
  center:'<circle cx="12" cy="12" r="6.8"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/>',
  close:'<path d="m6 6 12 12M18 6 6 18"/>',check:'<path d="m4 13 5 5L20 6"/>',remove:'<path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14m-8 4v6m4-6v6"/>',
  play:'<path d="m7.5 4.5 12 7.5-12 7.5z" fill="currentColor" stroke="none"/>',pointer:'<path d="m5 3 12 10-6 1-3 6z"/>',
  drag:'<path d="M3 12h18M6 9l-3 3 3 3m12-6 3 3-3 3"/>',zoom:'<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6M7 10h6m-3-3v6"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>',wave:'<path d="M2 9q3-4 7 0t7 0t6 0M2 15q3-4 7 0t7 0t6 0"/>',flag:'<path d="M5 22V3q5-3 9 0t6 0v10q-4 3-8 0t-7 0"/>'
};
export function icon(name,size=20){return '<svg aria-hidden="true" width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round">'+(paths[name]||'')+'</svg>';}

