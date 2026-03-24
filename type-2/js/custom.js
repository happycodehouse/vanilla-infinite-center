const $slideItems = document.querySelector(".slide-items");
const $mask = document.getElementById("mask");
const $maskItem = document.querySelector(".mask-item span");
const $maskBtn = document.getElementById("maskBtn");
const $prevBtn = document.getElementById("prevBtn");
const $nextBtn = document.getElementById("nextBtn");

const rootStyle = getComputedStyle(document.documentElement);

let itemCount;
let isTransitioning = false;
let lastDirection = null;

function getSlideItems() {
    return document.querySelectorAll(".slide-item");
}

function getConfig() {
    const maskW = $mask.offsetWidth;
    const gap = (parseFloat(rootStyle.getPropertyValue('--gap')) / 100) * window.innerWidth;
    const slideItemW = (parseFloat(rootStyle.getPropertyValue('--slideItemW')) / 100) * window.innerWidth;

    const centerItemNextX = (window.innerWidth / 2) - (maskW / 2 - slideItemW) - (slideItemW / 2) + 1; // + 1 하는 이유: border: 1px solid 때문에
    const centerItemPrevX = (window.innerWidth / 2) + (maskW / 2 - slideItemW) + gap - 1; // - 1 하는 이유: border: 1px solid 때문에
    const baseX = (window.innerWidth - maskW) - gap * (itemCount - 1) + slideItemW;
    const rightOriginX = baseX + gap;
    const leftOriginX = baseX - (slideItemW / 2) - (gap * 2);

    return { maskW, gap, slideItemW, centerItemNextX, centerItemPrevX, rightOriginX, leftOriginX };
}

function staticPosition(direction = "next") {
    const slideItems = getSlideItems();
    const { gap, slideItemW, centerItemNextX, centerItemPrevX, rightOriginX, leftOriginX } = getConfig();
    const centerItemX = direction === "next" ? centerItemNextX : centerItemPrevX;

    slideItems.forEach((item, idx) => {
        const posIndex = parseInt(item.dataset.pos);
        const offset = -(slideItemW / 2) + (posIndex * (slideItemW + gap));

        if (posIndex === 0) {
            item.style.left = `${centerItemX}px`;
            item.classList.add("active");
            $maskItem.innerHTML = Number(item.dataset.realIndex) + 1;
        } else if (posIndex > 0) {
            item.style.left = `${rightOriginX + offset}px`;
            item.classList.remove("active");
        } else {
            item.style.left = `${leftOriginX + offset}px`;
            item.classList.remove("active");
        }
    });
}

function initCarousel() {
    const slideItems = getSlideItems();
    itemCount = slideItems.length;

    slideItems.forEach((item, index) => {
        let pos;

        item.dataset.realIndex = index;

        if (index === 0) {
            pos = 0;
        } else if (index <= Math.floor(itemCount - 1) / 2) {
            pos = index;
        } else {
            pos = index - itemCount;
        }

        item.dataset.pos = pos;
    });

    staticPosition();
}

function move(direction) {
    if (isTransitioning) return;
    isTransitioning = true;

    // 1. 초기 세팅
    const slideItems = getSlideItems();
    const posArray = Array.from(slideItems).map(i => parseInt(i.dataset.pos));
    const maxPos = Math.max(...posArray);
    const minPos = Math.min(...posArray);

    const incomingItem = Array.from(slideItems).find(i =>
        parseInt(i.dataset.pos) === (direction === "next" ? 1 : -1)
    );

    const directionChanged = lastDirection !== null && lastDirection !== direction;

    // 2. 방향 바뀔 때 pos 0을 반대편 출발 위치로 순간이동
    if (directionChanged) {
        const { gap, slideItemW, centerItemNextX, centerItemPrevX } = getConfig();
        const centerItemX = direction === "next" ? centerItemNextX : centerItemPrevX;
        const currentCenterItem = Array.from(slideItems).find(i => parseInt(i.dataset.pos) === 0);
        if (currentCenterItem) {
            currentCenterItem.classList.remove("transition");
            currentCenterItem.style.left = `${centerItemX + (direction === "next" ? 1 : -1) * (slideItemW + gap)}px`;
        }
    }

    // 3. 클론 생성 및 append
    const targetPos = direction === "next" ? minPos : maxPos;
    const newPos = direction === "next" ? maxPos + 1 : minPos - 1;

    const outgoing = Array.from(slideItems).find(i => parseInt(i.dataset.pos) === targetPos);
    if (outgoing) {
        const clone = outgoing.cloneNode(true);
        clone.classList.remove("transition", "active");
        clone.dataset.pos = newPos;
        $slideItems.append(clone);
    }

    // 4. 현재 위치 세팅 (transition 없이)
    staticPosition(direction);

    // 5. requestAnimationFrame
    requestAnimationFrame(() => {
        $slideItems.offsetHeight;
        const { gap, slideItemW, centerItemNextX, centerItemPrevX } = getConfig();
        const centerItemX = direction === "next" ? centerItemNextX : centerItemPrevX;

        // transition 추가 + pos 변경
        getSlideItems().forEach(slide => {
            const currentPos = parseInt(slide.dataset.pos);
            slide.classList.add("transition");
            slide.dataset.pos = direction === "next" ? currentPos - 1 : currentPos + 1;
        });

        // 새 pos 기준 위치 세팅
        staticPosition(direction);

        // incomingItem 출발 위치 override
        if (incomingItem) {
            incomingItem.style.left = `${centerItemX + (direction === "next" ? 1 : -1) * (slideItemW + gap)}px`;
        }
    });

    // 6. lastDirection 업데이트
    lastDirection = direction;

    // 7. setTimeout
    setTimeout(() => {
        getSlideItems().forEach(slide => {
            const p = parseInt(slide.dataset.pos);
            if ((direction === "next" && p < minPos) || (direction === "prev" && p > maxPos)) {
                slide.remove();
            }
        });

        const { centerItemNextX, centerItemPrevX } = getConfig();
        const centerItemX = direction === "next" ? centerItemNextX : centerItemPrevX;
        const centerItem = Array.from(getSlideItems()).find(s => parseInt(s.dataset.pos) === 0);
        if (centerItem) {
            centerItem.classList.remove("transition");
            centerItem.style.left = `${centerItemX}px`;
            requestAnimationFrame(() => centerItem.classList.add("transition"));
        }

        isTransitioning = false;
    }, 500);
}

$nextBtn.addEventListener("click", () => move("next"));
$prevBtn.addEventListener("click", () => move("prev"));
window.addEventListener("resize", staticPosition);

initCarousel();

$maskBtn.addEventListener("click", () => {
    $mask.classList.toggle("active");
    $maskBtn.textContent = $mask.classList.contains("active") ? "MASK ON" : "MASK OFF";
});