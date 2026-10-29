// Project Pod site: news, scroll reveals, Ether particles, lightbox, ambient toggle. No dependencies.
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

// news.json (every release, newest first) is written from CHANGELOG.md by the publish step; the page keeps working without it.
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; };
const notes = r => [].concat(r.sections || []).flatMap(s => {
  const ul = el('ul');
  for (const t of [].concat(s.items || [])) ul.append(el('li', '', t)); // PowerShell writes a one-item list as a string
  return [el('h4', 'pn-sec', s.name), ul];
});
fetch('news.json').then(r => r.json()).then(all => {
  const rs = [].concat(all), [n, ...older] = rs;
  document.getElementById('news').replaceChildren(
    el('h3', '', `Version ${n.version}`), el('p', 'note', `${n.date}  ·  ${n.title}`), ...notes(n));
  const v = document.getElementById('version-line');
  v.textContent = `Latest: version ${n.version}`; v.hidden = false;
  const box = document.getElementById('patch-notes');
  for (const r of older) {
    const d = el('details', 'pn'), s = el('summary');
    s.append(el('span', 'pn-ver', `Version ${r.version}`), el('span', 'pn-date', r.date));
    d.append(s, el('p', 'note', r.title), ...notes(r));
    box.append(d);
  }
  box.closest('section').hidden = older.length === 0;
}).catch(() => {});

// Download counter: GitHub counts each release asset. The website links ProjectPodSetup.exe (self-updates fetch ProjectPodLauncher.exe),
// and v0.2.0's launcher only ever came from the website. Cached 10 min: the API allows 60 calls an hour per visitor.
(async () => {
  const KEY = 'pod-downloads', box = document.getElementById('dl-count');
  let n;
  try { const c = JSON.parse(sessionStorage.getItem(KEY)); if (c && Date.now() - c.t < 600000) n = c.n; } catch (e) {}
  if (n === undefined) {
    try {
      const r = await fetch('https://api.github.com/repos/Blobbins/project-pod-play/releases?per_page=100');
      if (!r.ok) return;
      n = (await r.json()).flatMap(rel => rel.assets.filter(a => a.name === 'ProjectPodSetup.exe'
        || (rel.tag_name === 'v0.2.0' && a.name === 'ProjectPodLauncher.exe'))).reduce((s, a) => s + a.download_count, 0);
      try { sessionStorage.setItem(KEY, JSON.stringify({ n, t: Date.now() })); } catch (e) {}
    } catch (e) { return; }
  }
  box.replaceChildren(el('strong', '', n.toLocaleString()), document.createTextNode(n === 1 ? ' download' : ' downloads'));
  box.hidden = false;
})();

// Sections rise in once as they scroll into view.
const io = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}), { rootMargin: '0px 0px -8% 0px' });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

// Ether motes drifting up over the hero; stops when off screen or when the visitor prefers no motion.
(() => {
  const c = document.getElementById('ether');
  if (still || !c.getContext) return;
  const g = c.getContext('2d');
  let w, h, dpr, motes = [], on = true, raf = 0;
  const resize = () => {
    dpr = Math.min(devicePixelRatio || 1, 2);
    w = c.clientWidth; h = c.clientHeight;
    c.width = w * dpr; c.height = h * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round(Math.min(70, w * h / 18000));
    motes = Array.from({ length: n }, () => mote(true));
  };
  const mote = any => ({ x: Math.random() * w, y: any ? Math.random() * h : h + 10, r: .6 + Math.random() * 2.2,
    v: .15 + Math.random() * .45, sway: Math.random() * 6.28, a: .25 + Math.random() * .6 });
  const tick = t => {
    g.clearRect(0, 0, w, h);
    g.globalCompositeOperation = 'lighter';
    for (const m of motes) {
      m.y -= m.v; m.x += Math.sin(t / 2400 + m.sway) * .25;
      if (m.y < -10) Object.assign(m, mote(false));
      const fade = Math.min(1, m.y / (h * .35)) * m.a;
      const grd = g.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r * 4);
      grd.addColorStop(0, `rgba(160,245,255,${fade})`); grd.addColorStop(1, 'rgba(110,231,242,0)');
      g.fillStyle = grd; g.beginPath(); g.arc(m.x, m.y, m.r * 4, 0, 6.283); g.fill();
    }
    raf = on ? requestAnimationFrame(tick) : 0;
  };
  resize(); addEventListener('resize', resize);
  new IntersectionObserver(([e]) => { on = e.isIntersecting; if (on && !raf) raf = requestAnimationFrame(tick); }).observe(c);
})();

// Lightbox over every screenshot button, in page order.
(() => {
  const box = document.getElementById('lightbox'), img = box.querySelector('img');
  const shots = [...document.querySelectorAll('.shot img')];
  let i = 0;
  const show = n => { i = (n + shots.length) % shots.length; img.src = shots[i].src; img.alt = shots[i].alt; };
  shots.forEach((s, n) => s.parentElement.addEventListener('click', () => { show(n); box.showModal(); }));
  box.querySelector('.lb-close').onclick = () => box.close();
  box.querySelector('.lb-prev').onclick = () => show(i - 1);
  box.querySelector('.lb-next').onclick = () => show(i + 1);
  box.addEventListener('click', e => { if (e.target === box) box.close(); });
  box.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') show(i - 1); if (e.key === 'ArrowRight') show(i + 1); });
})();

// Ambient music: off until the visitor asks for it.
(() => {
  const b = document.getElementById('sound');
  let a = null;
  b.addEventListener('click', () => {
    if (!a) { a = new Audio('ambient.ogg'); a.loop = true; a.volume = .4; }
    const play = b.getAttribute('aria-pressed') !== 'true';
    if (play) a.play().catch(() => {}); else a.pause();
    b.setAttribute('aria-pressed', play);
    b.setAttribute('aria-label', play ? 'Mute ambient music' : 'Play ambient music');
  });
})();
