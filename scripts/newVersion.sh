#!/bin/bash

VERSION="$1"

if [[ ! "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-.*)?$ ]] ; then
    >&2 echo "Error: Not a semver: $VERSION"
    exit 1
fi

echo "Releasing as: $VERSION"

git commit --allow-empty -m "Release: $VERSION"
git tag -a "$VERSION" -m "Release $VERSION"
git push && git push --tags
