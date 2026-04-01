const $mask = document.getElementById("mask");
const $vicWrapper = document.querySelector(".vic-wrapper");
const $nextBtn = document.getElementById("nextBtn");
const $prevBtn = document.getElementById("prevBtn");
const $maskBtn = document.getElementById("maskBtn");

const rootStyle = getComputedStyle(document.documentElement);

let isTransitioning = false;
let lastDirection = null;

const DURATION = 0.5;

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

    $slides.forEach((i, idx) => {
        let pos;
        const itemCount = $slides.length;

        if (idx === 0) {
            pos = 0;
        } else if (idx <= Math.floor(itemCount - 1) / 2) {
            pos = idx;
        } else {
            pos = idx - itemCount;
        }

        i.dataset.pos = pos;
    });

    staticPos();
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

    $slides.forEach((i) => {
        const currentX = parseFloat(gsap.getProperty(i, "left"));
        const targetX = currentX + (direction === "next" ? -1 : 1) * unitDist;

        tweens.push(gsap.to(i, { left: targetX, duration: DURATION, ease: "power2.inOut" }));
    });

    if (tweens.length > 0 && onComplete) {
        tweens[tweens.length - 1].eventCallback("onComplete", onComplete);
    }
}

function move(direction) {
    if (isTransitioning) return;
    isTransitioning = true;

    // 1. 초기 세팅
    const $slides = getSlides();
    const posArray = Array.from($slides).map(i => Number(i.dataset.pos));
    const minPos = Math.min(...posArray);
    const maxPos = Math.max(...posArray);

    const directionChanged = lastDirection !== null && lastDirection !== direction;

    // 2. 방향 바뀔 때 pos 0을 반대편 출발 위치로 순간이동
    if (directionChanged) {
        const { centerNextX, centerPrevX, maskW } = getConfig();
        const centerX = direction === "next" ? centerNextX : centerPrevX;
        const currentCenterItem = Array.from($slides).find(i => Number(i.dataset.pos) === 0);

        if (currentCenterItem) {
            gsap.killTweensOf(currentCenterItem);
            gsap.set(currentCenterItem, { left: centerX });
        }
    }

    // 3. 클론 생성 및 append + 출발 위치 세팅
    const targetPos = direction === "next" ? minPos : maxPos;
    const newPos = direction === "next" ? maxPos + 1 : minPos - 1;

    const outgoing = Array.from($slides).find(i => Number(i.dataset.pos) === targetPos);

    if (outgoing) {
        const clone = outgoing.cloneNode(true);
        clone.classList.remove("active");
        clone.dataset.pos = newPos;
        $vicWrapper.append(clone);

        // 클론 출발 위치 세팅
        const { slideW, gap, maskRight, maskLeft } = getConfig();
        const posIdx = newPos;
        if (posIdx > 0) {
            gsap.set(clone, { left: maskRight + (posIdx - 1) * (slideW + gap) + gap });
        } else {
            gsap.set(clone, { left: maskLeft + posIdx * (slideW + gap) });
        }
    }

    // 5. pos 변경
    getSlides().forEach(i => {
        const currentPos = Number(i.dataset.pos);
        i.dataset.pos = direction === "next" ? currentPos - 1 : currentPos + 1;
    });

    // 6. 애니메이션
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

    // 7. lastDirection 업데이트
    lastDirection = direction;
}

window.addEventListener("load", () => {
    initVic();

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