export default {
  async fetch(request, env) {
    // Serve the static assets configured in wrangler.jsonc
    return env.ASSETS.fetch(request);
  }
};
