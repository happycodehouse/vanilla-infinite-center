const gnbLinks = document.querySelectorAll("#gnb a");
const iframe = document.getElementById("demoFrame");
const readMe = document.getElementById("readMe");

gnbLinks.forEach((link, idx) => {
    link.addEventListener("click", (e) => {
        e.preventDefault();
        const type = e.target.dataset.type;

        if (idx !== 0) {
            readMe.style.display = "none";
            iframe.style.display = "block";
            iframe.src = `./${type}/index.html`;
        } else {
            readMe.style.display = "block";
            iframe.style.display = "none";
        }

        // active class
        gnbLinks.forEach(l => l.parentElement.classList.remove("active"));
        e.target.parentElement.classList.add("active");
    });

    // init active class
    gnbLinks[0].parentElement.classList.add("active");
});

window.addEventListener("load", () => {
    if (gnbLinks[0].parentElement.classList.contains("active")) {
        iframe.style.display = "none";
    }
});