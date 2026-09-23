# Echo weekend roadmap

## 1. Make one round trip work

Check compatible Effect, Foldkit, and Alchemy versions. Scaffold the dashboard and Worker. Define validated endpoint configuration and captured-request data. Create one endpoint, call it, and display the resulting request.

Done when a copied cURL command receives the configured response and its request appears in the inbox.

## 2. Make configuration useful

Add response status, text/JSON body, headers, and bounded delay. Validate configuration before saving it. Persist endpoints and captured requests. Add empty, loading, and error states to the dashboard.

Done when editing an endpoint changes the next response without changing its URL.

## 3. Make it usable from a frontend

Connect a small example frontend. Handle preflight requests deliberately. Add clear request details and copy actions. Apply request-size and retention limits, plus protected management access for hosting.

Done when the example can demonstrate successful, delayed, and failed responses and the inbox explains each request.

## 4. Finish the portfolio demo

Test configuration validation, response behavior, capture persistence, and management access. Verify the full browser flow. Deploy with Alchemy when cloud setup is ready. Document setup and record a short demo.

Done when another developer can understand the project, reproduce the demo, and see the deployment defined in source.

## Scope rule

Finish the first round trip before adding features. Response sequences are the first extension. Replay, local forwarding, accounts, billing, and a visual workflow editor are outside the weekend scope.
