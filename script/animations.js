"use strict";
var animations;
(function (animations) {
    function ease(a, b, r) {
        const r2 = Math.max(0, Math.min(1, r));
        return a + (b - a) * (r2 * r2 * (3 - 2 * r2));
    }
    ;
    function drawsvg(svg) {
        const duration = 1000;
        const stagger = 200;
        const paths = Array.from(svg.getElementsByTagName("path")).map((element, i) => ({
            element,
            delay: i * stagger,
            length: element.getTotalLength()
        }));
        paths.forEach((path, i) => {
            path.element.style.strokeDasharray = [path.length, path.length].join(" ");
        });
        const startTime = performance.now();
        const totalDuration = stagger * paths.length + duration;
        update();
        function update() {
            const progress = performance.now() - startTime;
            paths.forEach((path, i) => {
                path.element.style.strokeDashoffset = "" + ease(path.length, 0, (progress - path.delay) / duration);
            });
            if (progress < totalDuration)
                requestAnimationFrame(update);
        }
    }
    function assure(a, b) {
        if (a instanceof b)
            return a;
        throw new TypeError(`${a} is not ${b.name}.`);
    }
    function shortHomeAnimation() {
        const animation = assure(document.getElementById("animation"), SVGSVGElement);
        const logo = assure(document.getElementById("logo"), HTMLElement);
        const content = assure(document.getElementById("content"), HTMLElement);
        animation.animate({ opacity: 1 }, { duration: 600, easing: 'ease-in-out' });
        setTimeout(() => animation.style.opacity = "1", 600);
        setTimeout(() => logo.animate({ opacity: 1 }, { duration: 400, easing: 'ease-in-out' }), 200);
        setTimeout(() => logo.style.opacity = "1", 600);
        setTimeout(() => content.animate({ opacity: 1 }, { duration: 400, easing: 'ease-in-out' }), 400);
        setTimeout(() => content.style.opacity = "1", 800);
    }
    animations.shortHomeAnimation = shortHomeAnimation;
    function longHomeAnimation() {
        function forbid_scroll() {
            // PC
            document.addEventListener("mousewheel", scroll_control, { passive: false });
            // スマホ
            document.addEventListener("touchmove", scroll_control, { passive: false });
        }
        // スクロール禁止解除
        function permit_scroll() {
            // PC
            document.removeEventListener("mousewheel", scroll_control);
            // スマホ
            document.removeEventListener('touchmove', scroll_control);
        }
        function scroll_control(event) {
            event.preventDefault();
        }
        const animation = assure(document.getElementById("animation"), SVGSVGElement);
        const logo = assure(document.getElementById("logo"), HTMLElement);
        const keyVisual = assure(document.getElementById("key-visual"), HTMLElement);
        const content = assure(document.getElementById("content"), HTMLElement);
        scrollTo(0, 0);
        forbid_scroll();
        keyVisual.style.marginTop = (window.innerHeight - keyVisual.getBoundingClientRect().height / 2) + "px";
        animation.style.opacity = "1";
        drawsvg(animation);
        setTimeout(() => logo.animate({ opacity: 1 }, { duration: 400, easing: 'ease-in-out' }), 2300);
        setTimeout(() => logo.style.opacity = "1", 2700);
        setTimeout(() => keyVisual.animate({ "margin-top": 0 }, { duration: 600, easing: 'ease-in-out' }), 2700);
        setTimeout(() => keyVisual.style.marginTop = "0", 3300);
        setTimeout(() => content.animate({ opacity: 1 }, { duration: 400, easing: 'ease-in-out' }), 3000);
        setTimeout(() => content.style.opacity = "1", 3400);
        setTimeout(permit_scroll, 2700);
    }
    animations.longHomeAnimation = longHomeAnimation;
    function pageAnimation() {
        const content = assure(document.getElementById("content"), HTMLElement);
        content.animate({ opacity: 1 }, { duration: 400, easing: 'ease-in-out' });
        setTimeout(() => content.style.opacity = "1", 400);
    }
    animations.pageAnimation = pageAnimation;
})(animations || (animations = {}));
