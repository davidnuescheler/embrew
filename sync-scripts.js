function fixImages() {
    const screenWidth=window.screen.availWidth;
    const imgSizes=[375, 768, 1000];
    const fitting=imgSizes.filter(s => s<=screenWidth);
    const width=fitting.length?fitting[fitting.length-1]*2:imgSizes[0]*2;
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                // only handle images with src=/hlx_*
                // console.log(node.tagName +':'+node.src);
                if (node.tagName === 'IMG' && node.src.includes('/hlx_') && !node.src.includes('?')) {
                    node.setAttribute('src', `${node.src}?width=${width}&auto=webp&format=pjpg&optimize=medium`);
                    //console.log('src:'+node.src)
                }
            });
        });
        if (document.readyState=='interactive' || document.readyState=='complete') {
            observer.disconnect();
        }
    });
    observer.observe(document, { childList: true, subtree: true });
}

fixImages();
