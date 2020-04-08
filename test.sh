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
    echo 'Access tokens not found, skipping GitHub tests'
fi

echo '# Starting log_test'
node log_test

echo '# Starting parser_test'
node parser_test

echo '# Starting request_test'
node request_test