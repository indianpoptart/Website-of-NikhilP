(function(exports) {

function addPermalink(el) {
  el.classList.add('has-permalink');
  el.insertAdjacentHTML('beforeend',
      '<a class="permalink" title="Permalink" href="#' + el.id + '">#</a>');
}

function setupDownloadButtons(opt_inDoc) {
  var doc = opt_inDoc || document;

  var downloadButton = doc.querySelector('[data-download-button]');
  downloadButton && downloadButton.addEventListener('tap', function(e) {
    exports._gaq.push(['_trackEvent', 'SDK', 'Download', POLYMER_VERSION]);
  });
}

// Add permalinks to heading elements.
function addPermalinkHeadings(opt_inDoc) {
  var doc = opt_inDoc || document;

  var permalinkEl = doc.querySelector('.show-permalinks');
  if (permalinkEl) {
    ['h2','h3','h4'].forEach(function(h, i) {
      [].forEach.call(permalinkEl.querySelectorAll(h), addPermalink);
    });
  }
}

function prettyPrintPage(opt_inDoc) {
  var doc = opt_inDoc || document;

  [].forEach.call(doc.querySelectorAll('pre'), function(pre, i) {
    pre.classList.add('prettyprint');
  });
  exports.prettyPrint && prettyPrint();
}

// Feature detect xhr.responseType = 'document'...but it's async. 
function testXhrType(type, callback) {
  if (typeof XMLHttpRequest == 'undefined') {
    callback(false);
    return;
  }

  var xhr = new XMLHttpRequest();
  xhr.open('GET', '/humans.txt');
  try {
    xhr.responseType = type;
  } catch(error) {
    callback(false);
    return;
  }
  callback('response' in xhr && xhr.responseType == type);
}

/**
 * Replaces the main content of the page by loading the URL via XHR.
 *
 * @param {string} url The URL of the page to load.
 * @param {boolean} opt_addToHistory If true, the URL is added to the browser's
 *     history.
 */
function injectPage(url, opt_addToHistory) {
  var CONTAINER_SELECTOR = 'scroll-area article'; //#content-container';
  var container = document.querySelector(CONTAINER_SELECTOR);

  var xhr = new XMLHttpRequest();
  xhr.open('GET', url);
  xhr.responseType = 'document';
  xhr.onloadend = function(e) {
    if (e.target.status != 200) {
      // TODO: use window.error and report this to server.
      console.error('Page fetch error', e.target.status, e.target.statusText);
      container.classList.remove('loading');
      return;
    }

    var doc = e.target.response;

    document.title = doc.title; // Update document title to fetched one.

    var META_CONTENT_NAME = 'meta[itemprop="name"]';
    var metaContentName = doc.head.querySelector(META_CONTENT_NAME).content;
    document.head.querySelector(META_CONTENT_NAME).content = metaContentName;

    var SCROLL_AREA = 'scroll-area';
    var SITE_BANNER = 'site-banner';
    var scrollArea = doc.querySelector(SCROLL_AREA);
    var siteBanner = scrollArea.querySelector(SITE_BANNER);
    document.querySelector(SITE_BANNER).outerHTML = siteBanner.outerHTML;

    var newDocContainer = doc.querySelector(CONTAINER_SELECTOR);
    container.innerHTML = newDocContainer.innerHTML;

    // TODO: doesn't bring the app-bar back because listeners are nuked.
    var scrollAreaDoc = document.querySelector(SCROLL_AREA);
    scrollAreaDoc.init();

    // Remove "loading" message immediately after page content is set.
    container.classList.remove('loading');

    // // Run Polymer's HTML Import loader/parser.
    // HTMLImports.importer.load(newDocContainer, function() {
    //   HTMLImports.parser.parse(newDocContainer);
    //   // CustomElements polyfill needs to process the dynamic imports for definitions.
    //   CustomElements.parser.parse(newDocContainer);
      
    //   // Prevents polymer-ui-overlay FOUC where O.o() is unavailable.
    //   Platform.flush();
    // });

    var addToHistory = opt_addToHistory == undefined ? true : opt_addToHistory;
    if (addToHistory) {
      history.pushState({url: url}, doc.title, url);
    } else {
      // Came from history pop. Adjust nav arrow position.
      // TODO: doesn't always move the arrow to the correct location. For the sake
      // of mitigating user confusion, don't move the arrow on a history pop.
      //docsMenu.highlightItemWithURL(location.pathname);
    }

    initPage(); // TODO: can't pass doc to this because prettyPrint() needs markup in dom.

    // Record page view in GA early on.
    exports._gaq.push(['_trackPageview', location.pathname]);

    exports.scrollTo(0, 0); // Ensure we're at the top of the page when it's ready.
  };

  xhr.send();

  container.classList.add('loading');
}

function initPage(opt_inDoc) {
  var doc = opt_inDoc || document;

  setupDownloadButtons(doc);
  addPermalinkHeadings(doc);

  // TODO: figure out better way to do this than move it in JS. Kramdown
  // {:toc} not working inside a <details> tag (see _includes/toc.html)
  var toc = document.querySelector('#toc');
  if (toc) {
    toc.appendChild(document.querySelector('#markdown-toc'));
  }

  // TODO: Use kramdown {:.prettyprint .linenums .lang-ruby} to add the
  // <pre class="prettyprint"> instead of doing this client-side.
  prettyPrintPage(doc);
}

// Hijacks page to preventDefault() on links and make site ajax.
function ajaxifySite() {
  var docsMenu = document.querySelector('docs-menu');

  document.addEventListener('polymer-ready', function(e) {
    docsMenu.ajaxify = true;
  });

  exports.addEventListener('popstate', function(e) {
    if (e.state && e.state.url) {
      // TODO(ericbidelman): Don't run this for relative anchors on the page.
      injectPage(e.state.url, false);
    }
  });
}


document.addEventListener('polymer-ready', function(e) {
  // TODO(ericbidelman): Hacky solution to get anchors scrolled to correct location
  // in page. Layout of page happens later than the browser wants to scroll.
  if (location.hash) {
    window.setTimeout(function() {
      document.querySelector(location.hash).scrollIntoView(true, {behavior: 'smooth'});
    }, 200);
  }

  // The sliding sidebar menu for mobile
  var siteBanner = document.querySelector('site-banner');
  var sidebar = document.querySelector('#sidebar');
  var scrim = document.querySelector('page-scrim');

  // The dropdown panel in the sidebar for mobile
  var dropdownToggle = document.querySelector('#dropdown-toggle');
  var dropdownPanel = document.querySelector('dropdown-panel');

  siteBanner.addEventListener('hamburger-time', function(e) {
    sidebar.classList.add('in');
    scrim.show();
  });

  dropdownToggle.addEventListener('click', function(e) {
    dropdownPanel.toggle();
    // dropdownPanel listens to clicks on the document and autocloses
    // so no need to add any more handlers
  });

  if (scrim) {
    scrim.addEventListener('click', function(e) {
      sidebar.classList.remove('in');
      scrim.hide();
    });
  }
});


document.addEventListener('DOMContentLoaded', function(e) {
  initPage();

  //addStickyScrollToBars();

  // // Insure add current page to history so back button has an URL for popstate.
  // history.pushState({url: document.location.href}, document.title,
  //                   document.location.href);
});

// Search bo close.
document.addEventListener('click', function(e) {
  var appBar = document.querySelector('app-bar');
  if (appBar.showingSearch) {
    appBar.toggleSearch(e);
  }
});

document.querySelector('[data-twitter-follow]').addEventListener('click', function(e) {
  e.preventDefault();
  var target = e.target.localName != 'a' ? e.target.parentElement : e.target;
  exports.open(target.href, '', 'width=550,height=520');
});


// -------------------------------------------------------------------------- //


// // Control whether the site is ajax or static.
// var AJAXIFY_SITE = !navigator.userAgent.match('Mobile|Android');
// if (AJAXIFY_SITE) {
//   testXhrType('document', function(supported) {
//     if (supported) {
//       ajaxifySite();
//     }
//   });
// }

// Analytics -----
exports._gaq = exports._gaq || [];
exports._gaq.push(['_setAccount', 'UA-39334307-1']);
exports._gaq.push(['_setSiteSpeedSampleRate', 50]);
exports._gaq.push(['_trackPageview']);

var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';
var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
// ---------------

console && console.log("%cWelcome to Polymer!\n%cweb components are the <bees-knees>",
                       "font-size:1.5em;color:#4558c9;", "color:#d61a7f;font-size:1em;");

})(window);
