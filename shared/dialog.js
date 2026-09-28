/*
 * Gestão de foco para diálogos (.overlay, .sheet, .slideover, #avMenu) do protótipo Biblup.
 * Item estrutural 4 da revisão de 2026-09-27 (00-status.md): mover, prender, devolver o foco;
 * `inert` no resto da página enquanto um diálogo está aberto.
 *
 * Substitui as versões duplicadas de openOverlay/closeOverlay/openSlide/closeSlide/toggleMenu/closeMenu
 * que existiam copiadas em cada arquivo HTML. Nunca editar essas funções em uma página individual:
 * mudar aqui.
 */
(function () {
  'use strict';

  var stack = []; // {el, trigger}

  function isVisible(el) {
    return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
  }

  function getFocusable(container) {
    var sel = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), ' +
      'select:not([disabled]), [tabindex]:not([tabindex="-1"])';
    return [].slice.call(container.querySelectorAll(sel)).filter(isVisible);
  }

  var inertedEls = [];

  // Deixa inert tudo que NÃO estiver no caminho (ancestral) nem dentro de nenhum diálogo aberto,
  // percorrendo a árvore inteira a partir de <body> — funciona tanto para diálogos que são filhos
  // diretos de <body> quanto para diálogos aninhados dentro de #main (ex.: word card da Lição).
  function updateInert() {
    inertedEls.forEach(function (el) { el.removeAttribute('inert'); });
    inertedEls = [];
    var opens = stack.map(function (s) { return s.el; });
    if (!opens.length) return;
    function walk(node) {
      [].forEach.call(node.children, function (child) {
        if (child.tagName === 'SCRIPT' || child.tagName === 'STYLE') return;
        if (child.id === 'toastHost' || child.classList.contains('toast-host')) return;
        var onPathOrInside = opens.some(function (o) { return child.contains(o) || o.contains(child); });
        if (onPathOrInside) { walk(child); }
        else { child.setAttribute('inert', ''); inertedEls.push(child); }
      });
    }
    walk(document.body);
  }

  function trapTab(e) {
    var top = stack[stack.length - 1];
    if (!top) return;
    var focusables = getFocusable(top.el);
    if (!focusables.length) { e.preventDefault(); return; }
    var first = focusables[0], last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function openDialog(el, opts) {
    if (!el || el.classList.contains('open')) return;
    opts = opts || {};
    var trigger = document.activeElement;
    el.classList.add('open');
    if (opts.lockScroll) document.body.style.overflow = 'hidden';
    stack.push({ el: el, trigger: trigger, lockScroll: !!opts.lockScroll });
    updateInert();
    var focusables = getFocusable(el);
    if (focusables.length) { focusables[0].focus(); }
    else { if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1'); el.focus(); }
  }

  function closeDialog(el) {
    if (!el) return;
    var idx = -1;
    for (var i = stack.length - 1; i >= 0; i--) { if (stack[i].el === el) { idx = i; break; } }
    if (idx === -1) { el.classList.remove('open'); return; }
    var entry = stack.splice(idx, 1)[0];
    el.classList.remove('open');
    if (entry.lockScroll && !stack.some(function (s) { return s.lockScroll; })) {
      document.body.style.overflow = '';
    }
    updateInert();
    if (entry.trigger && document.contains(entry.trigger) && typeof entry.trigger.focus === 'function') {
      entry.trigger.focus();
    }
  }

  function closeTop() {
    var top = stack[stack.length - 1];
    if (!top) return false;
    closeDialog(top.el);
    return true;
  }

  function openOverlay(id) { openDialog(document.getElementById(id)); }
  function closeOverlay(id) { closeDialog(document.getElementById(id)); }
  function openSlide(id) { openDialog(document.getElementById(id), { lockScroll: true }); }
  function closeSlide(id) { closeDialog(document.getElementById(id)); }

  function toggleMenu() {
    var m = document.getElementById('avMenu'), s = document.getElementById('scrim');
    if (!m) return;
    if (m.classList.contains('open')) { closeMenu(); return; }
    openDialog(m);
    if (s) s.classList.add('open');
  }
  function closeMenu() {
    var m = document.getElementById('avMenu'), s = document.getElementById('scrim');
    if (m && m.classList.contains('open')) closeDialog(m);
    if (s) s.classList.remove('open');
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Tab' && stack.length) trapTab(e);
    else if (e.key === 'Escape') {
      var handled = closeTop();
      // Ganchos por página para fechar overlays não gerenciados por este script
      // (menu de linha de tabela, seletor de capítulo, etc.): definir
      // `window.dialogOnEscapeExtra = function(){...}` antes de este script rodar o handler,
      // ou depois, como propriedade — checada a cada Escape.
      if (typeof window.dialogOnEscapeExtra === 'function') window.dialogOnEscapeExtra(handled);
    }
  });

  window.openOverlay = openOverlay;
  window.closeOverlay = closeOverlay;
  window.openSlide = openSlide;
  window.closeSlide = closeSlide;
  window.toggleMenu = toggleMenu;
  window.closeMenu = closeMenu;
})();
