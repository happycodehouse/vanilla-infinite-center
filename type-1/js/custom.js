const $carousel = document.querySelector(".carousel"),
    $carouselInner = document.querySelector(".carousel-inner"),
    $nextBtn = document.querySelector("#nextBtn"),
    $prevBtn = document.querySelector("#prevBtn"),
    $paginationCurrent = document.querySelector("#current"),
    $paginationTotal = document.querySelector("#total");


let config = {gap: 10, widthPercent: 20};
let isTransitioning = false;

/**
 * 1. 슬라이드 위치 계산 및 배치
 */
function staticPosition() {
    const currentSlides = document.querySelectorAll(".slide");
    const {gap, widthPercent} = config;
    const carouselWidth = $carousel.offsetWidth;

    currentSlides.forEach((slide) => {
        const posIndex = parseInt(slide.dataset.pos);
        const slideWidth = (carouselWidth * (widthPercent / 100)) - gap;
        const centerX = carouselWidth / 2;

        let x = centerX - (slideWidth / 2) + (posIndex * (slideWidth + gap));

        slide.classList.add("absolute");
        slide.style.left = `${x}px`;

        if (posIndex === 0) {
            slide.classList.add('active');
            $paginationCurrent.innerHTML = slide.querySelector("span").innerHTML;
        } else slide.classList.remove('active');
    });
}

/**
 * 2. 초기 셋팅 (HTML의 슬라이드 개수를 자동으로 읽음)
 */
function initCarousel() {
    const $initialSlides = document.querySelectorAll(".slide");
    const count = $initialSlides.length;

    $paginationTotal.innerHTML = String(count);

    $initialSlides.forEach(($slide, index) => {
        let pos;
        if (index === 0) {
            pos = 0;
        } else if (index <= Math.floor((count - 1) / 2)) {
            pos = index;
        } else {
            pos = index - count;
        }
        $slide.dataset.pos = pos;
    });

    staticPosition();
}

/**
 * 3. 무한 이동 로직 (개수 상관없이 작동)
 */
function move(direction) {
    if (isTransitioning) return;
    const allSlides = document.querySelectorAll(".slide");
    isTransitioning = true;

    const posArray = Array.from(allSlides).map(s => parseInt(s.dataset.pos));
    const maxPos = Math.max(...posArray);
    const minPos = Math.min(...posArray);

    if (direction === "next") {
        // 가장 왼쪽 슬라이드를 복제해서 오른쪽 끝에 추가
        const outgoing = Array.from(allSlides).find(s => parseInt(s.dataset.pos) === minPos);
        if (outgoing) {
            const clone = outgoing.cloneNode(true);
            clone.classList.remove("transition", "active");
            clone.dataset.pos = maxPos + 1;
            $carouselInner.append(clone);
        }
    } else {
        // 가장 오른쪽 슬라이드를 복제해서 왼쪽 끝에 추가
        const outgoing = Array.from(allSlides).find(s => parseInt(s.dataset.pos) === maxPos);
        if (outgoing) {
            const clone = outgoing.cloneNode(true);
            clone.classList.remove("transition", "active");
            clone.dataset.pos = minPos - 1;
            $carouselInner.prepend(clone);
        }
    }

    staticPosition();

    requestAnimationFrame(() => {
        $carouselInner.offsetHeight;
        document.querySelectorAll(".slide").forEach(slide => {
            slide.classList.add("transition");
            const currentPos = parseInt(slide.dataset.pos);
            slide.dataset.pos = (direction === "next") ? currentPos - 1 : currentPos + 1;
        });
        staticPosition();
    });

    setTimeout(() => {
        document.querySelectorAll(".slide").forEach(slide => {
            const p = parseInt(slide.dataset.pos);
            if ((direction === "next" && p < minPos) || (direction === "prev" && p > maxPos)) {
                slide.remove();
            }
        });
        isTransitioning = false;
    }, 500);
}

$nextBtn.addEventListener("click", () => move("next"));
$prevBtn.addEventListener("click", () => move("prev"));
window.addEventListener("resize", staticPosition);

initCarousel();