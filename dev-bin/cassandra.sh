#!/bin/bash

basedir=`dirname $0`

export CASSANDRA_CONF=$basedir/../tests/conf/

if [ ! $CASSANDRA_HOME ]; then
    CASSANDRA_HOME="/opt/cassandra"
fi


rm -rf /tmp/cass/*
exec $CASSANDRA_HOME/bin/cassandra -f