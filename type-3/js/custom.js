const $mask = document.getElementById("mask");

console.log($mask.offsetWidth);

const rootStyle = getComputedStyle(document.documentElement);
const gap = (parseFloat(rootStyle.getPropertyValue('--gap')) / 100) * window.innerWidth;

function getSlides() {
    return document.querySelectorAll(".vic-slide");
}

function initVic() {
    const $slides = getSlides();

    $slides.forEach((i, idx) => {
        let pos;
        let itemCount = $slides.length;

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

function staticPos() {
    const $slides = getSlides();

    $slides.forEach((i) => {
        const posIdx = Number(i.dataset.pos);

        if (posIdx === 0) {
            i.style.left = (window.innerWidth - i.offsetWidth) / 2 + "px";
        } else if (posIdx > 0) {
            const maskRight = (window.innerWidth + $mask.offsetWidth) / 2;
            i.style.left = maskRight + (posIdx - 1) * (i.offsetWidth + gap) + gap + "px";
        } else {
            const maskLeft = (window.innerWidth - $mask.offsetWidth) / 2;
            i.style.left = maskLeft + posIdx * (i.offsetWidth + gap) + "px";
        }
    });
}

initVic();