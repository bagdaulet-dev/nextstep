/* SwaggerUIBundle is supplied by the pinned, locally served sidecar package. */
SwaggerUIBundle({
  url: "/api/schema/",
  dom_id: "#swagger-ui",
  presets: [SwaggerUIBundle.presets.apis],
  layout: "BaseLayout",
  persistAuthorization: false,
  requestInterceptor: async (request) => {
    if (new URL(request.url, location.origin).origin !== location.origin) {
      throw new Error("Only same-origin API requests are allowed.");
    }
    request.credentials = "same-origin";
    if (!["GET", "HEAD", undefined].includes(request.method)) {
      const response = await fetch("/api/auth/session/", { credentials: "same-origin" });
      if (!response.ok) throw new Error("Cannot prepare the session. Reload this page.");
      const session = await response.json();
      request.headers["X-CSRFToken"] = session.csrf_token;
    }
    return request;
  },
});
