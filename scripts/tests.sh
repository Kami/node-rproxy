NODE_PATH=lib node_modules/whiskey/bin/whiskey \
  --tests "tests/test-identity-provider-middleware.js tests/test-authentication-middleware.js tests/test-rate-limiting-middleware.js" \
  --dependencies tests/dependencies.json --real-time --sequential
