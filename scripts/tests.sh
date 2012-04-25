if [ $TRAVISCI ]; then
  config="tests/dependencies-travis.json"
else
  config="tests/dependencies.json"
fi

NODE_PATH=lib node_modules/whiskey/bin/whiskey \
  --tests "tests/test-identity-provider-middleware.js tests/test-authentication-middleware.js tests/test-rate-limiting-middleware.js" \
  --dependencies ${config} --real-time --sequential
