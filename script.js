// —— 回到顶部 —— //
const backTopBtn = document.getElementById('back-to-top');
const updateBackTop = () => {
  const y = window.scrollY || document.documentElement.scrollTop;
  backTopBtn.classList.toggle('show', y > 400);
};
window.addEventListener('scroll', updateBackTop);
backTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
updateBackTop();

// ===== 1) 数据来源（仅本地/远程文件；去除内置示例） =====
const LS_KEY = "rockerSwitchProducts";
let products = [];
let filters = { series: "all", pins: "all", positions: "all", light: "all", search: "", size: "" };

const productsContainer = document.getElementById("products-container");
const resultCount = document.getElementById("result-count");
const searchInput = document.getElementById("search-input");
const resetBtn = document.getElementById("reset-filters");
const sortSelect = document.getElementById("sort-by");
const sizeInput = document.getElementById("size-input");
const copyNotification = document.getElementById("copy-notification");

// 可自动探测的本地数据路径（CSV/JSON）
const LOCAL_SOURCES = ['./products.csv', './data/products.csv', './products.json', './data/products.json'];

// ===== 2) 工具函数 =====
function showStatus(msg, type = "info") { console.log(`[${type.toUpperCase()}] ${msg}`); }
function hideStatus() { /* 无 UI 提示位时无需处理 */ }

function normalizeRecord(r) {
  const t = v => (v == null ? "" : String(v).trim());
  let obj = {
    spec: t(r.spec),
    series: t(r.series),
    pins: t(r.pins),
    positions: t(r.positions),
    skuLink: t(r.skuLink),
    light: t(r.light),
    size: t(r.size),
    imageId: t(r.imageId),
    image: t(r.image || r.imageUrl),           // 允许直接提供图片URL
    fullImage: t(r.fullImage || r.fullImageUrl) // 允许提供大图URL（未提供则回退到 image）
  };

  const toIntStr = v => { const n = parseInt(v, 10); return Number.isFinite(n) ? String(n) : ""; };
  obj.pins = toIntStr(obj.pins);
  obj.positions = toIntStr(obj.positions);

  const lamp = obj.light.replace(/\s/g, "").toLowerCase();
  if (["lamp", "led", "light", "withlight", "带灯", "有灯"].includes(lamp)) obj.light = "带灯";
  else if (["nolamp", "withoutlight", "无灯", "不带灯"].includes(lamp)) obj.light = "无灯";

  return obj;
}

function validateRecord(o) {
  if (!/^\d+$/.test(o.pins)) return "pins 必须是整数";
  if (!/^\d+$/.test(o.positions)) return "positions 必须是整数";
  if (!/^https?:\/\//i.test(o.skuLink)) return "skuLink 需要 http/https 链接";
  if (!["带灯", "无灯"].includes(o.light)) return "light 仅支持：带灯/无灯";
  return null;
}

const toUnifiedList = x => (Array.isArray(x) ? x : (Array.isArray(x?.items) ? x.items : [])).map(normalizeRecord);

function setProducts(newList, mode = "replace") {
  products = (mode === "replace") ? [...newList] : [...products, ...newList];
  const seen = new Set();
  products = products.filter(p => { const key = [p.spec, p.series, p.pins, p.positions, p.light].join("|"); if (seen.has(key)) return false; seen.add(key); return true; });
  localStorage.setItem(LS_KEY, JSON.stringify({ ts: Date.now(), items: products }));
  buildAllFacets(products);
  applyFilters();
  showStatus(`已加载数据 ${products.length} 条。`, "success");
}

function parseCsv(text) {
  if (window.Papa) { const out = Papa.parse(text, { header: true, skipEmptyLines: true }); return out.data; }
  const [head, ...rows] = text.split(/\r?\n/).filter(Boolean);
  const headers = head.split(",").map(s => s.trim());
  return rows.map(line => { const cols = line.split(","); const o = {}; headers.forEach((h, i) => o[h] = cols[i] ?? ""); return o; });
}

function ingest(list, mode = "replace") {
  const arr = toUnifiedList(list);
  const ok = [], bad = [];
  arr.forEach((o, i) => {
    const err = validateRecord(o);
    if (err) { console.warn(`记录 ${i} 验证失败: ${err}`, o); bad.push({ i, err }); }
    else { ok.push(o); }
  });
  if (!ok.length) { showStatus(`没有可导入的有效记录。`, "error"); return; }
  setProducts(ok, mode);
}

// —— 动态筛选项 —— //
function sortSeries(a, b) {
  const ma = /^KCD(\d+)/i.exec(a), mb = /^KCD(\d+)/i.exec(b);
  if (ma && mb) return (+ma[1]) - (+mb[1]);
  if (ma) return -1; if (mb) return 1;
  return a.localeCompare(b, 'zh');
}
const sortNumericAsc = (a, b) => (+a) - (+b);

function buildOptions(container, key, values) {
  const current = filters[key];
  if (!values.includes(current)) filters[key] = 'all';
  const chips = [`<div class="filter-option ${filters[key] === 'all' ? 'active' : ''}" data-filter="${key}" data-value="all">全部${key === 'series' ? '系列' : ''}</div>`]
    .concat(values.map(v => `<div class="filter-option ${v === filters[key] ? 'active' : ''}" data-filter="${key}" data-value="${v}">${v}${key === 'pins' ? '脚' : ''}${key === 'positions' ? '档' : ''}</div>`));
  container.innerHTML = chips.join('');
}

function buildAllFacets(list) {
  const s = new Set(), p = new Set(), po = new Set(), l = new Set();
  list.forEach(x => { if (x.series) s.add(x.series.trim()); if (x.pins) p.add(String(x.pins)); if (x.positions) po.add(String(x.positions)); if (x.light) l.add(x.light.trim()); });
  buildOptions(document.getElementById('series-options'), 'series', Array.from(s).sort(sortSeries));
  buildOptions(document.getElementById('pins-options'), 'pins', Array.from(p).sort(sortNumericAsc));
  buildOptions(document.getElementById('positions-options'), 'positions', Array.from(po).sort(sortNumericAsc));
  buildOptions(document.getElementById('light-options'), 'light', Array.from(l).sort((a, b) => a.localeCompare(b, 'zh')));
}

// —— 尺寸解析与匹配 —— //
function parseSize(sizeStr) {
  if (!sizeStr) return null;
  const matchDimensions = sizeStr.match(/(\d+(?:\.\d+)?)\s*[*x×]\s*(\d+(?:\.\d+)?)/i);
  if (matchDimensions) { return { length: parseFloat(matchDimensions[1]), width: parseFloat(matchDimensions[2]), isCircular: false }; }
  const matchSingle = sizeStr.match(/(\d+(?:\.\d+)?)\s*mm?/i);
  if (matchSingle) { return { length: parseFloat(matchSingle[1]), width: null, isCircular: true }; }
  const matchEnd = sizeStr.match(/(\d+(?:\.\d+)?)\s*mm?$/i);
  if (matchEnd) { return { length: parseFloat(matchEnd[1]), width: null, isCircular: true }; }
  return null;
}
function calculateSizeDifference(targetSize, productSize) { if (!targetSize || !productSize) return Infinity; return Math.abs(targetSize - productSize.length); }

// —— 复制链接 —— //
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    copyNotification.classList.add('show');
    setTimeout(() => copyNotification.classList.remove('show'), 2000);
  }).catch(err => { console.error('复制失败:', err); alert('复制链接失败，请手动复制'); });
}

// —— 从本地文件加载 —— //
async function loadFromLocalFiles() {
  hideStatus();
  for (const path of LOCAL_SOURCES) {
    try {
      const res = await fetch(path + (path.includes('?') ? '&' : '?') + 't=' + Date.now(), { cache: 'no-store' });
      if (!res.ok) continue;
      const ct = (res.headers.get('content-type') || '').toLowerCase();
      if (ct.includes('json') || path.toLowerCase().endsWith('.json')) {
        const json = await res.json(); ingest(json, 'replace'); showStatus(`已从本地JSON文件加载：${path}`, 'success'); return true;
      } else if (ct.includes('csv') || path.toLowerCase().endsWith('.csv')) {
        const text = await res.text(); const rows = parseCsv(text); ingest(rows, 'replace'); showStatus(`已从本地CSV文件加载：${path}`, 'success'); return true;
      }
    } catch (e) { console.error(`加载 ${path} 失败:`, e); }
  }
  showStatus('未找到本地数据文件。', 'warn');
  buildAllFacets([]); applyFilters();
  return false;
}

// ===== 3) 事件绑定（委托支持动态按钮） =====
function setupEventListeners() {
  document.querySelector('.filters').addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-option');
    if (!btn || !btn.dataset.filter) return;
    const group = btn.closest('.filter-options');
    group.querySelectorAll('.filter-option').forEach(el => el.classList.remove('active'));
    btn.classList.add('active');
    filters[btn.dataset.filter] = btn.dataset.value;
    applyFilters();
  });

  document.getElementById('search-input').addEventListener('input', function () { filters.search = this.value.toLowerCase(); applyFilters(); });

  document.getElementById('size-input').addEventListener('input', function () { this.value = this.value.replace(/[^\d.]/g, ''); filters.size = this.value; applyFilters(); });

  document.getElementById('reset-filters').addEventListener('click', () => {
    filters = { series: 'all', pins: 'all', positions: 'all', light: 'all', search: '', size: '' };
    buildAllFacets(products);
    document.getElementById('search-input').value = '';
    document.getElementById('size-input').value = '';
    document.getElementById('sort-by').value = 'default';
    applyFilters();
  });

  document.getElementById('sort-by').addEventListener('change', applyFilters);

  // 复制链接（委托）
  document.getElementById('products-container').addEventListener('click', function (e) {
    if (e.target.closest('.copy-link')) {
      const card = e.target.closest('.product-card');
      const link = card.querySelector('.product-link').href;
      copyToClipboard(link);
    }
  });

  // 图片点击放大（委托）
  document.getElementById('products-container').addEventListener('click', function (e) {
    const img = e.target.closest('img[data-full]');
    if (!img) return;
    openLightbox(img.getAttribute('data-full'));
  });

  // 关闭大图
  document.getElementById('lightbox-close').addEventListener('click', closeLightbox);
  document.getElementById('lightbox').addEventListener('click', (e) => { if (e.target.id === 'lightbox') closeLightbox(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLightbox(); });
}

// ===== 4) 过滤 / 渲染 =====
function colorForSeries(s) {
  const fixed = { KCD1: '#3498db', KCD3: '#2ecc71', KCD4: '#e74c3c', KCD11: '#f39c12', '圆形': '#9b59b6', '全圆': '#1abc9c' };
  if (fixed[s]) return fixed[s];
  let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return `hsl(${h % 360} 60% 45%)`;
}

function applyFilters() {
  let list = [...products];
  if (filters.series !== 'all') list = list.filter(p => p.series === filters.series);
  if (filters.pins !== 'all') list = list.filter(p => p.pins === filters.pins);
  if (filters.positions !== 'all') list = list.filter(p => p.positions === filters.positions);
  if (filters.light !== 'all') list = list.filter(p => p.light === filters.light);
  if (filters.search) list = list.filter(p => (p.spec || '').toLowerCase().includes(filters.search));

  const targetSize = parseFloat(filters.size);
  let sizeDiffMap = new Map();
  let filteredList = [];
  let minDiff = Infinity;

  if (!isNaN(targetSize)) {
    list.forEach(p => {
      const parsedSize = parseSize(p.size || '');
      if (parsedSize) {
        const diff = calculateSizeDifference(targetSize, parsedSize);
        sizeDiffMap.set(p, diff);
        if (diff < minDiff) minDiff = diff;
      } else {
        sizeDiffMap.set(p, Infinity);
      }
    });
    if (minDiff === 0) filteredList = list.filter(p => sizeDiffMap.get(p) === 0);
    else if (minDiff <= 5) filteredList = list.filter(p => sizeDiffMap.get(p) === minDiff);
    else filteredList = [];
  } else {
    filteredList = [...list];
  }

  const sortBy = document.getElementById('sort-by').value;
  if (sortBy === 'pins') filteredList.sort((a, b) => (+a.pins) - (+b.pins));
  else if (sortBy === 'pinsDesc') filteredList.sort((a, b) => (+b.pins) - (+a.pins));
  else if (sortBy === 'positions') filteredList.sort((a, b) => (+a.positions) - (+b.positions));
  else if (sortBy === 'positionsDesc') filteredList.sort((a, b) => (+b.positions) - (+a.positions));
  else if (sortBy === 'sizeAsc') filteredList.sort((a, b) => { const A = parseSize(a.size || ''), B = parseSize(b.size || ''); if (A && B) return A.length - B.length; if (A) return -1; if (B) return 1; return 0; });
  else if (sortBy === 'sizeDesc') filteredList.sort((a, b) => { const A = parseSize(a.size || ''), B = parseSize(b.size || ''); if (A && B) return B.length - A.length; if (A) return -1; if (B) return 1; return 0; });

  renderProducts(filteredList, sizeDiffMap, targetSize);
}

function resolveImage(p) {
  // 优先使用 image / fullImage 字段；否则使用 imageId 拼接到本地目录
  const img = p.image || (p.imageId ? `imagef/${p.imageId}.png` : 'LOGO.png');
  const full = p.fullImage || img; // 未提供单独大图地址时，使用同一地址
  return { img, full };
}

function renderProducts(list, sizeDiffMap, targetSize) {
  resultCount.textContent = list.length;
  productsContainer.innerHTML = '';

  if (!isNaN(targetSize) && list.length === 0) {
    productsContainer.innerHTML = `
          <div class="no-results">
            <i class="fas fa-ruler"></i>
            <h3>没有找到匹配尺寸的产品</h3>
            <p>未找到尺寸为 ${targetSize}mm 或接近尺寸 (±5mm) 的产品</p>
            <p>请尝试调整尺寸筛选条件</p>
          </div>`;
    return;
  }

  if (list.length === 0) {
    productsContainer.innerHTML = `
          <div class="no-results">
            <i class="fas fa-search"></i>
            <h3>没有找到匹配的产品</h3>
            <p>请尝试调整筛选条件或搜索关键词</p>
          </div>`;
    return;
  }

  list.forEach(p => {
    const card = document.createElement('div');
    card.className = 'product-card';
    const bg = colorForSeries(p.series || '');
    const parsedSize = parseSize(p.size || '');

    let sizeMatchHtml = '';
    if (!isNaN(targetSize)) {
      const diff = sizeDiffMap.get(p);
      if (diff !== undefined && diff !== Infinity) {
        if (diff === 0) sizeMatchHtml = `<span class="size-match exact">完全匹配 (${targetSize}mm)</span>`;
        else if (diff <= 5) sizeMatchHtml = `<span class="size-match close">接近匹配 (差${diff}mm)</span>`;
      }
    }

    let sizeValue = '未提供';
    if (parsedSize) sizeValue = parsedSize.isCircular ? `直径: ${parsedSize.length}mm` : `长: ${parsedSize.length}mm × 宽: ${parsedSize.width}mm`;

    const { img, full } = resolveImage(p);

    card.innerHTML = `
          <div class="product-image">
            <img src="${img}" data-full="${full}" alt="${p.spec}" loading="lazy"
                 onerror="this.onerror=null; this.src='LOGO.png';" />
          </div>
          <div class="product-info">
            <div class="product-series" style="background:${bg}">${p.series || '未分组'} 系列 ${sizeMatchHtml}</div>
            <h3 class="product-title">${p.spec || ''}</h3>
            <div class="product-specs">
              <div class="spec"><i class="fas fa-microchip"></i> ${p.pins}脚</div>
              <div class="spec"><i class="fas fa-sliders-h"></i> ${p.positions}档</div>
              <div class="spec"><i class="fas fa-lightbulb"></i> ${p.light}</div>
              <div class="spec size-value"><i class="fas fa-ruler"></i> ${sizeValue}</div>
            </div>
            <div class="product-actions">
              <a href="${p.skuLink}" target="_blank" class="product-link">
                <i class="fas fa-external-link-alt"></i> 查看详情
              </a>
              <button class="copy-link" data-link="${p.skuLink}">
                <i class="fas fa-copy"></i> 复制链接
              </button>
            </div>
          </div>`;
    productsContainer.appendChild(card);
  });
}

// —— Lightbox 逻辑 —— //
function openLightbox(src) {
  const lb = document.getElementById('lightbox');
  const img = document.getElementById('lightbox-img');
  img.src = src;
  lb.classList.add('show');
  lb.setAttribute('aria-hidden', 'false');
}
function closeLightbox() {
  const lb = document.getElementById('lightbox');
  const img = document.getElementById('lightbox-img');
  lb.classList.remove('show');
  lb.setAttribute('aria-hidden', 'true');
  // 等待过渡结束后再清理src，避免关闭动画时图片瞬时消失
  setTimeout(() => { img.src = ''; }, 260);
}

// ===== 5) 初始化 =====
function init() {
  setupEventListeners();
  loadFromLocalFiles(); // 不再使用内置示例，纯读取本地/远程数据
}
window.addEventListener('DOMContentLoaded', init);
