
// == Stealth Proximity Search ==
// Floating input box for proximity keyword match on any page

(function () {
  if (window.__stealthSearchRunning) return;
  window.__stealthSearchRunning = true;

  // Utility to check if all keywords appear within 30-word window
  function areKeywordsNear(text, keywords, maxWordsBetween = 30) {
    const words = text.toLowerCase().split(/\s+/);
    const keywordSet = new Set(keywords.map(k => k.toLowerCase()));
    const lastSeen = new Map();
    let foundAll = false;

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      for (const keyword of keywordSet) {
        if (word.includes(keyword)) {
          lastSeen.set(keyword, i);
          if (lastSeen.size === keywordSet.size) {
            const positions = Array.from(lastSeen.values());
            const minPos = Math.min(...positions);
            const maxPos = Math.max(...positions);
            if (maxPos - minPos <= maxWordsBetween + keywordSet.size - 1) {
              foundAll = true;
              break;
            }
          }
        }
      }
      if (foundAll) break;
    }
    return foundAll;
  }

  // Create input + result box
  const input = document.createElement('input');
  const resultBox = document.createElement('div');

  Object.assign(input.style, {
    position: 'fixed', top: '10px', right: '10px',
    width: '200px', zIndex: 2147483647,
    padding: '5px', fontSize: '13px',
    border: '1px solid #ccc', background: 'white'
  });

  Object.assign(resultBox.style, {
    position: 'fixed', top: '40px', right: '10px',
    background: 'white', border: '1px solid #ccc',
    padding: '5px', fontSize: '13px', maxWidth: '300px',
    zIndex: 2147483647, display: 'none'
  });

  document.body.appendChild(input);
  document.body.appendChild(resultBox);
  input.focus();

  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      const query = input.value.trim();
      if (!query) return;

      const keywords = query.split(',').map(w => w.trim()).filter(Boolean);
      if (keywords.length === 0) return;

      resultBox.style.display = 'block';
      resultBox.textContent = 'Searching...';

      const paragraphs = Array.from(document.body.querySelectorAll('p')).map(p => p.innerText || '');
      let matchCount = 0;

      for (const para of paragraphs) {
        if (areKeywordsNear(para, keywords)) {
          matchCount++;
        }
      }

      resultBox.textContent = `✅ Found ${matchCount} matching paragraph${matchCount !== 1 ? 's' : ''}.`;
      setTimeout(() => { resultBox.style.display = 'none'; }, 8000);
    }
  });

  // Double shift toggle
  let lastShift = 0, visible = true;
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Shift') {
      const now = Date.now();
      if (now - lastShift < 400) {
        visible = !visible;
        input.style.display = visible ? 'block' : 'none';
        resultBox.style.display = 'none';
      }
      lastShift = now;
    }
  });
})();
