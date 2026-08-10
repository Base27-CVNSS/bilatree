(() => {
  'use strict';

  const STORAGE_KEY = 'bilatree-demo-state-v1';
  const THEME_KEY = 'bilatree-theme';
  const CHANNEL_NAME = 'bilatree-demo-sync-v1';
  const MAX_EVENTS = 7;
  const FORBIDDEN_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const tabId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

  let state = readState();
  let events = [];
  let toastTimer;
  let channel = null;

  function readState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return isPlainObject(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  function normalizePath(input) {
    const parts = input
      .trim()
      .replace(/^\/+|\/+$/g, '')
      .split('/')
      .map((part) => part.trim())
      .filter(Boolean);

    if (!parts.length) throw new Error('Hãy nhập ít nhất một nhánh dữ liệu.');
    if (parts.length > 10) throw new Error('Đường dẫn demo hỗ trợ tối đa 10 cấp.');
    if (parts.some((part) => part.length > 48)) throw new Error('Mỗi tên nhánh tối đa 48 ký tự.');
    if (parts.some((part) => FORBIDDEN_KEYS.has(part)))
      throw new Error('Tên nhánh này không được phép sử dụng.');
    return parts;
  }

  function parseValue(raw) {
    const trimmed = raw.trim();
    if (!trimmed) return '';
    try {
      return JSON.parse(trimmed);
    } catch {
      return raw;
    }
  }

  function setAtPath(target, parts, value) {
    let cursor = target;
    parts.forEach((part, index) => {
      if (index === parts.length - 1) {
        cursor[part] = value;
        return;
      }
      if (!isPlainObject(cursor[part])) cursor[part] = {};
      cursor = cursor[part];
    });
  }

  function persistState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch {
      showToast('Không thể lưu: bộ nhớ trình duyệt đã đầy.');
      return false;
    }
  }

  function publish(message) {
    channel?.postMessage({ ...message, sender: tabId, sentAt: Date.now() });
  }

  function setupChannel() {
    if (!('BroadcastChannel' in window)) {
      const chip = $('#tab-count');
      if (chip) chip.textContent = 'Trình duyệt chưa hỗ trợ đồng bộ tab';
      return;
    }

    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.addEventListener('message', (event) => {
      const message = event.data;
      if (!message || message.sender === tabId) return;

      if (message.type === 'state' && isPlainObject(message.state)) {
        state = message.state;
        persistState();
        renderTree();
        addEvent(message.path || '/', 'remote');
        showToast('Đã nhận thay đổi từ tab khác.');
      }

      if (message.type === 'clear') {
        state = {};
        persistState();
        renderTree();
        addEvent('Đã xóa cây', 'remote');
      }
    });
  }

  function countLeaves(value) {
    if (!isPlainObject(value)) return 1;
    const entries = Object.values(value);
    if (!entries.length) return 0;
    return entries.reduce((total, child) => total + countLeaves(child), 0);
  }

  function createSvg(iconId) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', iconId);
    svg.append(use);
    return svg;
  }

  function valueType(value) {
    if (value === null) return 'null';
    if (Array.isArray(value) || typeof value === 'object') return 'object';
    return typeof value;
  }

  function formatValue(value) {
    if (typeof value === 'string') return value;
    if (value === undefined) return 'undefined';
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  function createLeafRow(key, value) {
    const row = document.createElement('div');
    row.className = 'tree-row';
    row.setAttribute('role', 'treeitem');

    const icon = document.createElement('span');
    icon.className = 'leaf-icon';
    icon.textContent = '•';

    const keyElement = document.createElement('span');
    keyElement.className = 'leaf-key';
    keyElement.textContent = key;

    const separator = document.createElement('span');
    separator.className = 'leaf-separator';
    separator.textContent = ':';

    const valueElement = document.createElement('span');
    valueElement.className = `leaf-value ${valueType(value)}`;
    valueElement.textContent = formatValue(value);
    valueElement.title = formatValue(value);

    row.append(icon, keyElement, separator, valueElement);
    return row;
  }

  function createBranch(key, value, isRoot = false) {
    const branch = document.createElement('div');
    branch.className = `tree-branch${isRoot ? ' root-branch' : ''}`;
    branch.setAttribute('role', isRoot ? 'tree' : 'group');

    if (!isRoot) {
      const row = document.createElement('div');
      row.className = 'tree-row';
      row.setAttribute('role', 'treeitem');
      row.setAttribute('aria-expanded', 'true');

      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'branch-toggle';
      toggle.setAttribute('aria-label', `Thu gọn nhánh ${key}`);
      toggle.append(createSvg('#i-chevron'));
      toggle.addEventListener('click', () => {
        const collapsed = branch.classList.toggle('collapsed');
        row.setAttribute('aria-expanded', String(!collapsed));
        toggle.setAttribute('aria-label', `${collapsed ? 'Mở' : 'Thu gọn'} nhánh ${key}`);
      });

      const keyElement = document.createElement('span');
      keyElement.className = 'branch-key';
      keyElement.textContent = key;
      row.append(toggle, keyElement);
      branch.append(row);
    }

    const children = document.createElement('div');
    children.className = 'tree-children';
    Object.entries(value).forEach(([childKey, childValue]) => {
      if (isPlainObject(childValue)) {
        children.append(createBranch(childKey, childValue));
      } else {
        const leafBranch = document.createElement('div');
        leafBranch.className = 'tree-branch';
        leafBranch.append(createLeafRow(childKey, childValue));
        children.append(leafBranch);
      }
    });
    branch.append(children);
    return branch;
  }

  function renderTree() {
    const treeView = $('#tree-view');
    const empty = $('#empty-tree');
    const nodeCount = $('#node-count');
    if (!treeView || !empty || !nodeCount) return;

    treeView.replaceChildren();
    const hasData = Object.keys(state).length > 0;
    empty.hidden = hasData;
    treeView.hidden = !hasData;

    const count = hasData ? countLeaves(state) : 0;
    nodeCount.textContent = `${count} nút dữ liệu`;
    if (hasData) treeView.append(createBranch('/', state, true));
  }

  function addEvent(path, source = 'local') {
    events.unshift({ path, source, time: new Date() });
    events = events.slice(0, MAX_EVENTS);
    renderEvents();
  }

  function renderEvents() {
    const feed = $('#event-feed');
    if (!feed) return;
    feed.replaceChildren();

    if (!events.length) {
      const placeholder = document.createElement('span');
      placeholder.className = 'event-item';
      placeholder.textContent = 'Chưa có thay đổi trong phiên này';
      feed.append(placeholder);
      return;
    }

    events.forEach((event) => {
      const item = document.createElement('div');
      item.className = `event-item ${event.source === 'remote' ? 'remote' : ''}`;
      const dot = document.createElement('i');
      const label = document.createElement('strong');
      const time = document.createElement('span');
      label.textContent = `/${event.path.replace(/^\//, '')}`;
      time.textContent = event.time.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      item.append(dot, label, time);
      feed.append(item);
    });
  }

  function showToast(message = 'Đã sao chép') {
    const toast = $('#toast');
    if (!toast) return;
    $('span', toast).textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2300);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.append(area);
      area.select();
      document.execCommand('copy');
      area.remove();
    }
    showToast('Đã sao chép vào bộ nhớ tạm.');
  }

  function setupCopyButtons() {
    $$('.copy-button').forEach((button) => {
      button.addEventListener('click', () => {
        if (button.dataset.copy) {
          copyText(button.dataset.copy);
          return;
        }
        if (button.dataset.copyTarget === 'active-code') {
          const active = $('[data-code-panel]:not([hidden])');
          if (active) copyText(active.textContent);
        }
      });
    });
  }

  function setupTheme() {
    $$('.theme-toggle').forEach((button) => {
      button.addEventListener('click', () => {
        const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
        document.documentElement.dataset.theme = next;
        localStorage.setItem(THEME_KEY, next);
        showToast(`Đã bật giao diện ${next === 'dark' ? 'tối' : 'sáng'}.`);
      });
    });
  }

  function setupPlayground() {
    const form = $('#tree-form');
    const pathInput = $('#path-input');
    const valueInput = $('#value-input');

    form?.addEventListener('submit', (event) => {
      event.preventDefault();
      try {
        const parts = normalizePath(pathInput.value);
        const value = parseValue(valueInput.value);
        setAtPath(state, parts, value);
        const path = parts.join('/');
        if (!persistState()) return;
        renderTree();
        addEvent(path);
        publish({ type: 'state', state, path });
        showToast(`Đã cập nhật /${path}`);
      } catch (error) {
        showToast(error instanceof Error ? error.message : 'Dữ liệu chưa hợp lệ.');
      }
    });

    $$('.example-chips button').forEach((button) => {
      button.addEventListener('click', () => {
        valueInput.value = button.dataset.example ?? '';
        valueInput.focus();
      });
    });

    $('#clear-tree')?.addEventListener('click', () => {
      if (!Object.keys(state).length) {
        showToast('Cây demo đã trống.');
        return;
      }
      state = {};
      persistState();
      renderTree();
      addEvent('Đã xóa cây');
      publish({ type: 'clear' });
      showToast('Đã xóa dữ liệu demo trên thiết bị.');
    });
  }

  function setupCodeTabs() {
    $$('.code-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        $$('.code-tab').forEach((item) => {
          const active = item === tab;
          item.classList.toggle('active', active);
          item.setAttribute('aria-selected', String(active));
        });
        $$('[data-code-panel]').forEach((panel) => {
          panel.hidden = panel.dataset.codePanel !== tab.dataset.code;
        });
      });
    });
  }

  function setupMobileMenu() {
    const sidebar = $('#left-sidebar');
    const backdrop = $('#menu-backdrop');
    const openButton = $('#mobile-menu-button');

    const setOpen = (open) => {
      sidebar?.classList.toggle('open', open);
      backdrop?.classList.toggle('show', open);
      openButton?.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
    };

    openButton?.addEventListener('click', () => setOpen(true));
    $('#close-menu')?.addEventListener('click', () => setOpen(false));
    backdrop?.addEventListener('click', () => setOpen(false));
    $$('.main-nav a[href^="#"]').forEach((link) =>
      link.addEventListener('click', () => setOpen(false)),
    );
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') setOpen(false);
    });
  }

  function setupNavigation() {
    const sections = $$('.section-anchor');
    const links = $$('.nav-link[data-section]');
    const mobileLinks = $$('.mobile-bottom-nav a');
    if (!('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const id = visible.target.id;
        links.forEach((link) => link.classList.toggle('active', link.dataset.section === id));
        mobileLinks.forEach((link) =>
          link.classList.toggle('active', link.getAttribute('href') === `#${id}`),
        );
      },
      { rootMargin: '-18% 0px -62% 0px', threshold: [0.05, 0.2, 0.5] },
    );

    sections.forEach((section) => observer.observe(section));
  }

  function setupSearch() {
    const input = $('#site-search');
    if (!input) return;

    const runSearch = () => {
      const query = input.value.trim().toLocaleLowerCase('vi');
      if (!query) return;
      const candidates = $$('main h1, main h2, main h3, main p, main code');
      const match = candidates.find((element) =>
        element.textContent.toLocaleLowerCase('vi').includes(query),
      );
      if (!match) {
        showToast(`Không tìm thấy “${input.value.trim()}”.`);
        return;
      }
      const section = match.closest('section') || match;
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      section.classList.remove('search-highlight');
      requestAnimationFrame(() => section.classList.add('search-highlight'));
    };

    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') runSearch();
    });

    document.addEventListener('keydown', (event) => {
      const tag = document.activeElement?.tagName;
      const editing =
        tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable;
      if (event.key === '/' && !editing) {
        event.preventDefault();
        input.focus();
      }
    });
  }

  setupChannel();
  setupCopyButtons();
  setupTheme();
  setupPlayground();
  setupCodeTabs();
  setupMobileMenu();
  setupNavigation();
  setupSearch();
  renderTree();
  renderEvents();
})();
