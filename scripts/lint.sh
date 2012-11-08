#!/bin/bash

# Lint JavaScript files
./node_modules/.bin/jshint $(find ./lib ./tests ./misc -type f -name "*.js") --config jshint.json

# Check example config syntax
cat example/config.json | python -mjson.tool
