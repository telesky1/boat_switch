// —— 回到顶部 —— //
const backTopBtn = document.getElementById('back-to-top');
const updateBackTop = () => {
  const y = window.scrollY || document.documentElement.scrollTop;
  backTopBtn.classList.toggle('show', y > 400);
};
window.addEventListener('scroll', updateBackTop);
backTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
updateBackTop();

// ===== 1) 内置示例 =====
const sampleProducts = [
  { spec: "KCD1 2脚2档 红色 铜脚 （2个）", series: "KCD1", pins: "2", positions: "2", skuLink: "https://detail.tmall.com/item.htm?id=41210111230&skuId=3771562397627", light: "无灯", size: "20*15mm" },
  { spec: "KCD1 3脚2档 红灯 铜脚（2个）", series: "KCD1", pins: "3", positions: "2", skuLink: "https://detail.tmall.com/item.htm?id=41210111230&skuId=3942233594085", light: "带灯", size: "25*20mm" },
  { spec: "KCD3 两档3脚 黑色红灯（1个）", series: "KCD3", pins: "3", positions: "2", skuLink: "https://detail.tmall.com/item.htm?id=41210111230&skuId=4394192173810", light: "带灯", size: "22*18mm" },
  { spec: "KCD4 4脚2档绿灯 1个", series: "KCD4", pins: "4", positions: "2", skuLink: "https://detail.tmall.com/item.htm?id=41210111230&skuId=4919743109654", light: "带灯", size: "30*25mm" },
  { spec: "KCD11 2脚2档 红色 KCD11 10x15mm（5个）", series: "KCD11", pins: "2", positions: "2", skuLink: "https://detail.tmall.com/item.htm?id=41210111230&skuId=4919743109681", light: "无灯", size: "10x15mm" },
  { spec: "圆形开关 开孔11.5MM 有档开关带线（自锁）红色（1个）", series: "圆形", pins: "2", positions: "2", skuLink: "https://detail.tmall.com/item.htm?id=41210111230&skuId=4919743109587", light: "无灯", size: "15mm" },
  { spec: "全圆实心红色不带灯2档3脚 铜脚 （2个）", series: "全圆", pins: "3", positions: "2", skuLink: "https://detail.tmall.com/item.htm?id=41210111230&skuId=4919743109698", light: "无灯", size: "20mm" },
  { spec: "KCD1 大号船型开关 30*25mm 3脚2档", series: "KCD1", pins: "3", positions: "2", skuLink: "https://example.com/sku1", light: "无灯", size: "30*25mm" },
  { spec: "KCD3 中号船型开关 25*20mm 3脚2档", series: "KCD3", pins: "3", positions: "2", skuLink: "https://example.com/sku2", light: "带灯", size: "25*20mm" },
  { spec: "圆形船型开关 直径15mm 2脚2档", series: "圆形", pins: "2", positions: "2", skuLink: "https://example.com/sku3", light: "带灯", size: "15mm" },
  { spec: "全圆船型开关 直径20mm 3脚2档", series: "全圆", pins: "3", positions: "2", skuLink: "https://example.com/sku4", light: "无灯", size: "20mm" },
  { spec: "KCD4 超大船型开关 35*30mm 4脚2档", series: "KCD4", pins: "4", positions: "2", skuLink: "https://example.com/sku5", light: "带灯", size: "35*30mm" },
  { spec: "KCD11 迷你船型开关 12*10mm 2脚2档", series: "KCD11", pins: "2", positions: "2", skuLink: "https://example.com/sku6", light: "无灯", size: "12*10mm" },
  { spec: "圆形船型开关 直径18mm 2脚2档", series: "圆形", pins: "2", positions: "2", skuLink: "https://example.com/sku7", light: "带灯", size: "18mm" },
  { spec: "大型船型开关 40*35mm 4脚2档", series: "大型", pins: "4", positions: "2", skuLink: "https://example.com/sku8", light: "带灯", size: "40*35mm" },
  { spec: "微型船型开关 8*6mm 2脚2档", series: "微型", pins: "2", positions: "2", skuLink: "https://example.com/sku9", light: "无灯", size: "8*6mm" }
];

// ===== 2) 全局状态 =====
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

// 本地文件自动加载
const LOCAL_SOURCES = ['./data/products.json', './data/products.csv', './products.json', './products.csv'];

// ===== 3) 工具函数 =====
function showStatus(msg, type = "info") {
  console.log(`[${type.toUpperCase()}] ${msg}`);
}

function hideStatus() { /* 无 UI 时无需处理 */ }

function normalizeRecord(r) {
  const t = v => (v == null ? "" : String(v).trim());
  let obj = {
    spec: t(r.spec),
    series: t(r.series),
    pins: t(r.pins),
    positions: t(r.positions),
    skuLink: t(r.skuLink),
    light: t(r.light),
    size: t(r.size)  // 提取尺寸数据
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
  const req = ["spec", "series", "pins", "positions", "skuLink", "light"];
  for (const k of req) if (!o[k]) return `缺少字段: ${k}`;
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
  arr.forEach((o, i) => { const err = validateRecord(o); if (err) bad.push({ i, err }); else ok.push(o); });
  if (bad.length) showStatus(`有 ${bad.length} 条记录不合规，已跳过。例如第 ${bad[0].i + 1} 行：${bad[0].err}`, "warn");
  if (!ok.length) return showStatus(`没有可导入的有效记录。`, "error");
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

// 新增：解析尺寸函数
function parseSize(sizeStr) {
  if (!sizeStr) return null;

  // 尝试匹配 "数字*数字" 格式（如 "20*15mm"）
  const matchDimensions = sizeStr.match(/(\d+(?:\.\d+)?)\s*[*x×]\s*(\d+(?:\.\d+)?)/i);
  if (matchDimensions) {
    return {
      length: parseFloat(matchDimensions[1]),
      width: parseFloat(matchDimensions[2]),
      isCircular: false
    };
  }

  // 尝试匹配纯数字格式（如 "20mm"）
  const matchSingle = sizeStr.match(/(\d+(?:\.\d+)?)\s*mm?/i);
  if (matchSingle) {
    return {
      length: parseFloat(matchSingle[1]),
      width: null,
      isCircular: true
    };
  }

  // 尝试匹配末尾带数字的格式（如 "尺寸：20mm"）
  const matchEnd = sizeStr.match(/(\d+(?:\.\d+)?)\s*mm?$/i);
  if (matchEnd) {
    return {
      length: parseFloat(matchEnd[1]),
      width: null,
      isCircular: true
    };
  }

  return null;
}

// 新增：计算尺寸差异
function calculateSizeDifference(targetSize, productSize) {
  if (!targetSize || !productSize) return Infinity;

  // 直接比较长度/直径值
  return Math.abs(targetSize - productSize.length);
}

// 复制链接函数
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    // 显示复制成功通知
    copyNotification.classList.add('show');
    setTimeout(() => {
      copyNotification.classList.remove('show');
    }, 2000);
  }).catch(err => {
    console.error('复制失败:', err);
    alert('复制链接失败，请手动复制');
  });
}

// 本地文件加载
async function loadFromLocalFiles() {
  hideStatus();
  for (const path of LOCAL_SOURCES) {
    try {
      const res = await fetch(path + (path.includes('?') ? '&' : '?') + 't=' + Date.now(), { cache: 'no-store' });
      if (!res.ok) continue;
      const ct = (res.headers.get('content-type') || '').toLowerCase();
      if (ct.includes('json') || path.toLowerCase().endsWith('.json')) {
        const json = await res.json(); ingest(json, 'replace');
      } else {
        const text = await res.text(); const rows = parseCsv(text); ingest(rows, 'replace');
      }
      showStatus(`已从本地文件加载：${path}`, 'success');
      return true;
    } catch (e) { /* try next */ }
  }
  showStatus('未找到本地数据文件，已使用内置示例。', 'warn');
  return false;
}

// ===== 4) 事件绑定（委托支持动态按钮） =====
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

  document.getElementById('search-input').addEventListener('input', function () {
    filters.search = this.value.toLowerCase(); applyFilters();
  });

  // 尺寸输入事件监听
  document.getElementById('size-input').addEventListener('input', function () {
    // 只允许输入数字和小数点
    this.value = this.value.replace(/[^\d.]/g, '');
    filters.size = this.value;
    applyFilters();
  });

  document.getElementById('reset-filters').addEventListener('click', () => {
    filters = { series: 'all', pins: 'all', positions: 'all', light: 'all', search: '', size: '' };
    buildAllFacets(products);
    document.getElementById('search-input').value = '';
    document.getElementById('size-input').value = '';
    document.getElementById('sort-by').value = 'default';
    applyFilters();
  });

  document.getElementById('sort-by').addEventListener('change', applyFilters);

  // 委托处理复制链接按钮点击事件
  document.getElementById('products-container').addEventListener('click', function (e) {
    if (e.target.closest('.copy-link')) {
      const card = e.target.closest('.product-card');
      const link = card.querySelector('.product-link').href;
      copyToClipboard(link);
    }
  });
}

// ===== 5) 过滤 / 渲染 =====
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

  // 尺寸筛选逻辑
  const targetSize = parseFloat(filters.size);
  let sizeDiffMap = new Map();
  let filteredList = [];
  let minDiff = Infinity; // 记录最小差值

  if (!isNaN(targetSize)) {
    // 计算每个产品尺寸与目标尺寸的差异
    list.forEach(p => {
      const parsedSize = parseSize(p.size || '');
      if (parsedSize) {
        const diff = calculateSizeDifference(targetSize, parsedSize);
        sizeDiffMap.set(p, diff);
        // 更新最小差值
        if (diff < minDiff) minDiff = diff;
      } else {
        sizeDiffMap.set(p, Infinity);
      }
    });

    // 根据匹配情况筛选产品
    if (minDiff === 0) {
      // 有完全匹配的产品：显示所有完全匹配的产品
      filteredList = list.filter(p => sizeDiffMap.get(p) === 0);
    } else if (minDiff <= 5) {
      // 没有完全匹配但有接近产品（差值≤5mm）：显示所有最小差值产品
      filteredList = list.filter(p => sizeDiffMap.get(p) === minDiff);
    } else {
      // 没有符合要求的产品（最小差值>5mm）：显示空列表
      filteredList = [];
    }
  } else {
    // 没有尺寸筛选时使用原列表
    filteredList = [...list];
  }

  // 应用排序规则
  const sortBy = document.getElementById('sort-by').value;
  if (sortBy === 'pins') {
    filteredList.sort((a, b) => (+a.pins) - (+b.pins));
  } else if (sortBy === 'pinsDesc') {
    filteredList.sort((a, b) => (+b.pins) - (+a.pins));
  } else if (sortBy === 'positions') {
    filteredList.sort((a, b) => (+a.positions) - (+b.positions));
  } else if (sortBy === 'positionsDesc') {
    filteredList.sort((a, b) => (+b.positions) - (+a.positions));
  } else if (sortBy === 'sizeAsc') {
    // 尺寸从小到大排序
    filteredList.sort((a, b) => {
      const sizeA = parseSize(a.size || '');
      const sizeB = parseSize(b.size || '');

      // 如果两个都有尺寸
      if (sizeA && sizeB) return sizeA.length - sizeB.length;

      // 如果只有A有尺寸，则A排在前面
      if (sizeA) return -1;

      // 如果只有B有尺寸，则B排在前面
      if (sizeB) return 1;

      // 两个都没有尺寸，保持原顺序
      return 0;
    });
  } else if (sortBy === 'sizeDesc') {
    // 尺寸从大到小排序
    filteredList.sort((a, b) => {
      const sizeA = parseSize(a.size || '');
      const sizeB = parseSize(b.size || '');

      if (sizeA && sizeB) return sizeB.length - sizeA.length;
      if (sizeA) return -1;
      if (sizeB) return 1;
      return 0;
    });
  }

  renderProducts(filteredList, sizeDiffMap, targetSize);
}

// 渲染产品时添加尺寸匹配提示
function renderProducts(list, sizeDiffMap, targetSize) {
  resultCount.textContent = list.length;
  productsContainer.innerHTML = '';

  // 当有尺寸输入但无匹配产品时显示特定提示
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

  // 通用无结果提示
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

    // 尺寸匹配提示
    let sizeMatchHtml = '';
    if (!isNaN(targetSize)) {
      const diff = sizeDiffMap.get(p);
      if (diff !== undefined && diff !== Infinity) {
        if (diff === 0) {
          sizeMatchHtml = `<span class="size-match exact">完全匹配 (${targetSize}mm)</span>`;
        } else if (diff <= 5) {
          sizeMatchHtml = `<span class="size-match close">接近匹配 (差${diff}mm)</span>`;
        }
      }
    }

    // 显示尺寸值（长度/直径）
    let sizeValue = '';
    if (parsedSize) {
      if (parsedSize.isCircular) {
        sizeValue = `直径: ${parsedSize.length}mm`;
      } else {
        sizeValue = `长: ${parsedSize.length}mm × 宽: ${parsedSize.width}mm`;
      }
    } else {
      sizeValue = '未提供';
    }

    card.innerHTML = `
          <div class="product-image" style="background: linear-gradient(45deg, ${bg}, #2c3e50)">
            <i class="fas fa-toggle-on"></i>
          </div>
          <div class="product-info">
            <div class="product-series">${p.series || '未分组'} 系列 ${sizeMatchHtml}</div>
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

// ===== 6) 初始化 =====
function init() {
  setupEventListeners();
  loadFromLocalFiles().then(ok => {
    if (!ok) setProducts(sampleProducts, 'replace');
  }).catch(err => {
    console.error(err); setProducts(sampleProducts, 'replace');
  });
}
window.addEventListener('DOMContentLoaded', init);