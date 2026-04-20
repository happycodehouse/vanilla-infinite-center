const $header = document.querySelector("header");
const $gnb = document.getElementById("gnb");
const $gnbLinks = document.querySelectorAll("#gnb a");
const $trigger = document.getElementById("trigger");
const $iframe = document.getElementById("demoFrame");
const $readMe = document.getElementById("readMe");

function isTablet() {
    return window.innerWidth <= 1024;
}

function closeGnb() {
    if (!isTablet()) return;
    $trigger.classList.remove("active");
    $header.classList.remove("active");
    $gnb.style.maxHeight = null;
}

$gnbLinks.forEach((link, idx) => {
    link.addEventListener("click", (e) => {
        e.preventDefault();
        const type = e.target.dataset.type;

        if (idx !== 0) {
            $readMe.style.display = "none";
            $iframe.style.display = "block";
            $iframe.src = `./${type}/index.html`;
        } else {
            $readMe.style.display = "block";
            $iframe.style.display = "none";
        }

        // active class
        $gnbLinks.forEach(l => l.parentElement.classList.remove("active"));
        e.target.parentElement.classList.add("active");

        // gnb 닫기
        closeGnb();
    });

    // init active class
    $gnbLinks[0].parentElement.classList.add("active");
});

$trigger.addEventListener("click", function() {
    if (!isTablet()) return;
    const isActive = this.classList.contains("active");
    this.classList.toggle("active");
    $header.classList.toggle("active");
    $gnb.style.maxHeight = isActive ? null : $gnb.scrollHeight + "px";
});

$iframe.addEventListener("load", () => {
    if ($trigger.classList.contains("active")) {
        closeGnb();
    }
});

document.addEventListener("click", function(e) {
    if ($trigger.classList.contains("active") && !$header.contains(e.target)) {
        closeGnb();
    }
});

window.addEventListener("load", () => {
    if ($gnbLinks[0].parentElement.classList.contains("active")) {
        $iframe.style.display = "none";
    }
});

window.addEventListener("blur", function() {
    if (document.activeElement === $iframe) {
        closeGnb();
    }
});