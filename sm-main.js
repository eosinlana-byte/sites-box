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

document.querySelectorAll(".work-filters .chip").forEach((chip) => {
  chip.onclick = () => {
    document.querySelectorAll(".work-filters .chip").forEach((c) => c.classList.remove("on"));
    chip.classList.add("on");
    const f = chip.dataset.filter;
    document.querySelectorAll(".case-list .case").forEach((card) => {
      card.classList.toggle("hidden-cat", f !== "all" && card.dataset.cat !== f);
    });
  };
});

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
  const testimonials = document.querySelector(".testimonial-grid");
  try {
    const response = await fetch("/smith/api/content");
    if (!response.ok) return;
    const data = await response.json();
    const known = new Set(["Jackson Ryder", "Okolibooks Creative", "Mirah Tracy"]);
    if (work && data.portfolios && data.portfolios.length) {
      const extra = data.portfolios.filter((item) => !known.has(item.name));
      extra.forEach((item) => {
        const liveUrl = item.url || "";
        const dead = /okolibookscreative\.onrender\.com/i.test(liveUrl);
        const link = liveUrl && !dead
          ? `<a class="button button-light" href="${escapeHtml(liveUrl)}" target="_blank" rel="noreferrer">VIEW LIVE SITE <span>↗</span></a>`
          : "";
        const article = document.createElement("article");
        article.className = "case";
        article.dataset.cat = "business";
        article.innerHTML = `<div class="shot"><div class="browser"><i></i><i></i><i></i><span>${escapeHtml(item.name)}</span></div><div class="shot-body"><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.description || "")}</p></div></div><div class="case-copy"><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.description || "")}</p>${item.result ? `<p>${escapeHtml(item.result)}</p>` : ""}${link}</div>`;
        work.appendChild(article);
      });
    }
    const testiWrap = document.getElementById("testimonials");
    const items = (data.testimonials || []).filter((item) => String(item.quote || "").trim() || item.image);
    if (testimonials && items.length) {
      if (testiWrap) {
        testiWrap.hidden = false;
        testiWrap.removeAttribute("hidden");
        testiWrap.style.display = "block";
      }
      testimonials.innerHTML = items
        .map((item) => {
          const who = `${escapeHtml(item.client || "")}${item.role ? `, ${escapeHtml(item.role)}` : ""}`;
          const body = item.image
            ? `<img src="${item.image}" alt="${escapeHtml(item.client || "")} testimonial">`
            : `<blockquote><p>${escapeHtml(item.quote || "")}</p><cite>${who}</cite></blockquote>`;
          return `<figure class="testimonial-image-card">${body}<figcaption>${who}</figcaption></figure>`;
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
      if (entry.isIntersecting) links.forEach((link) => link.classList.toggle("active", link.getAttribute("href") === `#${entry.target.id}`));
    }),
  { rootMargin: "-35% 0px -55% 0px" }
);
sections.forEach((section) => observer.observe(section));
