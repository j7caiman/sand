#!/bin/bash

outputPath="client/public/javascripts/min.js"
baseDir="client/javascripts"
inputPaths="$baseDir/src/startup.js $baseDir/src/**.js $baseDir/shared/RegionNode.js $baseDir/shared/global_constants.js $baseDir/shared/global_functions.js"

echo gathering source files:
echo $inputPaths

echo minifying source files...
java -jar compiler.jar --language_in=ECMASCRIPT6 --language_out=ES5 --js_output_file=$outputPath $inputPaths
echo source files minified

echo killing server...
pidof nodejs | awk '{print "kill " $1}' | sh
echo server killed

echo starting server...
cd /root/sand/bin
export NODE_ENV=production
nohup nodejs www &
cd -
echo server started
