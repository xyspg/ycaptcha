(() => {
	var ORIGIN = (() => {
		var s = document.currentScript;
		if (s?.src) {
			var u = new URL(s.src);
			return u.origin;
		}
		return "https://ycaptcha.xyspg.moe";
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
	 * @param {Function} [params["expired-callback"]] - Called when token expires
	 * @param {Function} [params["error-callback"]] - Called on error
	 * @returns {string} Widget ID
	 */
	function render(container, params) {
		params = params || {};

		var el;
		if (typeof container === "string") {
			el = document.querySelector(container);
			if (!el)
				throw new Error(`[yCAPTCHA] Container not found: "${container}"`);
		} else {
			el = container;
		}

		var sitekey = params.sitekey || el.getAttribute("data-sitekey");
		if (!sitekey) throw new Error("[yCAPTCHA] Missing sitekey");

		var widgetId = WIDGET_PREFIX + widgetIdx++;

		// Callbacks
		var cbSuccess = params.callback || resolveDataCallback(el, "data-callback");
		var cbExpired =
			params["expired-callback"] ||
			resolveDataCallback(el, "data-expired-callback");
		var cbError =
			params["error-callback"] ||
			resolveDataCallback(el, "data-error-callback");

		// Create iframe
		var iframe = document.createElement("iframe");
		iframe.id = widgetId;
		iframe.src = `${ORIGIN}/widget/${sitekey}`;
		iframe.style.border = "none";
		iframe.style.overflow = "hidden";
		iframe.style.width = "304px";
		iframe.style.height = "78px";
		iframe.style.transition = "width 0.2s ease, height 0.2s ease";
		iframe.setAttribute("scrolling", "no");
		iframe.title = "yCAPTCHA challenge";

		// Hidden input for form submission
		var input = document.createElement("input");
		input.type = "hidden";
		input.name = params["response-field-name"] || "ycaptcha-response";
		input.id = `${widgetId}_response`;

		el.appendChild(iframe);
		el.appendChild(input);

		widgets[widgetId] = {
			element: el,
			iframe: iframe,
			input: input,
			sitekey: sitekey,
			cbSuccess: cbSuccess,
			cbExpired: cbExpired,
			cbError: cbError,
			response: null,
		};

		return widgetId;
	}

	function resolveDataCallback(el, attr) {
		var name = el.getAttribute(attr);
		return name && typeof window[name] === "function" ? window[name] : null;
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
			w.iframe.style.width = "304px";
			w.iframe.style.height = "78px";
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

	/**
	 * Check if the widget's token has expired.
	 * @param {string} [widgetId]
	 * @returns {boolean}
	 */
	function isExpired(widgetId) {
		var w = resolveWidget(widgetId);
		return w ? w.response === null : true;
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

	/** Find which widget a postMessage came from */
	function findWidgetBySource(source) {
		var keys = Object.keys(widgets);
		for (var i = 0; i < keys.length; i++) {
			var w = widgets[keys[i]];
			try {
				if (w.iframe.contentWindow === source) return w;
			} catch (_e) {
				// cross-origin access may throw
			}
		}
		return null;
	}

	// Listen for postMessage from widget iframes
	window.addEventListener("message", (event) => {
		// Origin validation: only accept messages from our server
		if (ORIGIN && event.origin !== ORIGIN) return;

		var data = event.data;
		if (!data || data.source !== SOURCE) return;

		var w = findWidgetBySource(event.source);
		if (!w) return;

		switch (data.event) {
			case "success":
				if (data.token) {
					w.response = data.token;
					w.input.value = data.token;
					if (w.cbSuccess) w.cbSuccess(data.token);
				}
				break;

			case "expired":
				w.response = null;
				w.input.value = "";
				if (w.cbExpired) w.cbExpired();
				break;

			case "error":
				w.response = null;
				w.input.value = "";
				if (w.cbError) w.cbError(data.message || "Unknown error");
				break;

			case "resize":
				if (data.width) w.iframe.style.width = `${data.width}px`;
				if (data.height) w.iframe.style.height = `${data.height}px`;
				break;
		}
	});

	// Auto-render widgets with class="y-captcha"
	function implicitRender() {
		var elements = document.querySelectorAll(".y-captcha");
		for (var i = 0; i < elements.length; i++) {
			var el = elements[i];
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
		isExpired: isExpired,
		_implicitRender: implicitRender,
	};

	window.ycaptcha = api;

	// Auto-render on DOM ready
	if (
		document.readyState === "complete" ||
		document.readyState === "interactive"
	) {
		setTimeout(implicitRender, 0);
	} else {
		window.addEventListener("DOMContentLoaded", implicitRender);
	}

	// Handle onload callback (e.g. ?onload=myCallback)
	var script = document.currentScript;
	if (script?.src) {
		var url = new URL(script.src);
		var onload = url.searchParams.get("onload");
		if (onload && typeof window[onload] === "function") {
			setTimeout(() => {
				window[onload]();
			}, 0);
		}
	}
})();
