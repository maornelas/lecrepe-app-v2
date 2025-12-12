#!/bin/bash
cd "$(dirname "$0")"
cd android
./gradlew clean assembleRelease
