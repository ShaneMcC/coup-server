#!/bin/sh

CONFIGSOURCE="/app/buildConfig.json"
CONFIGTEMP="${CONFIGSOURCE}.temp"

if [ ! -e "${CONFIGSOURCE}" ]; then
    echo "{}" > "${CONFIGSOURCE}"
fi;

cd /gitRepo
find -type f -name .git -exec bash -c 'f="{}"; cd $(dirname $f); echo "gitdir: ../../.git/modules/$(realpath --relative-to=/gitRepo .)" > .git' \;
if [ -e $(git rev-parse --git-dir)/shallow ]; then git init; git fetch --unshallow; fi
git fetch --tags
git submodule foreach 'if [ -e $(git rev-parse --git-dir)/shallow ]; then git init; git fetch --unshallow; fi'
git submodule foreach 'git fetch --tags'
GITVERSION=$(git describe --tags)
cd /
rm -Rf /gitRepo

echo "Setting Git Version: ${GITVERSION}"
cat "${CONFIGSOURCE}" | jq '.gitVersion |= "'"${GITVERSION}"'"' > "${CONFIGTEMP}"
mv "${CONFIGTEMP}" "${CONFIGSOURCE}"
