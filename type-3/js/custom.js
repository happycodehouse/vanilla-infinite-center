const $mask = document.getElementById("mask");
const $vicWrapper = document.querySelector(".vic-wrapper");
const $nextBtn = document.getElementById("nextBtn");
const $prevBtn = document.getElementById("prevBtn");
const $maskBtn = document.getElementById("maskBtn");

const rootStyle = getComputedStyle(document.documentElement);

let isTransitioning = false;
let lastDirection = null;

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
    const {slideW, gap, centerNextX, centerPrevX, maskRight, maskLeft} = getConfig();
    const centerX = direction === "next" ? centerNextX : centerPrevX;

    $slides.forEach((i) => {
        const posIdx = Number(i.dataset.pos);

        if (posIdx === 0) {
            i.style.left = `${centerX}px`;
        } else if (posIdx > 0) {
            i.style.left = `${maskRight + (posIdx - 1) * (slideW + gap) + gap}px`;
        } else {
            i.style.left = `${maskLeft + posIdx * (slideW + gap)}px`;
        }
    });
}

function move(direction) {
    if (isTransitioning) return;
    isTransitioning = true;

    // 1. 초기 세팅
    const $slides = getSlides();
    const posArray = Array.from($slides).map(i => Number(i.dataset.pos));
    const minPos = Math.min(...posArray);
    const maxPos = Math.max(...posArray);

    const incomingItem = Array.from($slides).find(i=>
        Number(i.dataset.pos) === (direction === "next" ? 1 : -1)
    );

    const directionChanged = lastDirection !== null && lastDirection !== direction;

    // 2. 방향 바뀔 때 pos 0을 반대편 출발 위치로 순간이동
    if (directionChanged) {
        const {gap, slideW, centerNextX, centerPrevX} = getConfig();
        const centerX = direction === "next" ? centerNextX : centerPrevX;
        const currentCenterItem = Array.from($slides).find(i => Number(i.dataset.pos) === 0);

        if (currentCenterItem) {
            currentCenterItem.classList.remove("transition");
            currentCenterItem.style.left = `${centerX + (direction === "next" ? 1 : -1) * slideW}px`;
        }
    }

    // 3. 클론 생성 및 append
    const targetPos = direction === "next" ? minPos : maxPos;
    const newPos = direction === "next" ? maxPos + 1 : minPos - 1;

    const outgoing = Array.from($slides).find(i => Number(i.dataset.pos) === targetPos);

    if (outgoing) {
        const clone = outgoing.cloneNode(true);
        clone.classList.remove("transition", "active");
        clone.dataset.pos = newPos;
        $vicWrapper.append(clone);
    }

    staticPos(direction);

    requestAnimationFrame(() => {
        // force reflow: 이전 DOM 변경 레이아웃 확정
        void $vicWrapper.offsetHeight;
        const {gap, slideW, centerNextX, centerPrevX} = getConfig();
        const centerX = direction === "next" ? centerNextX : centerPrevX;

        getSlides().forEach(i => {
            const currentPos = Number(i.dataset.pos);
            i.classList.add("transition");
            i.dataset.pos = direction === "next" ? currentPos - 1 : currentPos + 1;
        });

        staticPos(direction);

        // incomingItem 출발 위치 조정
        if (incomingItem) {
            incomingItem.style.left = `${centerX + (direction === "next" ? 1 : -1) * slideW}px`;
        }
    });

    setTimeout(() => {
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
            centerItem.classList.remove("transition");
            centerItem.style.left = `${centerX}px`;
            requestAnimationFrame(() => centerItem.classList.add("transition"));
        }

        isTransitioning = false;
    }, 500);
}

initVic();

window.addEventListener("load", () => {
    if ($maskBtn.textContent === "MASK ON") {
        $mask.classList.add("active");
    }
});

$maskBtn.addEventListener("click", () => {
    $mask.classList.toggle("active");
    $maskBtn.textContent = $mask.classList.contains("active") ? "MASK ON" : "MASK OFF";
});

$nextBtn.addEventListener("click", () => move("next"));
$prevBtn.addEventListener("click", () => move("prev"));