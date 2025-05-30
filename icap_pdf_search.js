(function() {
  if (window.ICAP_LOADED) return;
  window.ICAP_LOADED = true;

  const container = document.createElement('div');
  container.id = 'icap-ui';
  container.style.position = 'fixed';
  container.style.top = '10px';
  container.style.right = '10px';
  container.style.zIndex = '100000';
  container.style.background = '#fff';
  container.style.border = '1px solid #ccc';
  container.style.padding = '6px';
  container.style.borderRadius = '8px';
  container.style.boxShadow = '0 2px 6px rgba(0,0,0,0.2)';

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Search words (comma-separated)';
  input.style.padding = '4px';
  input.style.width = '220px';

  const btn = document.createElement('button');
  btn.textContent = 'Search';
  btn.style.marginLeft = '6px';
  btn.onclick = () => {
    const words = input.value.split(',').map(w => w.trim()).filter(Boolean);
    if (words.length) {
      window.dispatchEvent(new CustomEvent('ICAP_TRIGGER_SEARCH', { detail: words }));
    }
  };

  container.appendChild(input);
  container.appendChild(btn);
  document.body.appendChild(container);
window.addEventListener('ICAP_TRIGGER_SEARCH', function(e) {
// Utility function to check if all keywords appear within a 30-word window
function areKeywordsNear(text, keywords, maxWordsBetween = 30) {
    // Convert text to lowercase and split into words
    const words = text.toLowerCase().split(/\s+/);
    const keywordSet = new Set(keywords.map(k => k.toLowerCase()));
    
    // Create a map to track the last seen position of each keyword
    const lastSeen = new Map();
    let foundAll = false;
    
    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        // Check if current word is one of our keywords
        for (const keyword of keywordSet) {
            if (word.includes(keyword.toLowerCase())) {
                lastSeen.set(keyword, i);
                
                // Check if we've seen all keywords within the window
                if (lastSeen.size === keywordSet.size) {
                    const positions = Array.from(lastSeen.values());
                    const minPos = Math.min(...positions);
                    const maxPos = Math.max(...positions);
                    
                    // If all keywords are within maxWordsBetween words of each other
                    if (maxPos - minPos <= maxWordsBetween + keywordSet.size - 1) {
                        foundAll = true;
                        break;
                    }
                }
            }
        }
        if (foundAll) break;
        
        // Remove old positions that are too far back
        for (const [kw, pos] of lastSeen.entries()) {
            if (i - pos > maxWordsBetween + keywordSet.size) {
                lastSeen.delete(kw);
            }
        }
    }
    
    return foundAll;
}

// Function to extract text from a PDF document
async function extractTextFromPDF(pdfDocument, keywords) {
    console.log('Starting text extraction...');
    const results = [];

    try {
        // Get total number of pages
        const numPages = pdfDocument.numPages;
        if (!numPages) {
            console.error('No pages found in PDF');
            return [];
        }

        console.log('Total pages:', numPages);

        // Process each page
        for (let i = 1; i <= numPages; i++) {
            try {
                console.log('Processing page:', i);
                const page = await pdfDocument.getPage(i);
                if (!page) {
                    console.error('Failed to get page:', i);
                    continue;
                }

                const textContent = await page.getTextContent();
                if (!textContent?.items?.length) {
                    console.error('No text content found on page:', i);
                    continue;
                }


                // Combine all text items into a single string
                const text = textContent.items
                    .map(item => item.str || '')
                    .join(' ');

                if (!text.trim()) {
                    console.log('No text found on page:', i);
                    continue;
                }

                console.log(`Page ${i} text length:`, text.length);

                // Check if keywords appear within the specified distance
                if (areKeywordsNear(text, keywords)) {
                    results.push({
                        page: i,
                        text: text.substring(0, 200) + (text.length > 200 ? '...' : '')
                    });
                }
            } catch (error) {
                console.error(`Error processing page ${i}:`, error);
            }
        }
    } catch (error) {
        console.error('Error in extractTextFromPDF:', error);
    }
    
    console.log('Text extraction complete. Found results:', results.length);
    return results;
}

// Function to highlight search terms in the PDF viewer
async function highlightResultInPage(result) {
    console.log('highlightResultInPage called with:', result);
    if (!result) return;

    // Try to get the PDF.js viewer instance
    const pdfViewer = window.PDFViewerApplication?.pdfViewer;
    if (!pdfViewer) {
        console.error('PDF viewer not found');
        return;
    }

    // Navigate to the page
    const pageNumber = result.page - 1; // PDF.js uses 0-based page numbers
    pdfViewer.currentPageNumber = pageNumber + 1; // Some viewers use 1-based

    // Wait for the page to render
    await new Promise(resolve => setTimeout(resolve, 500));

    // Get the page view
    const pageView = pdfViewer.getPageView(pageNumber);
    if (!pageView) {
        console.error('Page view not found for page:', pageNumber);
        return;
    }

    console.log('Found page view:', pageView);

    // Get the text layer
    const textLayer = pageView.textLayer;
    if (!textLayer) {
        console.error('Text layer not found for page:', pageNumber);
        return;
    }
    console.log('Found text layer:', textLayer);

    // Wait for the text layer to be ready
    await new Promise(resolve => {
        if (textLayer.renderingDone) {
            resolve();
        } else {
            textLayer.onRender = resolve;
        }
    });

    // Get all text spans in the text layer
    const textSpans = textLayer.textLayerDiv.querySelectorAll('.textLayer > span, .textLayer > div > span');
    console.log('Found text spans:', textSpans.length);

    // Clear previous highlights
    document.querySelectorAll('.icap-highlight').forEach(el => {
        el.classList.remove('icap-highlight');
    });

    // Add highlight to matching text
    const keywords = result.keywords || window.currentSearchKeywords || [];
    if (keywords.length === 0) {
        console.error('No keywords to highlight');
        return;
    }

    console.log('Highlighting keywords:', keywords);
    
    let found = false;
    textSpans.forEach(span => {
        const text = span.textContent.toLowerCase();
        const matches = keywords.some(keyword => 
            text.includes(keyword.toLowerCase())
        );
        
        if (matches) {
            span.classList.add('icap-highlight');
            span.style.backgroundColor = 'rgba(255, 255, 0, 0.5)';
            span.style.borderRadius = '2px';
            span.style.padding = '1px 2px';
            found = true;
        }
    });

    console.log('Highlighting complete. Found matches:', found);

    // Scroll to the first highlight
    const firstHighlight = document.querySelector('.icap-highlight');
    if (firstHighlight) {
        firstHighlight.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest'
        });
    }
}

// Main search function
async function searchPDF(keywords) {
    console.log('searchPDF called with keywords:', keywords);
    
    try {
        // Store keywords for highlighting
        const searchKeywords = Array.isArray(keywords) ? keywords : [keywords];
        window.currentSearchKeywords = searchKeywords;
        
        // Try to find the PDF viewer instance
        const viewer = window.PDFViewerApplication || window.icapPDFViewer;
        if (!viewer) {
            console.error('PDF viewer not found in window object');
            return { results: [] };
        }

        console.log('Found PDF viewer:', viewer);

        // Get the PDF document
        const pdfDocument = viewer.pdfDocument || (viewer.pdfViewer?.pdfDocument);
        if (!pdfDocument) {
            console.error('PDF document not found');
            return { results: [] };
        }
        
        // Store keywords in a way that's accessible to the highlight function
        const results = await extractTextFromPDF(pdfDocument, searchKeywords);
        
        // Store the current search keywords for highlighting
        if (results.length > 0) {
            results[0].keywords = searchKeywords;
        }
        
        return { results };
    } catch (error) {
        console.error('Error in searchPDF:', error);
        return { results: [], error: error.message };
    }
}

// Expose functions to window object in a way that works with Chrome's isolated worlds
function exposeFunctions() {
    console.log('Exposing functions to window object');
    
    // Create a namespace for our functions
    window.icapPDFSearch = {
        searchPDF,
        highlightResultInPage
    };
    
    // Also expose directly to window for backward compatibility
    window.searchPDF = searchPDF;
    window.highlightResultInPage = highlightResultInPage;
    
    console.log('Functions exposed to window:', Object.keys(window.icapPDFSearch));
}

// Run the exposure when the script loads
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit to ensure the PDF viewer is fully loaded
    setTimeout(exposeFunctions, 1000);
});

console.log('ICAP PDF Search content script loaded');

});})();
