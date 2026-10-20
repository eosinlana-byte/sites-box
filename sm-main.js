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

async function loadManagedContent() {
  const work = document.querySelector(".real-work");
  const quotes = document.querySelector(".testimonial-grid");
  const testiWrap = document.getElementById("testimonials");
  try {
    const response = await fetch("/smith/api/content");
    if (!response.ok) return;
    const data = await response.json();
    const extras = {
      "Jackson Ryder": {
        type: "Artist website",
        blurb: "A personal website for a singer and songwriter, featuring music, portfolio, services, contact, and admin functionality.",
        feats: "Music Player • Portfolio • Contact • Admin • Responsive Design",
        photo: "/sm-work-jackson.jpg",
        tone: "shot-a",
      },
      "Mirah Tracy": {
        type: "Author service website",
        blurb: "A service website for an author-focused business, with service pages and an enquiry form.",
        feats: "Service Pages • Enquiry Form • Admin • Responsive Design",
        photo: "/sm-work-mirah.jpg",
        tone: "shot-c",
      },
    };
    if (work && data.portfolios) {
      work.innerHTML = data.portfolios
        .map((item) => {
          const extra = extras[item.name] || {};
          let liveUrl = item.url || "";
          if (/okolibookscreative\.onrender\.com/i.test(liveUrl) || /mirah-tracy\.onrender\.com/i.test(liveUrl)) liveUrl = "";
          if (item.name === "Mirah Tracy") liveUrl = "https://sites-box.onrender.com/mirah";
          const host = (() => {
            try {
              const u = new URL(liveUrl);
              return u.host + (u.pathname !== "/" ? u.pathname.replace(/\/$/, "") : "");
            } catch (_) {
              return item.name;
            }
          })();
          const type = extra.type || "Website";
          const blurb = extra.blurb || item.description || "";
          const feats = extra.feats ? `<p class="feats">${escapeHtml(extra.feats)}</p>` : "";
          const photo = item.image || extra.photo || "";
          const tone = extra.tone || "shot-a";
          const visual = photo
            ? `<img class="shot-photo" src="${escapeHtml(photo)}" alt="${escapeHtml(item.name)}">`
            : `<div class="shot-body ${tone}"><p class="shot-kicker">${escapeHtml(type)}</p><h3>${escapeHtml(item.name)}</h3><div class="shot-rows"><b></b><b></b><b></b></div></div>`;
          const shotInner = `<div class="browser"><i></i><i></i><i></i><span>${escapeHtml(host)}</span></div>${visual}`;
          const shot = liveUrl
            ? `<a class="shot" href="${escapeHtml(liveUrl)}" target="_blank" rel="noreferrer">${shotInner}</a>`
            : `<div class="shot">${shotInner}</div>`;
          const btn = liveUrl
            ? `<a class="button" href="${escapeHtml(liveUrl)}" target="_blank" rel="noreferrer">VIEW LIVE SITE <span>↗</span></a>`
            : "";
          return `<article class="case">${shot}<div class="case-copy"><p class="eyebrow">${escapeHtml(item.name)}</p><h3>${escapeHtml(type)}</h3><p class="role">Design + Development</p><p>${escapeHtml(blurb)}</p>${feats}${btn}</div></article>`;
        })
        .join("");
    }
    const items = (data.testimonials || []).filter((item) => String(item.image || "").trim());
    if (quotes && items.length) {
      if (testiWrap) {
        testiWrap.hidden = false;
        testiWrap.removeAttribute("hidden");
        testiWrap.style.display = "block";
      }
      quotes.innerHTML = items
        .map((item) => `<figure class="shot-card"><img src="${item.image}" alt=""></figure>`)
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
