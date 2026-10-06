open router has some quirks that have been leading to degraded quality in some casess

### Agent-Friendly Summary: Optimizing Reliability

For AI agents operating at volume, the primary issue is **routing instability** rather than model quantization.

- **The Routing Lottery:** Default router settings often prioritize price (inverse square of cost) over performance, leading to unpredictable quality (2:36-3:04).
- **Hidden Ceiling Constraints:** Many endpoints enforce arbitrary limits on **context windows** and **max output tokens** that can cripple agent reasoning. Always audit these specs against your agent's requirements (6:36-7:48).
- **Tooling Vulnerabilities:** Before the _Auto Exacto_ update, default routing frequently sent tool-call requests to endpoints that lacked tool capability. Keep tool-dependent flows on default routing, but pin high-quality providers for standard inference (8:08-9:22).
- **Invoice Inaccuracy:** The router ignores **cached input pricing**, which is often the most significant cost driver for agents using repeating system prompts. Factor this into your cost analysis (9:44-10:28).

### Insights for Your Blog: The "Nerfed" Model Myth

If you're writing a piece on AI infrastructure, use these angles to debunk common misconceptions:

- **Quantization is often a Red Herring:** Many labs (like _Moonshot_ or _OpenAI_) ship models at 4-bit precision natively. An "FP4" tag from a provider often just means they are serving the weights as intended, not that they've degraded the model (4:14-5:16).
- **The Precision Gap:** Two endpoints can share the same precision label (e.g., _FP4_) but perform drastically differently due to provider-side configuration, hardware, or software stacks (5:44-6:11).
- **Provider Discrepancy:** The variance is real, but it's structural. From ignored parameters to aggressive output caps, the "nerfed model" experience is usually a symptom of poor infrastructure choices by the service provider, not a change in the model weights themselves (6:36-7:48).
- **Practical Fixes:** Provide your readers with the "four lines of JSON" solution: use a `provider` object to pin endpoints, set `require_parameters: true`, and explicitly define your `max_tokens` to take control of your pipeline (11:52-12:43).

actionable steps

To stabilize your AI application's quality and move away from the unpredictable "routing lottery" of generic endpoints, you should implement more granular control over your API requests. Based on the strategies discussed in the video (11:52-14:02), here is a checklist to improve your architecture:

**1. Pin Your Providers**

- **Stop relying on default routing:** Instead of letting the platform pick, use the `provider` object in your request body to explicitly define an `order` of trusted endpoints that you have verified for your specific use case.
- **Audit your logs:** Use the `request_id` from your rating feature to look up the exact provider that served a poor-quality response. Once you identify a stable, high-performing provider, pin it to your configuration (12:57-13:16).

**2. Enforce Configuration Constraints**

- **Set `require_parameters: true`:** This ensures the endpoint doesn't silently ignore your `seed`, `max_tokens`, or tool definitions. If an endpoint cannot handle your specific required settings, it will be excluded from the selection (12:06-12:16).
- **Explicitly set `max_tokens`:** To prevent truncated answers and the appearance of "nerfed" reasoning, set your output tokens to match the model's actual capability rather than leaving it to the endpoint's default cap (12:19-12:25).

**3. Improve Observability & Analytics**

- **Map ratings to metadata:** Since you are already capturing the `request_id`, ensure you are also logging the `provider_id` and the specific model configuration (e.g., quantization type or context window) used for that request.
- **Analyze cost-per-turn:** Factor in cached input usage. Because many agents send long system prompts repeatedly, analyze your invoices based on the _actual_ cost per million tokens including cache hits, rather than just the base price, to optimize your spend (10:28-10:33).

**4. Strategic Routing**

- **Segment your traffic:** Keep tool-calling requests on the default routing to benefit from features like _Auto Exacto_ (12:48-12:51), but pin specific providers for standard chat or summarization tasks where performance consistency is more important than price volatility (12:43-12:48).

references:

- original video: https://www.youtube.com/watch?v=ZsnFX5mEJ4s&list=TLPQMDYxMDIwMjaAIIq6AgLZ6g&index=3
