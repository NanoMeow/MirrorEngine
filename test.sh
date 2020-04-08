#!/bin/bash

set -e
set -u

cd test

echo '# Starting config_test'
node config_test

echo '# Starting github_test'
if [ -f ~/mirror-engine-config.json ]; then
    node github_test
else
    echo 'Configuration file not found, skipping GitHub tests'
    echo 'Create ~/mirror-engine-config.json with valid credentials to run GitHub tests'
fi

echo '# Starting log_test'
node log_test

echo '# Starting parser_test'
node parser_test

echo '# Starting request_test'
node request_test
