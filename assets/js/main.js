/* ============================================================
   Portfolio — interactions & motion
   Lenis (smooth scroll) + GSAP/ScrollTrigger (scroll animations).
   Everything degrades gracefully: without the CDN libraries or with
   "reduce motion" turned on, the site works with no animation.
   ============================================================ */
(function () {
    'use strict';

    var $  = function (s, c) { return (c || document).querySelector(s); };
    var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

    var html    = document.documentElement;
    var reduce  = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var hasGsap = !!(window.gsap && window.ScrollTrigger);
    var animate = hasGsap && !reduce;
    html.classList.add(animate ? 'anim' : 'no-anim');
    if (hasGsap) gsap.registerPlugin(ScrollTrigger);

    /* ---------- Smooth scroll (Lenis) ---------- */
    var lenis = null;
    if (animate && window.Lenis) {
        lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 1 });
        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
        gsap.ticker.lagSmoothing(0);
    }

    function scrollToEl(el) {
        if (!el) return;
        if (lenis) lenis.scrollTo(el, { duration: 1.4 });
        else el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    }

    $$('[data-scroll-to]').forEach(function (a) {
        a.addEventListener('click', function (e) {
            var target = $(a.getAttribute('href'));
            if (!target) return;
            e.preventDefault();
            scrollToEl(target);
        });
    });

    /* ---------- Page transition curtain ---------- */
    var curtain = $('.curtain');

    function curtainOut() {
        if (!curtain) return;
        curtain.classList.add('is-anim');
        requestAnimationFrame(function () { curtain.classList.add('is-out'); });
    }

    function isInternalPageLink(a, e) {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;
        if (a.target && a.target !== '_self') return false;
        if (a.hasAttribute('download') || a.origin !== location.origin) return false;
        if (!/^https?:$/.test(a.protocol)) return false;
        // same page + hash = in-page jump, not a page change
        if (a.pathname === location.pathname && a.search === location.search && a.hash) return false;
        return true;
    }

    if (animate && curtain) {
        document.addEventListener('click', function (e) {
            var a = e.target.closest('a[href]');
            if (!a || !isInternalPageLink(a, e)) return;
            e.preventDefault();
            if (a.href === location.href) return;
            curtain.classList.remove('is-anim', 'is-out', 'is-in');
            curtain.style.transform = 'translateY(100%)';
            void curtain.offsetHeight;                     // apply start position before animating
            curtain.style.transform = '';
            curtain.classList.add('is-anim', 'is-in');
            setTimeout(function () { location.href = a.href; }, 700);
        });
        // back/forward cache: page is restored with the curtain still down
        window.addEventListener('pageshow', function (e) {
            if (e.persisted) { curtain.classList.remove('is-in'); curtain.classList.add('is-anim', 'is-out'); }
        });
    }

    /* ---------- Dock nav: sliding lime pill ---------- */
    var dock = $('.dock');
    if (dock) {
        var pill = $('.dock__pill', dock);
        var activeLink = $('.dock__link.active', dock);
        var placePill = function (link) {
            if (!link) { pill.style.width = '0'; return; }
            pill.style.left = link.offsetLeft + 'px';
            pill.style.width = link.offsetWidth + 'px';
        };
        placePill(activeLink);
        requestAnimationFrame(function () { dock.classList.add('dock--ready'); });
        $$('.dock__link', dock).forEach(function (l) {
            l.addEventListener('mouseenter', function () { placePill(l); });
        });
        dock.addEventListener('mouseleave', function () { placePill(activeLink); });
        window.addEventListener('resize', function () { placePill(activeLink); });
        if (document.fonts) document.fonts.ready.then(function () { placePill(activeLink); });
    }

    /* ---------- Quick info panel ---------- */
    var qi = $('#quickInfo');
    var qiTab = $('[data-qi-open]');
    function setQi(open) {
        if (!qi) return;
        qi.classList.toggle('open', open);
        qi.setAttribute('aria-hidden', open ? 'false' : 'true');
        if (qiTab) qiTab.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (lenis) open ? lenis.stop() : lenis.start();
        if (open) { var c = $('.qi__close', qi); if (c) c.focus(); }
    }
    if (qiTab) qiTab.addEventListener('click', function () { setQi(true); });
    $$('[data-qi-close]').forEach(function (b) { b.addEventListener('click', function () { setQi(false); }); });

    /* Live local clock */
    var clock = $('[data-clock]');
    if (clock) {
        var fmt;
        try {
            fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: clock.dataset.tz, timeZoneName: 'short' });
        } catch (err) {
            fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' });
        }
        var tick = function () { clock.textContent = fmt.format(new Date()); };
        tick();
        setInterval(tick, 15000);
    }

    /* ---------- Toast ---------- */
    var toastEl = $('.toast'), toastTimer;
    function toast(msg) {
        if (!toastEl) return;
        toastEl.textContent = msg;
        toastEl.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2200);
    }

    /* ---------- Copy email ---------- */
    function copyText(text) {
        if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
        return new Promise(function (resolve, reject) {
            var ta = document.createElement('textarea');
            ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
            document.body.appendChild(ta); ta.select();
            var ok = false;
            try { ok = document.execCommand('copy'); } catch (err) {}
            document.body.removeChild(ta);
            ok ? resolve() : reject();
        });
    }
    $$('[data-copy]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            copyText(btn.dataset.copy).then(function () {
                btn.classList.add('copied');
                toast('Email copied to clipboard');
                setTimeout(function () { btn.classList.remove('copied'); }, 2000);
            }, function () { toast('Couldn’t copy — please select the address'); });
        });
    });

    /* ---------- Reel popup ---------- */
    var reelBtn = $('[data-reel-video]');
    var reelModal = $('#reelModal');
    if (reelBtn && reelModal) {
        var video = $('video', reelModal);
        var closeReel = function () {
            reelModal.classList.remove('open');
            reelModal.setAttribute('aria-hidden', 'true');
            video.pause();
            video.removeAttribute('src'); video.load();
            if (lenis) lenis.start();
        };
        reelBtn.addEventListener('click', function () {
            video.src = reelBtn.dataset.reelVideo;
            reelModal.classList.add('open');
            reelModal.setAttribute('aria-hidden', 'false');
            if (lenis) lenis.stop();
            var p = video.play(); if (p && p.catch) p.catch(function () {});
        });
        $$('[data-reel-close]', reelModal).forEach(function (b) { b.addEventListener('click', closeReel); });
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && reelModal.classList.contains('open')) closeReel(); });
    }

    /* ---------- Image viewer (graphic design galleries) ----------
       Tiles link to the full-size design; the viewer shows it with prev / next,
       arrow keys and Esc. Tall boards (book covers, brand sheets) scroll inside it. */
    var lb = $('#lightbox');
    var lbItems = $$('[data-lightbox-item]');
    if (lb && lbItems.length) {
        var lbImg = $('.lightbox__img', lb), lbStage = $('.lightbox__stage', lb), lbCount = $('[data-lb-count]', lb);
        var lbClose = $('.lightbox__btn--close', lb);
        var lbIndex = 0, lbReturn = null;
        var two = function (n) { return (n < 10 ? '0' : '') + n; };
        var fitImage = function () {
            lbImg.classList.toggle('is-tall', lbImg.naturalHeight / lbImg.naturalWidth > 1.4);
            lb.classList.remove('loading');
        };
        var showLb = function (i) {
            lbIndex = (i + lbItems.length) % lbItems.length;
            var link = lbItems[lbIndex], thumb = $('img', link);
            lb.classList.add('loading');
            lbImg.onload = fitImage;
            lbImg.src = link.getAttribute('href');
            lbImg.alt = thumb ? thumb.alt : '';
            if (lbImg.complete && lbImg.naturalWidth) fitImage();      // already cached
            lbStage.scrollTop = 0;
            lbCount.textContent = two(lbIndex + 1) + ' / ' + two(lbItems.length);
            new Image().src = lbItems[(lbIndex + 1) % lbItems.length].getAttribute('href');   // preload the next one
        };
        var openLb = function (i) {
            lbReturn = document.activeElement;
            showLb(i);
            lb.classList.add('open');
            lb.setAttribute('aria-hidden', 'false');
            html.classList.add('lb-open');
            if (lenis) lenis.stop();
            if (lbClose) lbClose.focus();
        };
        var closeLb = function () {
            lb.classList.remove('open');
            lb.setAttribute('aria-hidden', 'true');
            html.classList.remove('lb-open');
            if (lenis) lenis.start();
            if (lbReturn) lbReturn.focus();
        };
        lbItems.forEach(function (a, i) {
            a.addEventListener('click', function (e) {
                if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;   // let "open in new tab" work
                e.preventDefault();
                openLb(i);
            });
        });
        $('[data-lb-prev]', lb).addEventListener('click', function () { showLb(lbIndex - 1); });
        $('[data-lb-next]', lb).addEventListener('click', function () { showLb(lbIndex + 1); });
        $('[data-lb-close]', lb).addEventListener('click', closeLb);
        lbStage.addEventListener('click', function (e) { if (e.target === lbStage) closeLb(); });   // click outside the image
        document.addEventListener('keydown', function (e) {
            if (!lb.classList.contains('open')) return;
            if (e.key === 'Escape') closeLb();
            else if (e.key === 'ArrowRight') showLb(lbIndex + 1);
            else if (e.key === 'ArrowLeft') showLb(lbIndex - 1);
        });
    }

    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && qi && qi.classList.contains('open')) setQi(false); });

    /* ---------- "View" cursor on project cards ---------- */
    if (window.matchMedia('(hover: hover)').matches && $('[data-cursor]')) {
        var cursor = document.createElement('div');
        cursor.className = 'cursor';
        document.body.appendChild(cursor);
        var moveX = hasGsap ? gsap.quickTo(cursor, 'left', { duration: 0.45, ease: 'power3' }) : function (v) { cursor.style.left = v + 'px'; };
        var moveY = hasGsap ? gsap.quickTo(cursor, 'top',  { duration: 0.45, ease: 'power3' }) : function (v) { cursor.style.top = v + 'px'; };
        window.addEventListener('mousemove', function (e) { moveX(e.clientX); moveY(e.clientY); });
        $$('[data-cursor]').forEach(function (el) {
            el.addEventListener('mouseenter', function () { cursor.textContent = el.dataset.cursor; cursor.classList.add('show'); });
            el.addEventListener('mouseleave', function () { cursor.classList.remove('show'); });
        });
    }

    if (!animate) return;

    /* ============================================================
       MOTION (GSAP)
       ============================================================ */

    /* Split a text block into word spans, keeping <em> accents and <br> */
    function splitWords(el) {
        var walk = function (node) {
            Array.prototype.slice.call(node.childNodes).forEach(function (child) {
                if (child.nodeType === 3) {
                    var frag = document.createDocumentFragment();
                    child.textContent.split(/(\s+)/).forEach(function (part) {
                        if (!part) return;
                        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
                        var s = document.createElement('span');
                        s.className = 'w'; s.textContent = part;
                        frag.appendChild(s);
                    });
                    node.replaceChild(frag, child);
                } else if (child.nodeType === 1 && child.tagName !== 'BR') {
                    walk(child);
                }
            });
        };
        walk(el);
        return $$('.w', el);
    }

    /* Elements centred with CSS translate(-50%): hand the centring to GSAP so
       scale/rotate tweens keep it responsive (percent, not frozen pixels). */
    if ($('.hero__portrait')) gsap.set('.hero__portrait', { xPercent: -50, x: 0 });
    if ($('.contact__avatar')) gsap.set('.contact__avatar', { xPercent: -50, yPercent: -50, x: 0, y: 0 });

    /* Intro: curtain lifts, headings rise from their masks */
    function intro() {
        curtainOut();
        var tl = gsap.timeline({ delay: 0.3 });
        tl.fromTo('.line > span', { yPercent: 110, y: 0 }, { yPercent: 0, duration: 1.2, stagger: 0.09, ease: 'expo.out' }, 0);
        if ($('.hero__portrait')) tl.from('.hero__portrait', { yPercent: 18, opacity: 0, duration: 1.5, ease: 'expo.out' }, 0.1);
        tl.from('.hero__sub, .ahero__since, .topbar > *, .hero__down, .hero__social', { y: 16, opacity: 0, duration: 1, stagger: 0.05, ease: 'power3.out' }, 0.4);
    }
    var started = false;
    var start = function () { if (!started) { started = true; intro(); } };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(start);
    setTimeout(start, 900);   // don't wait forever for fonts

    /* Fade-up on scroll */
    ScrollTrigger.batch('[data-reveal]', {
        start: 'top 88%',
        once: true,
        onEnter: function (els) { gsap.to(els, { opacity: 1, y: 0, duration: 1.1, stagger: 0.1, ease: 'expo.out' }); }
    });

    /* Word-by-word highlight as you scroll */
    $$('[data-words]').forEach(function (el) {
        var words = splitWords(el);
        gsap.fromTo(words, { opacity: 0.14 }, {
            opacity: 1, stagger: 0.1, ease: 'none',
            scrollTrigger: { trigger: el, start: 'top 85%', end: 'bottom 50%', scrub: true }
        });
    });

    /* Image parallax inside rounded frames */
    $$('[data-parallax]').forEach(function (img) {
        gsap.fromTo(img, { yPercent: 0 }, {
            yPercent: -15, ease: 'none',
            scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true }
        });
    });

    var mm = gsap.matchMedia();

    /* HOME — hero recedes while the green panel slides over it */
    if ($('.hero') && $('.panel')) {
        gsap.to('.hero__title, .hero__sub', {
            yPercent: -30, opacity: 0.3, ease: 'none',
            scrollTrigger: { trigger: '.panel', start: 'top bottom', end: 'top top', scrub: true }
        });
        gsap.to('.hero__portrait', {
            scale: 0.9, transformOrigin: '50% 100%', ease: 'none',
            scrollTrigger: { trigger: '.panel', start: 'top bottom', end: 'top top', scrub: true }
        });
    }

    /* HOME — reel pill grows as it scrolls into view */
    mm.add('(min-width: 901px)', function () {
        if (!$('.reel')) return;
        gsap.fromTo('.reel', { width: '56%' }, {
            width: '94%', ease: 'none',
            scrollTrigger: { trigger: '.reel-wrap', start: 'top 95%', end: 'center 40%', scrub: true }
        });
    });

    /* HOME — "Recent works": pin the section and slide the cards sideways */
    mm.add('(min-width: 901px)', function () {
        var section = $('[data-recent]');
        if (!section) return;
        var track = $('.recent__track', section);
        var dist = function () { return Math.max(0, track.scrollWidth - window.innerWidth); };
        gsap.to(track, {
            x: function () { return -dist(); }, ease: 'none',
            scrollTrigger: {
                trigger: section, start: 'top top',
                end: function () { return '+=' + dist(); },
                pin: true, scrub: 0.8, invalidateOnRefresh: true
            }
        });
        gsap.to('.recent__title', {
            color: '#A3A9A5', ease: 'none',
            scrollTrigger: { trigger: section, start: 'top top', end: function () { return '+=' + window.innerWidth * 0.45; }, scrub: true }
        });
    });

    /* WORKS — big title fades back as the cards scroll over it */
    if ($('.works__title')) {
        gsap.to('.works__title', {
            color: '#A3A9A5', ease: 'none',
            scrollTrigger: { trigger: '.works__list', start: 'top 85%', end: 'top 35%', scrub: true }
        });
    }

    /* ABOUT — card fan opens up from a stack */
    if ($('[data-fan]')) {
        gsap.fromTo('[data-fan]', { '--p': 0.08 }, {
            '--p': 1, ease: 'none',
            scrollTrigger: { trigger: '[data-fan]', start: 'top 95%', end: 'top 35%', scrub: true }
        });
    }

    /* FOOTER — avatar pops in */
    if ($('.contact__avatar')) {
        gsap.from('.contact__avatar', {
            scale: 0, rotate: -40, duration: 1.1, ease: 'back.out(1.6)',
            scrollTrigger: { trigger: '.contact', start: 'top 55%' }
        });
    }

    /* Recalculate once images have their final size */
    window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
