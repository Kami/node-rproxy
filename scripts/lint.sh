#!/bin/bash

./node_modules/.bin/jshint $(find ./lib ./tests ./misc -type f -name "*.js") --config jshint.json
