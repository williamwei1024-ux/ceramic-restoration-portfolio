/* ═══════════════════════════════════════════
   陶瓷修复作品集 · 翻书画册逻辑
   基于 StPageFlip（page-flip）实现真实翻书
   ═══════════════════════════════════════════
   ── 自定义区：标题 / 作者 / 作品目录数据 ──
*/
const CONFIG = {
  title: '陶瓷修复作品集',
  titleEn: 'Ceramic Restoration',
  author: '魏立源',
  authorEn: 'LIYUAN WEI',
  totalPages: 24,             // PDF 内页数
  works: [
    { name: '隋 · 青釉高足盘',                start: 1,  pages: 4, desc: '展览修复 · 高14cm　口径16cm　足径9cm' },
    { name: '清 · 矾红彩三果纹盘',            start: 5,  pages: 2, desc: '展览修复 · 口径24cm　高2cm' },
    { name: '宋 · 吉州窑剪纸贴花双凤纹黑釉盏', start: 7,  pages: 2, desc: '展览修复 · 口径12cm　高4cm' },
    { name: '宋 · 白覆轮黑釉盏',              start: 9,  pages: 2, desc: '展览修复 · 口径12cm　高4.5cm' },
    { name: '唐 · 巩县窑白釉盏',              start: 11, pages: 2, desc: '展览修复 · 石膏修复 · 口径10cm　高4cm' },
    { name: '宋 · 当阳峪窑三彩鹦鹉纹枕',        start: 13, pages: 2, desc: '展览修复 · 修复全流程 · 长35cm　宽13cm　高9cm' },
    { name: '汉 · 铅釉陶连枝树形灯',          start: 15, pages: 4, desc: '展览修复 · 高65cm' },
    { name: '汉 · 铅釉陶庖厨俑',              start: 19, pages: 2, desc: '展览修复 · 高31.5cm' },
    { name: '汉 · 铅釉陶楼一组',              start: 21, pages: 4, desc: '高37cm、40cm、30cm（从左到右）' },
  ],
};

/* 作品级主题色 = 修复方式栏的色块颜色（严格按栏色，含白黑），实色不透明度100% */
/* 「直至新颜色出现前保持当前颜色」：同一作品内所有页用同一栏色 */
const WORK_THEME = [
  'rgb(206,196,185)',   // 1 隋 青釉高足盘
  'rgb(170,111,93)',    // 2 清 矾红彩三果纹盘
  'rgb(247,240,218)',   // 3 宋 吉州窑双凤纹黑釉盏
  'rgb(79,72,69)',      // 4 宋 白覆轮黑釉盏
  'rgb(200,200,200)',   // 5 唐 巩县窑白釉盏（修复栏中灰）
  'rgb(96,137,109)',    // 6 宋 当阳峪窑三彩鹦鹉纹枕
  'rgb(168,168,144)',   // 7 汉 铅釉陶连枝树形灯（暖米灰）
  'rgb(229,218,206)',   // 8 汉 铅釉陶庖厨俑
  'rgb(144,144,144)',   // 9 汉 铅釉陶楼一组
  'rgb(240,240,240)',   // 10 收尾
];

/* 页 → 作品索引（0-based） */
const PAGE_WORK = [0,0,0,0, 1,1, 2,2, 3,3, 4,4, 5,5, 6,6,6,6, 7,7, 8,8,8, 8];

(function () {
  'use strict';

  const TOTAL = CONFIG.totalPages;
  // 页数组索引语义（StPageFlip showCover 实测）：
  //   0   = 封面（闭合状态，占整本书宽，书居中）
  //   1,3,5…23 = 对开 [pN, pN+1]（N = 索引值）
  //   25  = 封底
  //   偶数 = 翻页中间态，不停留
  const pad = (n) => String(n).padStart(2, '0');

  // 书的固定设计尺寸（autoSize 会按容器宽度等比缩放）
  const BOOK_W = 960, BOOK_H = 680;

  const bookEl = document.getElementById('pageflip');
  const pageNumEl = document.getElementById('pageNum');
  const toc = document.getElementById('toc');
  const tocList = document.getElementById('tocList');
  const lightbox = document.getElementById('lightbox');
  const lbImg = document.getElementById('lbImg');

  let pageFlip = null;
  let currentPage = 0;
  let isFlipping = false;

  /* ═══════ 构建书页元素 ═══════ */
  function buildCoverPage() {
    const el = document.createElement('div');
    el.className = 'flip-page page-cover-front';
    el.innerHTML = `
      <div class="cover-top">
        <span class="cover-kicker mono">Ceramic Restoration</span>
        <span class="cover-kicker-en mono">Portfolio</span>
      </div>
      <div class="cover-main">
        <div class="giant-char">修</div>
        <div class="giant-mask" aria-hidden="true">修</div>
      </div>
      <div class="cover-bottom">
        <p class="cover-sub">一器一物 · 匠心重光</p>
        <p class="cover-author-en">LIYUAN WEI</p>
      </div>`;
    return el;
  }

  function buildBackPage() {
    const el = document.createElement('div');
    el.className = 'flip-page page-cover-back';
    el.innerHTML = `
      <div class="cover-top">
        <span class="cover-kicker mono">Ceramic Restoration</span>
        <span class="cover-kicker-en mono">Portfolio</span>
      </div>
      <div class="cover-main">
        <div class="giant-char">復</div>
        <div class="giant-mask" aria-hidden="true">復</div>
      </div>
      <div class="cover-bottom">
        <p class="cover-sub">完器归位 · 匠心重光</p>
        <p class="cover-author-en">LIYUAN WEI</p>
      </div>`;
    return el;
  }

  function buildInnerPage(i) {
    const el = document.createElement('div');
    el.className = 'flip-page';
    const img = document.createElement('img');
    img.src = `pages/p${pad(i + 1)}.jpg`;
    img.alt = CONFIG.title + ' 第' + (i + 1) + '页';
    img.draggable = false;
    el.appendChild(img);
    return el;
  }

  /* 扉页：引言页（正文左对齐排版） */
  function buildTitlePage() {
    const el = document.createElement('div');
    el.className = 'flip-page page-extra page-title';
    el.innerHTML = `
      <div class="extra-inner title-inner">
        <p class="extra-kicker mono">Ceramic Restoration · Portfolio</p>
        <p class="intro-text intro-quote">「每一件破损的器物，都是一段等待续写的历史。」</p>
        <div class="extra-rule"></div>
      </div>`;
    return el;
  }

  /* 目录页：作品清单 + 页码（网格排版） */
  function buildTocPage() {
    const el = document.createElement('div');
    el.className = 'flip-page page-extra page-tocpage';
    el.innerHTML = `
      <div class="extra-inner tocpage-inner">
        <div class="tocpage-head">
          <h2 class="extra-title tocpage-title">目录</h2>
          <span class="tocpage-en mono">Contents</span>
        </div>
        <div class="tocpage-list">
          ${CONFIG.works.map((w, i) => {
            const pageLabel = w.pages > 1 ? `${w.start}–${w.start + w.pages - 1}` : `${w.start}`;
            return `<div class="tocpage-row">
              <span class="tocpage-idx">${pad(i + 1)}</span>
              <span class="tocpage-name">${w.name}</span>
              <span class="tocpage-dots" aria-hidden="true"></span>
              <span class="tocpage-page">${pageLabel}</span>
            </div>`;
          }).join('')}
        </div>
      </div>`;
    return el;
  }

  /* 个人介绍页（两页） */
  function buildIntroPage(second) {
    const el = document.createElement('div');
    el.className = 'flip-page page-extra page-intro';
    el.innerHTML = second ? `
      <div class="extra-inner intro-inner">
        <p class="extra-kicker mono">Restoration Journey</p>
        <h2 class="extra-title intro-title">修复经历</h2>
        <div class="extra-rule"></div>
        <p class="intro-text intro-body">修复陶瓷数十余件，涵盖粘接、补配、作色、仿釉等工艺。作品曾参展于宜兴市博物馆《妙手匠心——文物修复技术传承展》、南京艺术学院《汲古润今——2024届文物保护与修复专业毕业展览》及浙江大学艺术与考古博物馆修复陈列室常设展。</p>
        <p class="intro-text intro-body">坚持「最小干预、可逆修复」原则，结合材料科学与传统工艺，让破损文物恢复历史原貌。</p>
      </div>` : `
      <div class="extra-inner intro-inner">
        <p class="extra-kicker mono">About the Restorer</p>
        <h2 class="extra-title intro-title">个人介绍</h2>
        <div class="extra-rule"></div>
        <p class="intro-text intro-body">魏立源，陶瓷文物修复师。从事文物病害分析、修复材料研究与修复实践，致力于以科学方法守护文化遗产。</p>
      </div>`;
    return el;
  }

  function buildPages() {
    const pages = [buildCoverPage()];
    pages.push(buildTitlePage());       // 1 扉页
    pages.push(buildTocPage());         // 2 目录页
    for (let i = 0; i < TOTAL; i++) pages.push(buildInnerPage(i));  // 3-26 内页
    pages.push(buildBackPage());        // 27 封底
    return pages;
  }

  /* ═══════ 目录 ═══════ */
  const openToc = () => toc.classList.add('open');
  const closeToc = () => toc.classList.remove('open');

  // 作品起始页 → 合法的对开索引
  // 封面翻开后：idx1=[p1,p2], idx3=[p3,p4]…idx23=[p23,p24]
  // 作品起始页 N → 内页对开索引（内页 idx: 3,5,7…25 → [pN,pN+1]）
  const toIndex = (n) => {
    if (n <= 0) return 0;          // 封面
    if (n >= 24) return 26;        // 收尾 → 内页末尾（单页 p24）
    // 单页模式：idx = 3 + (n-1)；对开模式：idx = 3 + floor((n-1)/2)*2
    return isDouble() ? 3 + Math.floor((n - 1) / 2) * 2 : 3 + (n - 1);
  };

  const startOf = (w) => w.start;
  const endOf = (w) => w.start + w.pages - 1;
  const workAt = (n) => CONFIG.works.find((w) => n >= startOf(w) && n <= endOf(w)) || null;

  function buildToc() {
    // 封面条目
    const mkBtn = (name, idx, pageLabel) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'toc-item toc-cover';
      btn.innerHTML = `<span class="toc-name">${name}</span><span class="toc-page">${pageLabel}</span>`;
      btn.dataset.tocKey = name;
      btn.addEventListener('click', () => { if (pageFlip) pageFlip.turnToPage(idx); closeToc(); });
      tocList.appendChild(btn);
      return btn;
    };
    mkBtn('封面 · 修', 0, 'Cover');

    CONFIG.works.forEach((w, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'toc-item';
      const pageLabel = w.pages > 1 ? `${w.start}–${w.start + w.pages - 1}` : `${w.start}`;
      btn.innerHTML = `<span class="toc-index">${pad(i + 1)}</span>
        <span class="toc-name">${w.name}</span>
        <span class="toc-page">${pageLabel}</span>`;
      btn.dataset.tocKey = w.name;
      btn.addEventListener('click', () => {
        if (pageFlip) pageFlip.turnToPage(toIndex(w.start));
        closeToc();
      });
      tocList.appendChild(btn);
    });

    // 封底条目
    mkBtn('封底 · 復', 27, 'Back');
  }

  /* ═══════ 页码 / 信息显示 ═══════ */
  // 双页（对开）模式：桌面宽屏；单页模式：移动端窄屏
  const isDouble = () => window.matchMedia('(min-width: 641px)').matches;

  // 内页映射：单页模式 idx 3..26 → p1..p24；对开模式 idx 3,5..25 → [pN,pN+1]
  function spreadOf(idx) {
    if (idx === 0) return { kind: 'cover' };
    if (idx === 27) return { kind: 'back' };
    if (idx === 1) return { kind: 'title' };      // 扉页
    if (idx === 2) return { kind: 'tocpage' };    // 目录页
    if (idx >= 3 && idx <= 26) {
      if (isDouble()) {
        if (idx % 2 === 1) {
          const p1 = idx - 2;                      // 对开 idx3→p1, idx5→p3…
          return { kind: 'pages', pages: [p1, p1 + 1] };
        }
        return { kind: 'mid' };
      }
      // 单页模式：idx3→p1, idx4→p2…
      return { kind: 'pages', pages: [idx - 2, idx - 2] };
    }
    return { kind: 'mid' };
  }

  function updateStatus() {
    if (!pageFlip) return;
    const idx = pageFlip.getCurrentPageIndex();
    currentPage = idx;
    const sp = spreadOf(idx);

    // 对开展开（非封面/封底闭合）时显示内部细边线
    bookEl.classList.toggle('spread-open', isDouble() && idx > 0 && idx < 27 && !isFlipping);

    // 闭合（封面/封底）时平移书容器，使封面或封底单一页居中
    // 翻页动画中不修改 transform（避免跳动），静止时才应用
    if (!isFlipping) {
      const w = bookEl.offsetWidth;
      if (idx === 0 && isDouble()) {
        // 封面在右半 → 容器左移 1/4 宽，封面居中
        bookEl.style.transform = `translateX(-${w / 4}px)`;
      } else if (idx === 27 && isDouble()) {
        // 封底在左半 → 容器右移 1/4 宽，封底居中
        bookEl.style.transform = `translateX(${w / 4}px)`;
      } else {
        bookEl.style.transform = '';
      }
    }

    if (sp.kind === 'cover') {
      pageNumEl.textContent = 'Cover · 封面';
    } else if (sp.kind === 'back') {
      pageNumEl.textContent = 'Back · 封底';
    } else if (sp.kind === 'title') {
      pageNumEl.textContent = isDouble() ? '扉页 · 目录' : '扉页 · Title';
    } else if (sp.kind === 'tocpage') {
      pageNumEl.textContent = isDouble() ? '目录 · 扉页' : '目录 · Contents';
    } else if (sp.kind === 'pages') {
      // 单页模式显示单页码，对开模式显示区间
      const p1 = pad(sp.pages[0]);
      pageNumEl.textContent = isDouble() ? `${p1}–${pad(sp.pages[1])} / ${pad(TOTAL)}` : `${p1} / ${pad(TOTAL)}`;
    } else {
      pageNumEl.textContent = '…';
    }

    // 网页底色 = 当前作品主题色（实色，不透明度100%），并按明暗适配文字颜色
    let bg = 'rgb(234,242,249)';
    if (sp.kind === 'pages') {
      const workIdx = PAGE_WORK[sp.pages[0] - 1];
      bg = WORK_THEME[workIdx] || bg;
    } else if (sp.kind === 'cover') {
      bg = 'rgb(35,50,74)';    // 深冷蓝（呼应封面）
    } else if (sp.kind === 'back') {
      bg = 'rgb(42,61,82)';
    } else if (sp.kind === 'title' || sp.kind === 'tocpage') {
      bg = 'rgb(234,242,249)';  // 附加页用浅蓝底
    }

    const m = bg.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    const bgRgb = m ? `${m[1]},${m[2]},${m[3]}` : '234,242,249';
    document.body.style.background = bg;
    // 目录侧栏背景比底色稍浅；导航栏比底色加深一点
    if (toc) {
      const lighten = (v) => Math.round(+v + (255 - +v) * 0.12);
      const tocRgb = m ? `${lighten(m[1])},${lighten(m[2])},${lighten(m[3])}` : bgRgb;
      toc.style.background = `rgb(${tocRgb})`;
    }
    const toolbar = document.querySelector('.toolbar');
    if (toolbar) {
      const darken = (v) => Math.round(+v * 0.88);
      const tbRgb = m ? `${darken(m[1])},${darken(m[2])},${darken(m[3])}` : bgRgb;
      toolbar.style.background = `rgba(${tbRgb}, 0.9)`;
    }

    // 根据背景亮度切换页面文字深浅（保证可读性）
    if (m) {
      const lum = 0.299 * +m[1] + 0.587 * +m[2] + 0.114 * +m[3];
      document.body.classList.toggle('dark-bg', lum < 140);
      toc.classList.toggle('dark-bg', lum < 140);
      if (toolbar) toolbar.classList.toggle('dark-bg', lum < 140);
    } else {
      document.body.classList.remove('dark-bg');
    }

    // 目录高亮：按当前页匹配封面/作品/封底
    document.querySelectorAll('.toc-item').forEach((btn) => {
      let active = false;
      const key = btn.dataset.tocKey;
      if (sp.kind === 'cover' && key === '封面 · 修') active = true;
      else if (sp.kind === 'back' && key === '封底 · 復') active = true;
      else if (sp.kind === 'pages') {
        const w = CONFIG.works.find((x) => x.name === key);
        if (w) active = sp.pages[0] >= startOf(w) && sp.pages[0] <= endOf(w);
      }
      btn.classList.toggle('active', active);
    });

    // 按钮状态
    document.getElementById('btnPrev').disabled = idx <= 0;
    document.getElementById('btnNext').disabled = idx >= 27;
  }

  /* ═══════ Lightbox ═══════ */
  function currentInnerPage() {
    const idx = pageFlip ? pageFlip.getCurrentPageIndex() : 0;
    const sp = spreadOf(idx);
    return sp.kind === 'pages' ? sp.pages[0] : 1;
  }
  function openLightbox() {
    const n = currentInnerPage();
    lbImg.src = `pages/p${pad(n)}.jpg`;
    lbImg.alt = CONFIG.title + ' 第' + n + '页';
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeLightbox() {
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
  }
  document.getElementById('lbClose').addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });
  // 「另一个我」：新标签页打开摄影作品集
  document.getElementById('otherBtn').addEventListener('click', () => {
    window.open('https://wlyphoto.netlify.app/', '_blank', 'noopener');
  });
  // 「首尾」按钮：封面/封底间切换（封面→封底，封底→封面，其他→封面）
  document.getElementById('endBtn').addEventListener('click', () => {
    if (!pageFlip) return;
    const idx = pageFlip.getCurrentPageIndex();
    const target = idx === 0 ? 27 : 0;   // 封面↔封底切换，其他→封面
    pageFlip.turnToPage(target);
    // turnToPage 到末尾可能不触发 changeState read，手动复位并应用位置
    setTimeout(() => {
      isFlipping = false;
      updateStatus();
    }, 700);
  });

  /* ═══════ 自适应：库 autoSize 已处理，resize 时刷新 ═══════ */
  function fitBook() {
    if (pageFlip) pageFlip.update();
  }

  /* ═══════ 初始化 ═══════ */
  function init() {
    document.title = 'LIYUAN WEI | Restoration';
    buildToc();
    const pages = buildPages();
    pages.forEach((el) => el.setAttribute('data-page', ''));

    pageFlip = new St.PageFlip(bookEl, {
      width: BOOK_W / 2,          // 单页设计宽
      height: BOOK_H,
      maxWidth: BOOK_W / 2,       // 单页最大宽（自适应上限）
      maxHeight: BOOK_H,
      size: 'stretch',            // 随容器宽度缩放
      autoSize: true,             // 容器宽度自适应
      showCover: true,            // 有封面：初始闭合，翻开平摊
      usePortrait: true,          // 窄屏自动单页模式（移动端），宽屏对开
      minWidth: 340,              // 单页最小宽：容器 < 2×340 时转单页
      flippingTime: 650,
      startPage: 0,               // 初始 = 封面闭合
      disableFlipByClick: true,   // 点击由我们控制（封面翻开 / 放大）
      drawShadow: true,
      showPageCorners: false,
    });

    pageFlip.loadFromHTML(pages);
    pageFlip.on('flip', () => {
      // 翻页动画中：不应用封面 transform（避免跳动），更新页码等
      isFlipping = true;
      updateStatus();
      // 超时兜底：翻页结束强制复位（某些跳转不触发 changeState read）
      clearTimeout(window.__flipTimeout);
      window.__flipTimeout = setTimeout(() => {
        isFlipping = false;
        updateStatus();
      }, 900);
    });
    pageFlip.on('changeState', (ev) => {
      // 翻页完成：恢复封面 transform
      if (ev && ev.data === 'read') {
        isFlipping = false;
        updateStatus();
      }
    });
    pageFlip.on('init', () => {
      fitBook();
      isFlipping = false;
      updateStatus();
      // 延迟再应用一次，确保封面 transform 正确（避免 init 期间 flip 事件干扰）
      setTimeout(() => { isFlipping = false; updateStatus(); }, 50);
    });
    window.__pageFlip = pageFlip; // 调试/扩展用

    // 点击：封面闭合时翻开；内页单击放大（翻页用拖拽/滑动/按钮/键盘）
    bookEl.addEventListener('click', (e) => {
      if (!pageFlip) return;
      const idx = pageFlip.getCurrentPageIndex();
      if (idx === 0) {
        goNext();
        return;
      }
      if (idx > 0 && idx < 25 && e.target.closest('.stf__item')) {
        const sp = spreadOf(idx);
        if (sp.kind === 'pages') openLightbox();
      }
    });

    // 翻页：单页模式（移动端）用 turnToPage（flipPrev/flipNext 在 portrait 失灵），对开模式用 flip
    const goNext = () => {
      if (!pageFlip) return;
      if (isDouble()) pageFlip.flipNext();
      else pageFlip.turnToPage(pageFlip.getCurrentPageIndex() + 1);
    };
    const goPrev = () => {
      if (!pageFlip) return;
      if (isDouble()) pageFlip.flipPrev();
      else pageFlip.turnToPage(pageFlip.getCurrentPageIndex() - 1);
    };

    // 按钮
    document.getElementById('btnNext').addEventListener('click', goNext);
    document.getElementById('btnPrev').addEventListener('click', goPrev);
    document.getElementById('tocToggle').addEventListener('click', () => toc.classList.add('open'));
    document.getElementById('tocClose').addEventListener('click', closeToc);
    document.addEventListener('click', (e) => {
      const toggle = document.getElementById('tocToggle');
      if (toc.classList.contains('open') && !toc.contains(e.target) && !toggle.contains(e.target)) closeToc();
    });

    // 键盘
    document.addEventListener('keydown', (e) => {
      if (lightbox.classList.contains('open')) {
        if (e.key === 'Escape') closeLightbox();
        // Lightbox 打开时方向键仍可翻页：先关闭放大层再翻
        if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); closeLightbox(); goNext(); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); closeLightbox(); goPrev(); }
        return;
      }
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') { e.preventDefault(); goNext(); }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); goPrev(); }
      if (e.key === 'Escape') closeToc();
    });

    // 窗口缩放
    let rt = null;
    window.addEventListener('resize', () => {
      clearTimeout(rt);
      rt = setTimeout(fitBook, 120);
    });

    fitBook();
  }

  init();
})();
