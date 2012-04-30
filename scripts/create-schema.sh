#!/bin/bash

sleep 2
cqlsh localhost 19170 < ./scripts/setup.cql
sleep 2
echo "Done"
