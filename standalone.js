(function () {
    if (window.__pageSearchInjected) return;
    window.__pageSearchInjected = true;

    // Create floating UI elements
    const input = document.createElement("input");
    const resultBox = document.createElement("div");

    Object.assign(input.style, {
        position: "fixed",
        top: "10px",
        right: "10px",
        width: "200px",
        height: "24px",
        zIndex: "999999",
        fontSize: "13px",
        padding: "4px",
        background: "white",
        color: "black",
        border: "1px solid #ccc",
        opacity: "0.95"
    });

    Object.assign(resultBox.style, {
        position: "fixed",
        top: "40px",
        right: "10px",
        maxWidth: "300px",
        background: "white",
        color: "black",
        fontSize: "13px",
        border: "1px solid #ccc",
        padding: "6px",
        zIndex: "999999",
        display: "none",
        opacity: "0.98"
    });

    document.body.append(input, resultBox);
    input.focus();

    // Highlight style
    const highlightStyle = document.createElement('style');
    highlightStyle.innerHTML = `
        .__keywordMatch {
            background-color: yellow;
            font-weight: bold;
        }
    `;
    document.head.appendChild(highlightStyle);

    // Util: Check if all keywords are within 30 words
    function areKeywordsNear(text, keywords, maxWordsBetween = 30) {
        const words = text.toLowerCase().split(/\s+/);
        const keywordSet = new Set(keywords.map(k => k.toLowerCase()));
        const lastSeen = new Map();

        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            for (const keyword of keywordSet) {
                if (word.includes(keyword)) {
                    lastSeen.set(keyword, i);
                    if (lastSeen.size === keywordSet.size) {
                        const positions = Array.from(lastSeen.values());
                        const minPos = Math.min(...positions);
                        const maxPos = Math.max(...positions);
                        if (maxPos - minPos <= maxWordsBetween) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }

    // Clear previous highlights
    function clearHighlights() {
        document.querySelectorAll(".__keywordMatch").forEach(el => {
            el.outerHTML = el.innerText;
        });
    }

    // Highlight matched elements
    function highlightMatches(keywords) {
        clearHighlights();
        let count = 0;
        const tags = ["p", "span", "div", "td"];
        tags.forEach(tag => {
            document.querySelectorAll(tag).forEach(el => {
                const text = el.innerText;
                if (text && areKeywordsNear(text, keywords)) {
                    count++;
                    const re = new RegExp(`(${keywords.join("|")})`, "gi");
                    el.innerHTML = el.innerHTML.replace(re, '<span class="__keywordMatch">$1</span>');
                }
            });
        });
        return count;
    }

    // Handle search
    input.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
            const raw = input.value.trim();
            if (!raw) return;
            const keywords = raw.split(",").map(k => k.trim()).filter(Boolean);
            if (!keywords.length) return;
            const matches = highlightMatches(keywords);
            resultBox.style.display = "block";
            resultBox.textContent = `✅ ${matches} match${matches !== 1 ? 'es' : ''} found`;
            setTimeout(() => resultBox.style.display = "none", 5000);
        }
    });

    // Toggle visibility with double Shift
    let lastShift = 0, visible = true;
    document.addEventListener("keydown", e => {
        if (e.key === "Shift") {
            const now = Date.now();
            if (now - lastShift < 400) {
                visible = !visible;
                input.style.display = visible ? "block" : "none";
                resultBox.style.display = "none";
            }
            lastShift = now;
        }
    });
})();
