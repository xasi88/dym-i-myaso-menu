// Логика меню: вывод товаров, корзина, расчёт суммы, отправка заказа.
// Данные лежат в data/menu.js (window.SHOP, window.MENU, window.REVIEWS).

const S = window.SHOP;
const ITEMS = Object.fromEntries(MENU.flatMap(c => c.items).map(i => [i.id, i]));
const CART_KEY = "dimMyasoCartV1";

const $ = id => document.getElementById(id);
const rub = v => Math.round(v).toLocaleString("ru-RU") + " ₽";
const step = i => (i.unit === "kg" ? 0.5 : 1);
const unitLabel = i => (i.unit === "kg" ? "кг" : i.unitName || "шт");
// Склонение штук: 1 пачка, 2 пачки, 5 пачек
const FORMS = { шт: ["шт", "шт", "шт"], пачка: ["пачка", "пачки", "пачек"], банка: ["банка", "банки", "банок"], сет: ["сет", "сета", "сетов"], набор: ["набор", "набора", "наборов"] };
function plural(n, word) {
  const f = FORMS[word] || [word, word, word], a = n % 100, b = n % 10;
  return a > 10 && a < 20 ? f[2] : b === 1 ? f[0] : b >= 2 && b <= 4 ? f[1] : f[2];
}
const fmtQty = (i, q) => (i.unit === "kg" ? String(q).replace(".", ",") + " кг" : q + " " + plural(q, unitLabel(i)));

// Корзина: { id: количество }. Хранится в браузере, чтобы не пропала при перезагрузке.
let cart = {};
try { cart = JSON.parse(localStorage.getItem(CART_KEY)) || {}; } catch (e) { cart = {}; }
for (const id of Object.keys(cart)) if (!ITEMS[id] || ITEMS[id].soldOut) delete cart[id];
const saveCart = () => { try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) {} };

function cartTotal() {
  return Object.entries(cart).reduce((s, [id, q]) => s + ITEMS[id].price * q, 0);
}

function changeQty(id, dir) {
  const i = ITEMS[id];
  if (!i || i.soldOut) return;
  let q = Math.round(((cart[id] || 0) + dir * step(i)) * 10) / 10;
  if (q <= 0) delete cart[id]; else cart[id] = q;
  saveCart();
  refresh(id);
}

// ---------- Вывод ----------

function ctlHtml(i) {
  if (i.soldOut) return `<button class="add" disabled>Нет в наличии</button>`;
  const q = cart[i.id];
  return q
    ? `<div class="qty" data-id="${i.id}"><button data-a="-1" aria-label="Меньше">−</button><b>${fmtQty(i, q)}</b><button data-a="1" aria-label="Больше">+</button></div>`
    : `<button class="add" data-id="${i.id}" data-a="1">В корзину</button>`;
}

function priceHtml(i) {
  return `${rub(i.price)} <small>/ ${unitLabel(i)}</small>`;
}

function renderMenu() {
  $("cats").innerHTML = MENU.map(c => `<a href="#sec-${c.id}" data-cat="${c.id}">${c.title}</a>`).join("");
  $("menu").innerHTML = MENU.map(c => `
    <section class="sec" id="sec-${c.id}">
      <h2>${c.title}</h2>
      <p class="sec-note">${c.note || ""}</p>
      <div class="grid">${c.items.map(i => `
        <article class="item${i.soldOut ? " soldout" : ""}">
          <button class="pic" data-open="${i.id}" aria-label="Подробнее: ${i.name}">
            <img src="${i.img}" alt="${i.name}" loading="lazy" width="800" height="600">
            ${i.soldOut ? `<span class="badge">Нет в наличии</span>` : i.badge ? `<span class="badge">${i.badge}</span>` : ""}
          </button>
          <div class="body">
            <button class="name" data-open="${i.id}">${i.name}</button>
            <p class="desc">${i.desc}</p>
            <div class="row"><div class="price">${priceHtml(i)}</div><div class="ctl" data-ctl="${i.id}">${ctlHtml(i)}</div></div>
          </div>
        </article>`).join("")}
      </div>
    </section>`).join("");

  $("reviews").innerHTML = REVIEWS.map(t => `<div class="review"><div class="stars">★★★★★</div>${t}</div>`).join("");
}

function renderCart() {
  const ids = Object.keys(cart);
  $("lines").innerHTML = ids.map(id => {
    const i = ITEMS[id], q = cart[id];
    return `<div class="line"><img src="${i.img}" alt="">
      <div class="info"><div class="n">${i.name}</div><div class="m">${rub(i.price)} / ${unitLabel(i)} · ${rub(i.price * q)}</div></div>
      <div class="qty" data-id="${id}"><button data-a="-1" aria-label="Меньше">−</button><b>${fmtQty(i, q)}</b><button data-a="1" aria-label="Больше">+</button></div></div>`;
  }).join("");
  $("total").textContent = rub(cartTotal());
}

function refresh(changedId) {
  if (changedId) document.querySelectorAll(`[data-ctl="${changedId}"]`).forEach(el => (el.innerHTML = ctlHtml(ITEMS[changedId])));
  if (openItem) $("dCtl").innerHTML = ctlHtml(openItem);
  const n = Object.keys(cart).length;
  const bar = $("bar");
  bar.classList.toggle("show", n > 0);
  $("barCount").textContent = n;
  $("barSum").textContent = rub(cartTotal());
  if (changedId) { const b = bar.firstElementChild; b.classList.remove("bump"); void b.offsetWidth; b.classList.add("bump"); }
  renderCart();
  if (!n) closeSheet("cart");
}

// ---------- Окна ----------

let openItem = null;

function openSheet(id) { $(id).classList.add("show"); $(id).setAttribute("aria-hidden", "false"); document.body.classList.add("lock"); }
function closeSheet(id) {
  $(id).classList.remove("show"); $(id).setAttribute("aria-hidden", "true");
  if (id === "details") openItem = null;
  if (!document.querySelector(".sheet.show")) document.body.classList.remove("lock");
}

function openDetails(id) {
  const i = ITEMS[id];
  openItem = i;
  $("dImg").src = i.img; $("dImg").alt = i.name;
  $("dName").textContent = i.name;
  $("dDesc").textContent = i.desc;
  $("dPrice").innerHTML = priceHtml(i);
  $("dCtl").innerHTML = ctlHtml(i);
  openSheet("details");
}

// ---------- Заказ ----------

let way = "Самовывоз";

function orderText() {
  const v = id => $(id).value.trim();
  const lines = Object.entries(cart).map(([id, q], k) => {
    const i = ITEMS[id];
    return `${k + 1}. ${i.name}: ${fmtQty(i, q)} = ${rub(i.price * q)}`;
  });
  let t = `Ассаламу алейкум! Хочу заказать:\n\n${lines.join("\n")}\n\nИтого: ${rub(cartTotal())}\nПолучение: ${way}`;
  if (way === "Доставка" && v("addr")) t += `\nАдрес: ${v("addr")}`;
  if (v("name")) t += `\nИмя: ${v("name")}`;
  if (v("when")) t += `\nКогда: ${v("when")}`;
  if (v("comment")) t += `\nПожелания: ${v("comment")}`;
  return t;
}

let toastTimer;
function toast(msg) {
  const t = $("toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 2800);
}

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch (e) {
    const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select();
    const ok = document.execCommand("copy"); ta.remove(); return ok;
  }
}

// ---------- События ----------

document.addEventListener("click", e => {
  const open = e.target.closest("[data-open]");
  if (open) return openDetails(open.dataset.open);

  const btn = e.target.closest("[data-a]");
  if (btn) {
    const id = btn.dataset.id || btn.closest("[data-id]")?.dataset.id;
    return changeQty(id, Number(btn.dataset.a));
  }

  if (e.target.closest("[data-close]")) return closeSheet(e.target.closest(".sheet").id);
  if (e.target.classList.contains("sheet")) return closeSheet(e.target.id);
});

document.addEventListener("keydown", e => {
  if (e.key === "Escape") document.querySelectorAll(".sheet.show").forEach(s => closeSheet(s.id));
});

$("openCart").onclick = () => { renderCart(); openSheet("cart"); };
$("clear").onclick = () => { const ids = Object.keys(cart); cart = {}; saveCart(); ids.forEach(id => refresh(id)); };

$("way").onclick = e => {
  const b = e.target.closest("button"); if (!b) return;
  way = b.dataset.v;
  [...$("way").children].forEach(x => x.classList.toggle("on", x === b));
  $("addrBox").hidden = way !== "Доставка";
};

$("sendWa").onclick = () => {
  if (way === "Доставка" && !$("addr").value.trim()) { $("addr").focus(); return toast("Укажите адрес доставки"); }
  window.open(`https://wa.me/${S.phone}?text=${encodeURIComponent(orderText())}`, "_blank", "noopener");
};

$("sendIg").onclick = async () => {
  const ok = await copyText(orderText());
  toast(ok ? "Заказ скопирован. Вставьте его в чат Instagram." : "Не получилось скопировать");
  if (ok) setTimeout(() => window.open(`https://ig.me/m/${S.instagram}`, "_blank", "noopener"), 900);
};

// Подсветка текущего раздела в верхнем меню
const io = new IntersectionObserver(entries => {
  entries.forEach(en => {
    if (!en.isIntersecting) return;
    const id = en.target.id.replace("sec-", "");
    document.querySelectorAll(".cats a").forEach(a => {
      const on = a.dataset.cat === id;
      a.classList.toggle("on", on);
      if (on) a.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
    });
  });
}, { rootMargin: "-40% 0px -55% 0px" });

// ---------- Запуск ----------

$("demo").hidden = !S.demo;
$("slogan").textContent = S.slogan;
$("place").textContent = S.place;
$("chef").textContent = `${S.chef} · ${S.place}`;
$("tel").href = `tel:+${S.phone}`; $("tel").textContent = S.phoneText;
$("insta").href = `https://www.instagram.com/${S.instagram}/`; $("insta").textContent = "@" + S.instagram;

renderMenu();
document.querySelectorAll(".sec").forEach(s => io.observe(s));
refresh();
