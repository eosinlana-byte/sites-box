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
    const data = Object.fromEntries(new FormData(form));
    if (data.hp_trap) return;
    status.textContent = "Saving enquiry...";
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

function hostOf(url, fallback) {
  try {
    const u = new URL(url);
    return u.host + (u.pathname !== "/" ? u.pathname.replace(/\/$/, "") : "");
  } catch (_) {
    return fallback;
  }
}

function deadHost(url) {
  return /okolibookscreative\.onrender\.com/i.test(String(url || ""));
}

function liveUrl(item) {
  const url = String(item.url || "").trim();
  if (url && !deadHost(url)) return url;
  const name = String(item.name || "");
  if (/jackson\s*ryder/i.test(name)) return "https://jackson-ryder.onrender.com/";
  if (/mirah\s*tracy/i.test(name)) return "https://sites-box.onrender.com/mirah";
  if (/morgan\s*benjamin/i.test(name)) return "https://sites-box.onrender.com/morgan";
  return "";
}

function displayName(item) {
  const name = String(item.name || "").trim();
  return name.split("|")[0].trim() || name;
}

function projectType(item) {
  const after = String(item.name || "").split("|")[1];
  if (after && after.trim()) return after.trim();
  const tag = String(item.tags || "").split(",")[0].trim();
  return tag || "Website";
}

function feats(item) {
  return String(item.tags || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 8)
    .join(" • ");
}

function photoOf(item) {
  if (item.image) return item.image;
  const name = String(item.name || "");
  if (/jackson/i.test(name)) return "/sm-work-jackson.jpg";
  if (/mirah/i.test(name)) return "/sm-work-mirah.jpg";
  return "";
}

function renderCase(item) {
  const name = displayName(item);
  const type = projectType(item);
  const live = liveUrl(item);
  const photo = photoOf(item);
  const blurb = item.description || "";
  const feat = feats(item);
  const visual = photo
    ? `<img class="shot-photo" src="${escapeHtml(photo)}" alt="${escapeHtml(name)} website" loading="lazy">`
    : `<div class="shot-body shot-a"><p class="shot-kicker">${escapeHtml(type)}</p><h3>${escapeHtml(name)}</h3></div>`;
  const shotInner = `<div class="browser"><i></i><i></i><i></i><span>${escapeHtml(hostOf(live, name))}</span></div>${visual}`;
  const shot = live
    ? `<a class="shot" href="${escapeHtml(live)}" target="_blank" rel="noreferrer">${shotInner}</a>`
    : `<div class="shot">${shotInner}</div>`;
  const btn = live
    ? `<a class="button" href="${escapeHtml(live)}" target="_blank" rel="noreferrer">View project ↗</a>`
    : "";
  return `<article class="case"><div class="shot-wrap">${shot}</div><div class="case-copy"><p class="eyebrow">${escapeHtml(name)}</p><h3>${escapeHtml(type)}</h3><p class="role">Design + Development</p><p>${escapeHtml(blurb)}</p><p class="feats">${escapeHtml(feat)}</p>${btn}</div></article>`;
}

async function loadManagedContent() {
  const work = document.querySelector(".real-work");
  const quotes = document.querySelector(".testimonial-grid");
  const testiWrap = document.getElementById("testimonials");
  try {
    const response = await fetch("/smith/api/content");
    const data = response.ok ? await response.json() : { portfolios: [], testimonials: [] };
    const fromApi = Array.isArray(data.portfolios) ? data.portfolios : [];
    if (work) {
      work.innerHTML = fromApi.length ? fromApi.map(renderCase).join("") : "";
    }

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
          return `<figure class="quote-card">${img}<blockquote>${q ? `<p>${q}</p>` : ""}<cite>${who}<span>Website design &amp; development</span></cite></blockquote></figure>`;
        })
        .join("");
    } else if (testiWrap) testiWrap.hidden = true;
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
