(function () {
  "use strict";

  var ORIGIN = (function () {
    var script = document.currentScript;
    if (script && script.src) {
      var url = new URL(script.src);
      return url.origin;
    }
    return "";
  })();

  var SOURCE = "ycaptcha";
  var WIDGET_PREFIX = "ycaptcha-widget-";
  var widgetIdx = 0;
  var widgets = {};

  /**
   * Render a yCAPTCHA widget into a container.
   *
   * @param {string|HTMLElement} container - CSS selector or DOM element
   * @param {Object} [params] - Optional overrides
   * @param {string} [params.sitekey] - Site key (overrides data-sitekey)
   * @param {Function} [params.callback] - Called with token on success
   * @returns {string} Widget ID
   */
  function render(container, params) {
    params = params || {};

    var el;
    if (typeof container === "string") {
      el = document.querySelector(container);
      if (!el) throw new Error('[yCAPTCHA] Container not found: "' + container + '"');
    } else {
      el = container;
    }

    var sitekey = params.sitekey || el.getAttribute("data-sitekey");
    if (!sitekey) throw new Error("[yCAPTCHA] Missing sitekey");

    var widgetId = WIDGET_PREFIX + widgetIdx++;
    var callback = params.callback || null;

    // Create iframe
    var iframe = document.createElement("iframe");
    iframe.id = widgetId;
    iframe.src = ORIGIN + "/widget/" + sitekey;
    iframe.style.border = "none";
    iframe.style.overflow = "hidden";
    iframe.style.width = "304px";
    iframe.style.height = "78px";
    iframe.setAttribute("scrolling", "no");
    iframe.title = "yCAPTCHA challenge";

    // Hidden input for form submission
    var input = document.createElement("input");
    input.type = "hidden";
    input.name = params["response-field-name"] || "ycaptcha-response";
    input.id = widgetId + "_response";

    el.appendChild(iframe);
    el.appendChild(input);

    widgets[widgetId] = {
      element: el,
      iframe: iframe,
      input: input,
      sitekey: sitekey,
      callback: callback,
      response: null,
    };

    return widgetId;
  }

  /**
   * Get the verification token for a widget.
   * @param {string} [widgetId]
   * @returns {string|null}
   */
  function getResponse(widgetId) {
    var w = resolveWidget(widgetId);
    return w ? w.response : null;
  }

  /**
   * Reset a widget.
   * @param {string} [widgetId]
   */
  function reset(widgetId) {
    var w = resolveWidget(widgetId);
    if (w) {
      w.response = null;
      w.input.value = "";
      w.iframe.src = w.iframe.src; // reload iframe
    }
  }

  /**
   * Remove a widget from the DOM.
   * @param {string} [widgetId]
   */
  function remove(widgetId) {
    var id = resolveWidgetId(widgetId);
    var w = widgets[id];
    if (w) {
      w.iframe.remove();
      w.input.remove();
      delete widgets[id];
    }
  }

  function resolveWidgetId(widgetId) {
    if (widgetId) return widgetId;
    var keys = Object.keys(widgets);
    return keys.length > 0 ? keys[keys.length - 1] : null;
  }

  function resolveWidget(widgetId) {
    var id = resolveWidgetId(widgetId);
    return id ? widgets[id] : null;
  }

  // Listen for postMessage from widget iframe
  window.addEventListener("message", function (event) {
    var data = event.data;
    if (!data || data.source !== SOURCE) return;

    if (data.event === "success" && data.token) {
      // Find which widget this came from
      var keys = Object.keys(widgets);
      for (var i = 0; i < keys.length; i++) {
        var w = widgets[keys[i]];
        try {
          if (w.iframe.contentWindow === event.source) {
            w.response = data.token;
            w.input.value = data.token;
            if (w.callback) w.callback(data.token);
            break;
          }
        } catch (e) {
          // cross-origin contentWindow access may throw
        }
      }
    }
  });

  // Auto-render widgets with class="y-captcha"
  function implicitRender() {
    var elements = document.querySelectorAll(".y-captcha");
    for (var i = 0; i < elements.length; i++) {
      var el = elements[i];
      // Skip if already rendered
      if (el.querySelector("iframe")) continue;
      render(el);
    }
  }

  // Public API
  var api = {
    render: render,
    reset: reset,
    remove: remove,
    getResponse: getResponse,
    _implicitRender: implicitRender,
  };

  window.ycaptcha = api;

  // Auto-render on DOM ready
  if (document.readyState === "complete" || document.readyState === "interactive") {
    setTimeout(implicitRender, 0);
  } else {
    window.addEventListener("DOMContentLoaded", implicitRender);
  }

  // Handle onload callback (e.g. ?onload=myCallback)
  var script = document.currentScript;
  if (script && script.src) {
    var url = new URL(script.src);
    var onload = url.searchParams.get("onload");
    if (onload && typeof window[onload] === "function") {
      setTimeout(function () { window[onload](); }, 0);
    }
  }
})();
