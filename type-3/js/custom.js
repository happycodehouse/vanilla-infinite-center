const $mask = document.getElementById("mask");
const $vicWrapper = document.querySelector(".vic-wrapper");
const $nextBtn = document.getElementById("nextBtn");
const $prevBtn = document.getElementById("prevBtn");
const $maskItem = document.querySelectorAll(".mask-item");
const $maskBtn = document.getElementById("maskBtn");
const $pagination = document.getElementById("pagination");

const leftCount = 2;
const DURATION = 0.5;
const rootStyle = getComputedStyle(document.documentElement);

let isTransitioning = false;
let lastDirection = null;
let prevMaskItem = null;

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

    return { slideW, maskW, gap, centerNextX, centerPrevX, maskRight, maskLeft };
}

function initVic() {
    const $slides = getSlides();
    const itemCount = $slides.length;

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

    staticPos();
    updateActiveMask();
    lastDirection = "next";
}

function staticPos(direction = "next") {
    const $slides = getSlides();
    const { slideW, gap, centerNextX, centerPrevX, maskRight, maskLeft } = getConfig();
    const centerX = direction === "next" ? centerNextX : centerPrevX;

    $slides.forEach((i) => {
        const posIdx = Number(i.dataset.pos);

        if (posIdx === 0) {
            gsap.set(i, { left: centerX });
        } else if (posIdx > 0) {
            gsap.set(i, { left: maskRight + (posIdx - 1) * (slideW + gap) + gap });
        } else {
            gsap.set(i, { left: maskLeft + posIdx * (slideW + gap) });
        }
    });
}

function animatePos(direction = "next", onComplete) {
    const $slides = getSlides();
    const { slideW, gap } = getConfig();
    const tweens = [];
    const unitDist = slideW + gap;

    updateActiveMask(direction);

    $slides.forEach((i) => {
        const currentX = parseFloat(gsap.getProperty(i, "left"));
        const targetX = currentX + (direction === "next" ? -1 : 1) * unitDist;
        tweens.push(gsap.to(i, { left: targetX, duration: DURATION, ease: "power2.inOut" }));
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
        const { centerNextX, centerPrevX } = getConfig();
        const centerX = direction === "next" ? centerNextX : centerPrevX;
        const currentCenterItem = Array.from($slides).find(i => Number(i.dataset.pos) === 0);

        if (currentCenterItem) {
            gsap.killTweensOf(currentCenterItem);
            gsap.set(currentCenterItem, { left: centerX });
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

        const { slideW, gap, maskRight, maskLeft } = getConfig();
        if (newPos > 0) {
            gsap.set(clone, { left: maskRight + (newPos - 1) * (slideW + gap) + gap });
        } else {
            gsap.set(clone, { left: maskLeft + newPos * (slideW + gap) });
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

        const { centerNextX, centerPrevX } = getConfig();
        const centerX = direction === "next" ? centerNextX : centerPrevX;
        const centerItem = Array.from(getSlides()).find(s => Number(s.dataset.pos) === 0);

        if (centerItem) {
            gsap.set(centerItem, { left: centerX });
        }

        isTransitioning = false;
    });

    lastDirection = direction;
}

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

        if (prevMaskItem) prevMaskItem.classList.remove("z2");
        prevMaskItem = activeItem;

        if (leavingSlide && leavingSlide.dataset.slide === lastSlideValue) {
            // 마지막 슬라이드가 나갈 때 → 전체 리셋 후 첫 번째부터 다시 쌓기
            $maskItem.forEach((item) => {
                if (item.dataset.mask === lastSlideValue) return;
                item.classList.remove("z2", "active");
                gsap.set(item, { clipPath: "inset(0 0 0 100%)" });
            });

            const firstMaskItem = document.querySelector(`.mask-item[data-mask="${firstSlideValue}"]`);
            const lastMaskItem = document.querySelector(`.mask-item[data-mask="${lastSlideValue}"]`);
            if (firstMaskItem) firstMaskItem.classList.add("z2");
            if (lastMaskItem) lastMaskItem.classList.remove("active");

        } else {
            // activeItem이 active 여부와 관계없이
            // prevMaskItem(이전 center였던 것) 이후에 active 상태인 마스크를 정리
            const prevIdx = Array.from($maskItem).indexOf(prevMaskItem);
            const activeIdx = Array.from($maskItem).indexOf(activeItem);

            // prevMaskItem보다 인덱스가 크고, activeItem보다 작은 것 중 active 잔류 정리
            $maskItem.forEach((item, idx) => {
                if (idx > prevIdx && idx < activeIdx && item.classList.contains("active")) {
                    item.classList.remove("active");
                    gsap.set(item, { clipPath: "inset(0 0 0 100%)" });
                }
            });

            // activeItem 이후에 active 잔류가 있으면 정리 (jumpTo 후 역방향 이동 등)
            $maskItem.forEach((item, idx) => {
                if (idx > activeIdx && item.classList.contains("active")) {
                    item.classList.remove("active");
                    gsap.set(item, { clipPath: "inset(0 0 0 100%)" });
                }
            });
        }

        activeItem.classList.add("active");
        gsap.fromTo(activeItem,
            { clipPath: "inset(0 0 0 100%)" },
            { clipPath: "inset(0 0 0 0%)", duration: DURATION, ease: "power2.inOut" }
        );

        updatePagination(activeNum);

    } else {
        // prev 방향
        const leavingSlide = Array.from($slides).find(s => Number(s.dataset.pos) === 1);
        const centerSlide = Array.from($slides).find(s => Number(s.dataset.pos) === 0);
        if (!leavingSlide || !centerSlide) return;

        const centerNum = centerSlide.dataset.slide;
        const leavingNum = leavingSlide.dataset.slide;
        const leavingItem = document.querySelector(`.mask-item[data-mask="${leavingNum}"]`);
        const centerItem = document.querySelector(`.mask-item[data-mask="${centerNum}"]`);
        if (!leavingItem || !centerItem) return;

        // ✅ centerItem이 active가 아닐 때도 강제로 세팅 (jumpTo 후 prev 등)
        if (!centerItem.classList.contains("active")) {
            centerItem.classList.add("active");
            gsap.fromTo(centerItem,
                { clipPath: "inset(0 100% 0 0)" },
                { clipPath: "inset(0 0% 0 0)", duration: DURATION, ease: "power2.inOut" }
            );
        }

        // ✅ leavingItem 이후에 active 잔류 정리 (jumpTo 후 prev 시 발생할 수 있는 잔류)
        const leavingIdx = Array.from($maskItem).indexOf(leavingItem);
        $maskItem.forEach((item, idx) => {
            if (idx > leavingIdx && item.classList.contains("active")) {
                item.classList.remove("active");
                gsap.set(item, { clipPath: "inset(0 0 0 100%)" });
            }
        });

        if (leavingSlide.dataset.slide === firstSlideValue) {
            if (prevMaskItem) prevMaskItem.classList.remove("z2");
            prevMaskItem = leavingItem;
            prevMaskItem.classList.add("z2");
        }

        if (centerNum === lastSlideValue) {
            $maskItem.forEach((item) => {
                item.classList.add("active");
                gsap.set(item, { clipPath: "inset(0 0 0 0%)" });
            });
        }

        if (leavingItem.classList.contains("active")) {
            gsap.fromTo(leavingItem,
                { clipPath: "inset(0 0 0 0%)" },
                {
                    clipPath: "inset(0 0 0 100%)",
                    duration: DURATION,
                    ease: "power2.inOut",
                    onComplete: () => leavingItem.classList.remove("active")
                }
            );
        }

        updatePagination(centerNum);
    }
}

function updatePagination(activeSlide) {
    document.querySelectorAll('#pagination button').forEach(btn => {
        btn.classList.toggle("active", btn.dataset.slide === activeSlide);
    });
}

function jumpTo(targetSlide) {
    if (isTransitioning) return;
    isTransitioning = true;

    const $slides = Array.from(getSlides());
    const total = $slides.length;
    const targetIndex = $slides.findIndex(s => s.dataset.slide === targetSlide);

    $slides.forEach((slide, i) => {
        const idx = (i - targetIndex + total) % total;
        let pos;
        if (idx === 0) {
            pos = 0;
        } else if (idx <= total - 1 - leftCount) {
            pos = idx;
        } else {
            pos = idx - total;
        }
        slide.dataset.pos = pos;
    });

    // ✅ next 기준으로 배치
    staticPos("next");

    // ✅ lastDirection을 "next"로 고정해서 이후 move와 호환
    lastDirection = "next";

    const maskValues = Array.from($maskItem).map(m => m.dataset.mask);
    const maskTargetIndex = maskValues.indexOf(targetSlide);

    // 마스크 상태 초기화 및 재설정
    $maskItem.forEach((item, idx) => {
        item.classList.remove("active", "z2");
        gsap.set(item, { clipPath: "inset(0 0 0 100%)" });
        if (idx < maskTargetIndex) {
            item.classList.add("active");
            gsap.set(item, { clipPath: "inset(0 0 0 0%)" });
        }
    });

    const targetItem = $maskItem[maskTargetIndex];
    if (targetItem) {
        targetItem.classList.add("active");
        gsap.fromTo(targetItem,
            { clipPath: "inset(0 0 0 100%)" },
            {
                clipPath: "inset(0 0 0 0%)",
                duration: DURATION,
                ease: "power2.inOut",
                onComplete: () => { isTransitioning = false; }
            }
        );
    } else {
        isTransitioning = false;
    }

    // ✅ prevMaskItem을 target 바로 이전 항목으로 설정
    // updateActiveMask("next")에서 z2 정리가 제대로 동작하도록
    prevMaskItem = maskTargetIndex > 0 ? $maskItem[maskTargetIndex] : null;

    updatePagination(targetSlide);
}

window.addEventListener("load", () => {
    initVic();

    const firstSlide = Array.from(getSlides()).find(s => Number(s.dataset.pos) === 0);
    const firstMaskItem = document.querySelector(`.mask-item[data-mask="${firstSlide.dataset.slide}"]`);
    if (firstMaskItem) {
        firstMaskItem.classList.add("active");
    }

    lastDirection = "next";

    if ($maskBtn.textContent === "MASK ON") {
        $mask.classList.add("active");
    }
});

window.addEventListener("resize", staticPos);

$maskBtn.addEventListener("click", () => {
    $mask.classList.toggle("active");
    $maskBtn.textContent = $mask.classList.contains("active") ? "MASK ON" : "MASK OFF";
});

$nextBtn.addEventListener("click", () => move("next"));
$prevBtn.addEventListener("click", () => move("prev"));

$pagination.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    if (btn.classList.contains("active")) return;
    jumpTo(btn.dataset.slide);
});