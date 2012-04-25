if [ $TRAVISCI ]; then
  config="tests/dependencies-travis.json"
else
  config="tests/dependencies.json"
fi

NODE_PATH=lib node_modules/whiskey/bin/whiskey \
  --tests "$(find tests/ -type f -name "test-*.js" -print0 | tr "\0" " " | sed '$s/.$//')" \
  --dependencies ${config} --real-time --sequential
