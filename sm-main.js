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
    const known = new Set(["Jackson Ryder", "Okolibooks Creative", "Mirah Tracy"]);
    if (work && data.portfolios && data.portfolios.length) {
      data.portfolios
        .filter((item) => !known.has(item.name))
        .forEach((item) => {
          const liveUrl = item.url || "";
          const dead = /okolibookscreative\.onrender\.com/i.test(liveUrl);
          const link =
            liveUrl && !dead
              ? `<a class="button" href="${escapeHtml(liveUrl)}" target="_blank" rel="noreferrer">VIEW LIVE SITE <span>↗</span></a>`
              : "";
          const article = document.createElement("article");
          article.className = "case";
          article.innerHTML = `<div class="shot"><div class="browser"><i></i><i></i><i></i><span>${escapeHtml(item.name)}</span></div><div class="shot-body"><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.description || "")}</p></div></div><div class="case-copy"><h3>${escapeHtml(item.name)}</h3><p class="role">Design + Development</p><p>${escapeHtml(item.description || "")}</p>${link}</div>`;
          work.appendChild(article);
        });
    }
    const items = (data.testimonials || []).filter((item) => String(item.quote || "").trim() || item.image);
    if (quotes && items.length) {
      if (testiWrap) {
        testiWrap.hidden = false;
        testiWrap.removeAttribute("hidden");
        testiWrap.style.display = "block";
      }
      quotes.innerHTML = items
        .map((item) => {
          const who = escapeHtml(item.client || "");
          const img = item.image ? `<img src="${item.image}" alt="">` : "";
          const q = escapeHtml(item.quote || "");
          return `<figure class="quote-card">${img}<blockquote><p>${q}</p><cite>${who}<span>Website Design &amp; Development</span></cite></blockquote></figure>`;
        })
        .join("");
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
