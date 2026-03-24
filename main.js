const gnbLinks = document.querySelectorAll("#gnb a");
const iframe = document.getElementById("demoFrame");

gnbLinks.forEach(link => {
    link.addEventListener("click", (e) => {
        e.preventDefault();
        const type = e.target.dataset.type;
        iframe.src = `./${type}/index.html`;

        // active class
        gnbLinks.forEach(l => l.parentElement.classList.remove("active"));
        e.target.parentElement.classList.add("active");
    });

    // init active class
    gnbLinks[0].parentElement.classList.add("active");
});