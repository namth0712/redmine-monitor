'use strict';

(() => {
    if (
        document.getElementById('query_form') &&
        document.getElementById('main') &&
        document.getElementsByClassName('controller-issues').length
    ) {
        function loadScript(scriptName, callback) {
            let scriptEl = document.createElement('script');
            scriptEl.src = chrome.extension.getURL('assets/js/' + scriptName + '.js');
            scriptEl.addEventListener('load', callback, false);
            document.head.appendChild(scriptEl);
        }
        function loadCss(cssName, callback) {
            let styles = `@import url(' ${chrome.extension.getURL('assets/css/' + cssName + '.css')} ');`;
            let newSS = document.createElement('link');
            newSS.rel = 'stylesheet';
            newSS.href = 'data:text/css,' + escape(styles);
            document.getElementsByTagName("head")[0].appendChild(newSS)
        }

        loadScript('jquery.magnific-popup.min');
        loadScript('redmine');
        loadCss('magnific-popup');
    }
})();