<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Review Notes

- In this project's CAPTCHA flow, the `origin` value sent to `/api/v0/captcha/challenge` is intentionally passed in the request body from the iframe widget to indicate the embedding site's origin. This is advisory site-context / anti-abuse metadata, not a hard security proof.
- Do not flag this as a security bypass by itself during code review. The real security boundary is the backend verification flow, especially `/api/v0/captcha/siteverify` with the private `secretKey`.
- Reviews should only raise a security finding here if the backend verification boundary is bypassed, omitted, or incorrectly trusted on the client.
