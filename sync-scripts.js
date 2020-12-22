function fixImages() {
    stamp('fix Images');

    const screenWidth=window.screen.availWidth;
    const imgSizes=[375, 768, 1000];
    const fitting=imgSizes.filter(s => s<=screenWidth);
    const width=fitting.length?fitting[fitting.length-1]*2:imgSizes[0]*2;
    let heroProcessed=false;
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                // only handle images with src=/hlx_*
                // console.log(node.tagName +':'+node.src);
                if (node.tagName === 'IMG' && node.src.includes('/hlx_') && !node.src.includes('?')) {
                    const loading=heroProcessed?'lazy':'eager';
                    heroProcessed=true;
                    node.setAttribute('src', `${node.src}?width=${width}&auto=webp&format=pjpg&optimize=medium`);
                    node.setAttribute('loading', loading);
                    stamp('img src:'+node.src)
                }
            });
        });
        if (document.readyState=='interactive' || document.readyState=='complete') {
            observer.disconnect();
        }
    });
    observer.observe(document, { childList: true, subtree: true });
}

// Catch errors since some browsers throw when using the new `type` option.
// https://bugs.webkit.org/show_bug.cgi?id=209216
try {
    let lcp;
  
    const po = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
  
      stamp('LCP events');
    });
  
    po.observe({type: 'largest-contentful-paint', buffered: true});
  
  } catch (e) {
    // Do nothing if the browser doesn't support this API.
    console.log('error');
  }


fixImages();

window.embrew={};
