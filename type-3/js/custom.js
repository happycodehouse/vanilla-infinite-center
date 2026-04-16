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

// 화면 너비에 따라 center 슬라이드 기준 좌측 슬라이드 개수 반환 (모바일: 1개, 데스크탑: 2개)
function getLeftCount() {
    return window.innerWidth < 768 ? 1 : 2;
}

// 현재 DOM에 존재하는 슬라이드 요소 반환
function getSlides() {
    return document.querySelectorAll(".vic-slide");
}

// 슬라이드 및 마스크 영역의 크기와 좌표 계산값 반환
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

// 슬라이드 초기화: data-pos 부여, 위치 설정, 마스크 상태 초기화
function initVic(centerSlideValue = null) {
    const $slides = getSlides();
    const itemCount = $slides.length;
    const leftCount = getLeftCount();

    $slides.forEach(s => s.classList.remove("active"));

    // 현재 center 슬라이드 기준으로 pos 재계산 (없으면 idx 0 기준)
    const centerIdx = centerSlideValue
        ? Array.from($slides).findIndex(s => s.dataset.slide === centerSlideValue)
        : 0;

    $slides.forEach((i, idx) => {
        let pos = idx - centerIdx;
        // 오른쪽 범위 초과 보정
        if (pos > itemCount - 1 - leftCount) pos -= itemCount;
        // 왼쪽 범위 초과 보정
        if (pos < -leftCount) pos += itemCount;
        i.dataset.pos = pos;
    });

    lastDirection = "next";
    staticPos();
    updateActiveMask();
}

// data-pos 기준으로 각 슬라이드의 left 위치를 즉시 설정 (애니메이션 없음)
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

// 슬라이드 이동 애니메이션 및 마스크 클립패스 애니메이션 실행
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

// 방향에 따라 슬라이드 클론 생성 및 이동 처리
function move(direction) {
    if (isTransitioning) return;
    isTransitioning = true;

    const $slides = getSlides();
    const posArray = Array.from($slides).map(i => Number(i.dataset.pos));
    const minPos = Math.min(...posArray);
    const maxPos = Math.max(...posArray);

    // 방향 전환 시 center 슬라이드 위치 즉시 보정
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

    // 반대편 끝에 클론 슬라이드 생성
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

    // 전체 슬라이드 data-pos 업데이트
    getSlides().forEach(i => {
        const currentPos = Number(i.dataset.pos);
        i.dataset.pos = direction === "next" ? currentPos - 1 : currentPos + 1;
    });

    animatePos(direction, () => {
        // 범위 벗어난 슬라이드 제거
        getSlides().forEach(i => {
            const pos = Number(i.dataset.pos);
            if ((direction === "next" && pos < minPos) || (direction === "prev" && pos > maxPos)) {
                i.remove();
            }
        });

        // center 슬라이드 위치 보정
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

// 페이지네이션 버튼 active 상태 업데이트
function updatePagination(activeSlide) {
    document.querySelectorAll('#pagination button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.slide === activeSlide);
    });
}

// 페이지네이션 클릭 시 해당 슬라이드까지 단계적으로 이동
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

// 방향에 따라 마스크 클립패스 애니메이션 및 active/z-index 상태 관리
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

        // 루프 경계: 마지막 슬라이드에서 첫 슬라이드로 넘어올 때 마스크 상태 초기화
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
            // 이미 active인 마스크가 있으면 초기화 후 새 애니메이션 실행
            if (activeItem.classList.contains("active")) {
                document.querySelectorAll('.mask-item.active').forEach(item => {
                    item.classList.remove("active");
                    gsap.set(item, {clipPath: "inset(0 0 0 100%)"});
                });
            }
        }

        // 새 center 마스크 왼쪽에서 오른쪽으로 reveal
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

        // 새 center 마스크 오른쪽에서 왼쪽으로 reveal
        if (!centerItem.classList.contains("active")) {
            centerItem.classList.add("active");
            gsap.fromTo(centerItem,
                {clipPath: "inset(0 100% 0 0)"},
                {clipPath: "inset(0 0% 0 0)", duration: DURATION, ease: "power2.inOut"}
            );
        }

        // 루프 경계: 첫 슬라이드가 빠져나갈 때 z-index 처리
        if (leavingSlide.dataset.slide === firstSlideValue) {
            if (prevMaskItem) prevMaskItem.classList.remove("z2");
            prevMaskItem = leavingItem;
            prevMaskItem.classList.add("z2");
        }

        // leaving 마스크 오른쪽으로 가려지며 퇴장
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

// 리사이즈 시 슬라이드 위치 및 반응형 레이아웃 재계산 (debounce 200ms)
let resizeTimer;
window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    // 리사이즈 전 현재 center 슬라이드 저장
    const currentCenter = Array.from(getSlides()).find(s => Number(s.dataset.pos) === 0);
    const currentCenterSlide = currentCenter?.dataset.slide || null;
    resizeTimer = setTimeout(() => initVic(currentCenterSlide), 200);
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