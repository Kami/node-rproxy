NODE_PATH=lib node_modules/whiskey/bin/whiskey \
  --tests tests/test-proxy.js \
  --dependencies tests/dependencies.json --real-time --sequential
