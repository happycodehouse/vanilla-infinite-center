const $mask = document.getElementById("mask");
const $vicWrapper = document.querySelector(".vic-wrapper");
const $nextBtn = document.getElementById("nextBtn");
const $prevBtn = document.getElementById("prevBtn");
const $maskItem = document.querySelectorAll(".mask-item");
const $maskBtn = document.getElementById("maskBtn");

const DURATION = 0.5;
const rootStyle = getComputedStyle(document.documentElement);

let isTransitioning = false;
let lastDirection = "next";
let prevMaskItem = null;
let slideData = [];

function getLeftCount() {
    return window.innerWidth < 768 ? 1 : 2;
}

function getSlides() {
    return document.querySelectorAll(".vic-slide");
}

function getConfig() {
    const $slides = getSlides();
    const slideW = $slides[0].offsetWidth;
    const maskW = $mask.offsetWidth;
    const gap = (parseFloat(rootStyle.getPropertyValue('--gap')) / 100) * window.innerWidth;

    const centerNextX = (window.innerWidth - slideW) / 2 - slideW / 2;
    const centerPrevX = (window.innerWidth - slideW) / 2 + slideW / 2;
    const maskRight = (window.innerWidth + maskW) / 2;
    const maskLeft = (window.innerWidth - maskW) / 2;

    return {slideW, maskW, gap, centerNextX, centerPrevX, maskRight, maskLeft};
}

function initVic() {
    gsap.killTweensOf(".vic-slide");

    // 모든 슬라이드 제거 후 원본 순서로 재생성
    Array.from(getSlides()).forEach(s => s.remove());
    slideData.forEach(name => {
        const div = document.createElement("div");
        div.className = "vic-slide";
        div.dataset.slide = name;
        $vicWrapper.append(div);
    });

    const $slides = getSlides();
    const itemCount = $slides.length;
    const leftCount = getLeftCount();

    $maskItem.forEach(item => {
        item.classList.remove("active", "z2");
        gsap.set(item, {clipPath: "inset(0 0 0 100%)"});
    });
    prevMaskItem = null;

    $slides.forEach((i, idx) => {
        let pos;
        if (idx === 0) {
            pos = 0;
        } else if (idx <= itemCount - 1 - leftCount) {
            pos = idx;
        } else {
            pos = idx - itemCount;
        }
        i.dataset.pos = pos;
    });

    lastDirection = "next";
    staticPos();
    updateActiveMask();
}

function staticPos(direction = "next") {
    const $slides = getSlides();
    const {slideW, gap, centerNextX, centerPrevX, maskRight, maskLeft} = getConfig();
    const centerX = direction === "next" ? centerNextX : centerPrevX;

    $slides.forEach((i) => {
        const posIdx = Number(i.dataset.pos);

        if (posIdx === 0) {
            gsap.set(i, {left: centerX});
        } else if (posIdx > 0) {
            gsap.set(i, {left: maskRight + (posIdx - 1) * (slideW + gap) + gap});
        } else {
            gsap.set(i, {left: maskLeft + posIdx * (slideW + gap)});
        }
    });
}

function animatePos(direction = "next", onComplete) {
    const $slides = getSlides();
    const {slideW, gap} = getConfig();
    const tweens = [];
    const unitDist = slideW + gap;

    updateActiveMask(direction);

    $slides.forEach((i) => {
        const currentX = parseFloat(gsap.getProperty(i, "left"));
        const targetX = currentX + (direction === "next" ? -1 : 1) * unitDist;
        tweens.push(gsap.to(i, {left: targetX, duration: DURATION, ease: "power2.inOut"}));
    });

    if (tweens.length > 0 && onComplete) {
        tweens[tweens.length - 1].eventCallback("onComplete", () => {
            onComplete();
        });
    }
}

function move(direction) {
    if (isTransitioning) return;
    isTransitioning = true;

    const $slides = getSlides();
    const posArray = Array.from($slides).map(i => Number(i.dataset.pos));
    const minPos = Math.min(...posArray);
    const maxPos = Math.max(...posArray);

    const directionChanged = lastDirection !== null && lastDirection !== direction;

    if (directionChanged) {
        const {centerNextX, centerPrevX} = getConfig();
        const centerX = direction === "next" ? centerNextX : centerPrevX;
        const currentCenterItem = Array.from($slides).find(i => Number(i.dataset.pos) === 0);

        if (currentCenterItem) {
            gsap.killTweensOf(currentCenterItem);
            gsap.set(currentCenterItem, {left: centerX});
        }
    }

    const targetPos = direction === "next" ? minPos : maxPos;
    const newPos = direction === "next" ? maxPos + 1 : minPos - 1;
    const outgoing = Array.from($slides).find(i => Number(i.dataset.pos) === targetPos);

    if (outgoing) {
        const clone = outgoing.cloneNode(true);
        clone.classList.remove("active");
        clone.dataset.pos = newPos;
        $vicWrapper.append(clone);

        const {slideW, gap, maskRight, maskLeft} = getConfig();
        if (newPos > 0) {
            gsap.set(clone, {left: maskRight + (newPos - 1) * (slideW + gap) + gap});
        } else {
            gsap.set(clone, {left: maskLeft + newPos * (slideW + gap)});
        }
    }

    getSlides().forEach(i => {
        const currentPos = Number(i.dataset.pos);
        i.dataset.pos = direction === "next" ? currentPos - 1 : currentPos + 1;
    });

    animatePos(direction, () => {
        getSlides().forEach(i => {
            const pos = Number(i.dataset.pos);
            if ((direction === "next" && pos < minPos) || (direction === "prev" && pos > maxPos)) {
                i.remove();
            }
        });

        const {centerNextX, centerPrevX} = getConfig();
        const centerX = direction === "next" ? centerNextX : centerPrevX;
        const centerItem = Array.from(getSlides()).find(s => Number(s.dataset.pos) === 0);

        if (centerItem) {
            gsap.set(centerItem, {left: centerX});
        }

        isTransitioning = false;
    });

    lastDirection = direction;
}

// pagination
function updatePagination(activeSlide) {
    document.querySelectorAll('#pagination button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.slide === activeSlide);
    });
}

function jumpTo(targetSlide) {
    if (isTransitioning) return;

    const $slides = getSlides();
    const targetEl = Array.from($slides).find(s => s.dataset.slide === targetSlide);
    if (!targetEl) return;

    const steps = Number(targetEl.dataset.pos);
    if (steps === 0) return;

    const direction = steps > 0 ? "next" : "prev";
    const count = Math.abs(steps);

    $nextBtn.disabled = true;
    $prevBtn.disabled = true;

    document.querySelectorAll('#pagination button').forEach(btn => {
        btn.style.opacity = btn.dataset.slide === targetSlide ? "1" : "0.5";
        btn.style.pointerEvents = btn.dataset.slide === targetSlide ? "auto" : "none";
    });

    let i = 0;
    function step() {
        if (i >= count) {
            $nextBtn.disabled = false;
            $prevBtn.disabled = false;

            document.querySelectorAll('#pagination button').forEach(btn => {
                btn.style.opacity = "1";
                btn.style.pointerEvents = "auto";
            });
            return;
        }
        i++;
        move(direction);
        setTimeout(step, DURATION * 1000 + 50);
    }
    step();
}

// mask
function updateActiveMask(direction = "next") {
    const $slides = getSlides();
    const firstSlideValue = $maskItem[0].dataset.mask;
    const lastSlideValue = $maskItem[$maskItem.length - 1].dataset.mask;

    if (direction === "next") {
        const leavingSlide = Array.from($slides).find(s => Number(s.dataset.pos) === -1);
        const centerSlide = Array.from($slides).find(s => Number(s.dataset.pos) === 0);
        if (!centerSlide) return;

        const activeNum = centerSlide.dataset.slide;
        const activeItem = document.querySelector(`.mask-item[data-mask="${activeNum}"]`);
        if (!activeItem) return;

        updatePagination(activeNum);

        if (prevMaskItem) prevMaskItem.classList.remove("z2");
        prevMaskItem = activeItem;

        if (leavingSlide && leavingSlide.dataset.slide === lastSlideValue) {
            $maskItem.forEach((item) => {
                if (item.dataset.mask === lastSlideValue) return;
                item.classList.remove("z2", "active");
                gsap.set(item, {clipPath: "inset(0 0 0 100%)"});
            });

            const firstMaskItem = document.querySelector(`.mask-item[data-mask="${firstSlideValue}"]`);
            const lastMaskItem = document.querySelector(`.mask-item[data-mask="${lastSlideValue}"]`);
            if (firstMaskItem) firstMaskItem.classList.add("z2");
            if (lastMaskItem) lastMaskItem.classList.remove("active");

        } else {
            if (activeItem.classList.contains("active")) {
                document.querySelectorAll('.mask-item.active').forEach(item => {
                    item.classList.remove("active");
                    gsap.set(item, {clipPath: "inset(0 0 0 100%)"});
                });
            }
        }

        activeItem.classList.add("active");
        gsap.fromTo(activeItem,
            {clipPath: "inset(0 0 0 100%)"},
            {clipPath: "inset(0 0 0 0%)", duration: DURATION, ease: "power2.inOut"}
        );

    } else {
        const leavingSlide = Array.from($slides).find(s => Number(s.dataset.pos) === 1);
        const centerSlide = Array.from($slides).find(s => Number(s.dataset.pos) === 0);
        if (!leavingSlide || !centerSlide) return;

        const centerNum = centerSlide.dataset.slide;
        const leavingNum = leavingSlide.dataset.slide;
        const leavingItem = document.querySelector(`.mask-item[data-mask="${leavingNum}"]`);
        const centerItem = document.querySelector(`.mask-item[data-mask="${centerNum}"]`);
        if (!leavingItem || !centerItem) return;

        updatePagination(centerNum);

        if (!centerItem.classList.contains("active")) {
            centerItem.classList.add("active");
            gsap.fromTo(centerItem,
                {clipPath: "inset(0 100% 0 0)"},
                {clipPath: "inset(0 0% 0 0)", duration: DURATION, ease: "power2.inOut"}
            );
        }

        if (leavingSlide.dataset.slide === firstSlideValue) {
            if (prevMaskItem) prevMaskItem.classList.remove("z2");
            prevMaskItem = leavingItem;
            prevMaskItem.classList.add("z2");
        }

        if (leavingItem.classList.contains("active")) {
            gsap.fromTo(leavingItem,
                {clipPath: "inset(0 0 0 0%)"},
                {
                    clipPath: "inset(0 0 0 100%)",
                    duration: DURATION,
                    ease: "power2.inOut",
                    onComplete: () => leavingItem.classList.remove("active")
                }
            );
        }
    }
}

window.addEventListener("load", () => {
    // 원본 슬라이드 정보 저장
    slideData = Array.from(getSlides()).map(s => s.dataset.slide);

    initVic();

    const firstSlide = Array.from(getSlides()).find(s => Number(s.dataset.pos) === 0);
    const firstMaskItem = document.querySelector(`.mask-item[data-mask="${firstSlide.dataset.slide}"]`);
    if (firstMaskItem) {
        firstMaskItem.classList.add("active");
    }

    if ($maskBtn.textContent === "MASK ON") {
        $mask.classList.add("active");
    }
});

let resizeTimer;
window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        isTransitioning = false;
        initVic();
    }, 200);
});

$maskBtn.addEventListener("click", () => {
    $mask.classList.toggle("active");
    $maskBtn.textContent = $mask.classList.contains("active") ? "MASK ON" : "MASK OFF";
});

$nextBtn.addEventListener("click", () => move("next"));
$prevBtn.addEventListener("click", () => move("prev"));

document.querySelectorAll('#pagination button').forEach(btn => {
    btn.addEventListener('click', () => {
        jumpTo(btn.dataset.slide);
    });
});