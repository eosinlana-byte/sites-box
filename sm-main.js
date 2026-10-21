const navToggle = document.getElementById("navToggle");
const header = document.querySelector(".site-header");
if (navToggle && header) {
  navToggle.onclick = () => {
    const open = header.classList.toggle("open");
    navToggle.textContent = open ? "Close" : "Menu";
  };
  document.querySelectorAll("#siteNav a").forEach((a) => {
    a.addEventListener("click", () => {
      header.classList.remove("open");
      navToggle.textContent = "Menu";
    });
  });
}

const form = document.querySelector("#contact-form");
const status = document.querySelector("#form-status");
if (form) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    status.textContent = "Saving enquiry...";
    const data = Object.fromEntries(new FormData(form));
    try {
      const response = await fetch("/smith/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save enquiry.");
      form.reset();
      status.textContent = "Enquiry saved. I reply within 24 hours.";
    } catch (error) {
      status.textContent = error.message;
    }
  });
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
}

const extras = {
  "Jackson Ryder": {
    type: "Artist website",
    blurb: "A modern website for a singer and songwriter, bringing together music, artist information, shows, gallery content, and contact details.",
    feats: "Music player • Portfolio • Contact • Admin • Responsive",
    photo: "/sm-work-jackson.jpg",
    tone: "shot-a",
    live: "https://jackson-ryder.onrender.com/",
  },
  "Okolibooks Creative": {
    type: "Creative studio website",
    blurb: "A creative studio website built to present services, work, and enquiries.",
    feats: "Services • Work • Enquiries • Admin • Responsive",
    tone: "shot-b",
    live: "",
    note: "The old live host is suspended. I can show the build on a call.",
  },
  "Mirah Tracy": {
    type: "Author service website",
    blurb: "A service website for an author-focused business, with service pages and an enquiry form.",
    feats: "Service pages • Enquiry form • Admin • Responsive",
    photo: "/sm-work-mirah.jpg",
    tone: "shot-c",
    live: "https://sites-box.onrender.com/mirah",
  },
  BrightSpace: {
    type: "Interior design website concept",
    blurb: "A concept for a calm interior design studio site: rooms, process, and enquiry.",
    feats: "Concept • Desktop + mobile layout",
    tone: "shot-d",
    live: "",
    concept: true,
  },
};

function hostOf(url, fallback) {
  try {
    const u = new URL(url);
    return u.host + (u.pathname !== "/" ? u.pathname.replace(/\/$/, "") : "");
  } catch (_) {
    return fallback;
  }
}

function renderCase(item) {
  const extra = extras[item.name] || {};
  let liveUrl = extra.live != null ? extra.live : item.url || "";
  if (/okolibookscreative\.onrender\.com/i.test(liveUrl) || /mirah-tracy\.onrender\.com/i.test(liveUrl)) liveUrl = extra.live || "";
  if (item.name === "Mirah Tracy") liveUrl = "https://sites-box.onrender.com/mirah";
  const type = extra.type || "Website";
  const blurb = extra.blurb || item.description || "";
  const photo = item.image || extra.photo || "";
  const tone = extra.tone || "shot-a";
  const visual = photo
    ? `<img class="shot-photo" src="${escapeHtml(photo)}" alt="${escapeHtml(item.name)}">`
    : `<div class="shot-body ${tone}"><p class="shot-kicker">${escapeHtml(type)}</p><h3>${escapeHtml(item.name)}</h3></div>`;
  const shotInner = `<div class="browser"><i></i><i></i><i></i><span>${escapeHtml(hostOf(liveUrl, item.name))}</span></div>${visual}`;
  const shot = liveUrl
    ? `<a class="shot" href="${escapeHtml(liveUrl)}" target="_blank" rel="noreferrer">${shotInner}</a>`
    : `<div class="shot">${shotInner}</div>`;
  const btn = liveUrl
    ? `<a class="button" href="${escapeHtml(liveUrl)}" target="_blank" rel="noreferrer">View project ↗</a>`
    : "";
  const concept = extra.concept ? `<p class="concept">Concept</p>` : "";
  const note = extra.note ? `<p class="offline-note">${escapeHtml(extra.note)}</p>` : "";
  const feats = extra.feats ? `<p class="feats">${escapeHtml(extra.feats)}</p>` : "";
  return `<article class="case">${shot}<div class="case-copy">${concept}<p class="eyebrow">${escapeHtml(item.name)}</p><h3>${escapeHtml(type)}</h3><p class="role">Design + Development</p><p>${escapeHtml(blurb)}</p>${feats}${note}${btn}</div></article>`;
}

async function loadManagedContent() {
  const work = document.querySelector(".real-work");
  const quotes = document.querySelector(".testimonial-grid");
  const testiWrap = document.getElementById("testimonials");
  try {
    const response = await fetch("/smith/api/content");
    const data = response.ok ? await response.json() : { portfolios: [], testimonials: [] };
    const fromApi = Array.isArray(data.portfolios) ? data.portfolios : [];
    const names = new Set(fromApi.map((p) => p.name));
    const list = fromApi.slice();
    ["Okolibooks Creative", "BrightSpace"].forEach((name) => {
      if (!names.has(name)) list.push({ name, description: extras[name].blurb, url: "", image: "" });
    });
    if (work) work.innerHTML = list.map(renderCase).join("");

    const items = (data.testimonials || []).filter((item) => {
      const q = String(item.quote || "").trim();
      if (/fddxtyssutydty/i.test(q)) return false;
      return q || item.image;
    });
    if (quotes && items.length) {
      if (testiWrap) testiWrap.hidden = false;
      quotes.innerHTML = items
        .map((item) => {
          const who = escapeHtml(item.client || "Client");
          const img = item.image ? `<img src="${item.image}" alt="">` : "";
          const q = escapeHtml(item.quote || "");
          const quote = q ? `<p>${q}</p>` : "";
          return `<figure class="quote-card">${img}<blockquote>${quote}<cite>${who}<span>Website design &amp; development</span></cite></blockquote></figure>`;
        })
        .join("");
    } else if (testiWrap) {
      testiWrap.hidden = true;
    }
  } catch (_) {}
}
loadManagedContent();

const links = [...document.querySelectorAll('#siteNav a[href^="#"]')];
const sections = [...document.querySelectorAll("main section[id]")];
const observer = new IntersectionObserver(
  (entries) =>
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        links.forEach((link) => link.classList.toggle("active", link.getAttribute("href") === `#${entry.target.id}`));
      }
    }),
  { rootMargin: "-35% 0px -55% 0px" }
);
sections.forEach((section) => observer.observe(section));
