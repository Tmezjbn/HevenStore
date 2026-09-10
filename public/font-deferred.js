/**
 * CSP-safe deferred stylesheet unlock (no inline onload handlers).
 * Links with media="print" + data-onload-media="all" swap to all once loaded.
 */
(function () {
  function unlock(link) {
    var next = link.getAttribute('data-onload-media') || 'all';
    if (link.media !== next) link.media = next;
  }
  document.querySelectorAll('link[data-onload-media]').forEach(function (link) {
    if (link.sheet) unlock(link);
    else link.addEventListener('load', function () { unlock(link); });
  });
})();
